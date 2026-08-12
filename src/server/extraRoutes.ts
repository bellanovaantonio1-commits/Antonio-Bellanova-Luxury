import { Express } from "express";
import { eq, and, sql, desc, gt, inArray, gte, count, sum, ne } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.ts";
import { db } from "../db/index.ts";
import {
  users, products, brands, categories, orders, orderItems,
  shopSettings, inquiries, wishlistItems, newsletterSubscribers, invoices
} from "../db/schema.ts";
import { generateOrderNumber, DEFAULT_SHOP_SETTINGS } from "./helpers.ts";
import { extractProductFromText } from "../lib/gemini.ts";
import { sendOrderEmails, sendInquiryEmails, sendInvoiceIssuedEmail } from "./email.ts";
import {
  createInvoiceForOrder,
  cancelInvoiceForOrder,
  buildOrderLinesFromRequest,
  getInvoicePdfBufferByOrderId,
  getInvoicePdfBufferById,
  listInvoicesForAdmin,
  getInvoiceByOrderId,
} from "./invoice/service.ts";
import { getMissingInvoiceSettings } from "./invoice/seller.ts";

async function getSettingsMap(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(shopSettings);
  const map: Record<string, unknown> = { ...DEFAULT_SHOP_SETTINGS };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

async function ensureDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SHOP_SETTINGS)) {
    const existing = await db.select().from(shopSettings).where(eq(shopSettings.key, key)).limit(1);
    if (existing.length === 0) {
      await db.insert(shopSettings).values({ key, value });
    }
  }
}

export function registerExtraRoutes(app: Express) {
  // Health check
  app.get("/api/health", async (_req, res) => {
    try {
      await db.select({ n: sql`1` }).from(users).limit(1);
      res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: "degraded", db: "disconnected", timestamp: new Date().toISOString() });
    }
  });

  // Newsletter
  app.post("/api/newsletter", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Gültige E-Mail erforderlich." });
      }
      const existing = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.toLowerCase())).limit(1);
      if (existing.length > 0) {
        return res.json({ message: "Bereits angemeldet." });
      }
      await db.insert(newsletterSubscribers).values({ email: email.toLowerCase() });
      res.status(201).json({ message: "Erfolgreich angemeldet." });
    } catch (error) {
      console.error("Newsletter signup failed", error);
      res.status(500).json({ error: "Anmeldung fehlgeschlagen." });
    }
  });

  // Admin badges (nav notification counts)
  app.get("/api/admin/badges", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const [newInquiries] = await db.select({ count: count() }).from(inquiries).where(eq(inquiries.status, "NEW"));
      const [pendingOrders] = await db.select({ count: count() }).from(orders).where(eq(orders.status, "PENDING"));
      const [lowStock] = await db.select({ count: count() }).from(products)
        .where(and(inArray(products.status, ["ACTIVE", "RESERVED"]), sql`${products.stock} <= 1`));
      res.json({
        inquiries: newInquiries?.count || 0,
        orders: pendingOrders?.count || 0,
        lowStock: lowStock?.count || 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Badges konnten nicht geladen werden." });
    }
  });

  // CSV export orders
  app.get("/api/admin/orders/export", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const rows = await db.select({ order: orders, user: users })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.uid))
        .orderBy(desc(orders.createdAt));

      const header = "Bestellnummer;Datum;Kunde;Status;Zahlung;Gesamt\n";
      const csv = rows.map(r =>
        [
          r.order.orderNumber || r.order.id,
          r.order.createdAt ? new Date(r.order.createdAt).toLocaleDateString("de-DE") : "",
          r.user?.email || r.order.userId,
          r.order.status,
          r.order.paymentStatus,
          r.order.total,
        ].join(";")
      ).join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=bestellungen.csv");
      res.send("\uFEFF" + header + csv);
    } catch (error) {
      res.status(500).json({ error: "Export fehlgeschlagen." });
    }
  });

  // Fix AI extract admin check
  app.post("/api/admin/ai/extract", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const details = await extractProductFromText(req.body.text);
      res.json(details);
    } catch (error: any) {
      console.error("AI extraction error", error);
      const status = error?.status || error?.code || 500;
      const message = status === 429
        ? "KI-Kontingent überschritten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Administrator."
        : "Extraktion fehlgeschlagen";
      res.status(status === 429 ? 429 : 500).json({ error: message });
    }
  });

  // Public forms
  app.post("/api/contact", async (req, res) => {
    try {
      const { firstName, lastName, email, subject, message } = req.body;
      if (!email || !message) return res.status(400).json({ error: "E-Mail und Nachricht sind erforderlich." });

      const [inquiry] = await db.insert(inquiries).values({
        type: "CONTACT",
        firstName,
        lastName,
        email,
        subject,
        message,
      }).returning();

      const settings = await getSettingsMap();
      sendInquiryEmails({
        type: "CONTACT",
        typeLabel: "Kontaktanfrage",
        firstName,
        lastName,
        email,
        subject,
        message,
        settings,
      }).catch((e) => console.error("Contact email failed", e));

      res.status(201).json({ id: inquiry.id, message: "Anfrage erfolgreich übermittelt." });
    } catch (error) {
      console.error("Contact form failed", error);
      res.status(500).json({ error: "Anfrage konnte nicht gespeichert werden." });
    }
  });

  app.post("/api/sell", async (req, res) => {
    try {
      const { productType, brand, model, condition, priceExpectation, description, firstName, lastName, email, phone } = req.body;
      if (!email || !brand || !model) return res.status(400).json({ error: "Pflichtfelder fehlen." });

      const [inquiry] = await db.insert(inquiries).values({
        type: "SELL",
        firstName,
        lastName,
        email,
        phone,
        message: description,
        metadata: { productType, brand, model, condition, priceExpectation },
      }).returning();

      const settings = await getSettingsMap();
      sendInquiryEmails({
        type: "SELL",
        typeLabel: "Ankaufanfrage",
        firstName,
        lastName,
        email,
        phone,
        message: description,
        metadata: { productType, brand, model, condition, priceExpectation },
        settings,
      }).catch((e) => console.error("Sell email failed", e));

      res.status(201).json({ id: inquiry.id, message: "Ankaufanfrage erfolgreich übermittelt." });
    } catch (error) {
      console.error("Sell form failed", error);
      res.status(500).json({ error: "Anfrage konnte nicht gespeichert werden." });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, preferredDate, preferredTime, message } = req.body;
      if (!email || !firstName || !lastName || !preferredDate || !preferredTime) {
        return res.status(400).json({ error: "Pflichtfelder fehlen." });
      }

      const [inquiry] = await db.insert(inquiries).values({
        type: "APPOINTMENT",
        firstName,
        lastName,
        email,
        phone,
        subject: `Termin ${preferredDate} ${preferredTime}`,
        message,
        metadata: { preferredDate, preferredTime },
      }).returning();

      const settings = await getSettingsMap();
      sendInquiryEmails({
        type: "APPOINTMENT",
        typeLabel: "Terminanfrage",
        firstName,
        lastName,
        email,
        phone,
        subject: `Termin ${preferredDate} ${preferredTime}`,
        message,
        metadata: { preferredDate, preferredTime },
        settings,
      }).catch((e) => console.error("Appointment email failed", e));

      res.status(201).json({ id: inquiry.id, message: "Terminanfrage erfolgreich übermittelt." });
    } catch (error) {
      console.error("Appointment form failed", error);
      res.status(500).json({ error: "Termin konnte nicht gespeichert werden." });
    }
  });

  // Wishlist
  app.get("/api/wishlist", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select({
        wishlist: wishlistItems,
        product: products,
        brand: brands,
      })
        .from(wishlistItems)
        .innerJoin(products, eq(wishlistItems.productId, products.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(wishlistItems.userId, req.user!.uid));

      res.json(result.map(r => ({
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        price: parseFloat(r.product.price),
        image: r.product.mainImage || (Array.isArray(r.product.images) ? r.product.images[0] : null),
        brand: r.brand?.name,
      })));
    } catch (error) {
      res.status(500).json({ error: "Wishlist konnte nicht geladen werden." });
    }
  });

  app.post("/api/wishlist", requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.body.productId);
      if (isNaN(productId)) return res.status(400).json({ error: "Ungültige Produkt-ID" });

      const existing = await db.select().from(wishlistItems)
        .where(and(eq(wishlistItems.userId, req.user!.uid), eq(wishlistItems.productId, productId)))
        .limit(1);

      if (existing.length > 0) {
        await db.delete(wishlistItems).where(eq(wishlistItems.id, existing[0].id));
        return res.json({ action: "removed" });
      }

      await db.insert(wishlistItems).values({ userId: req.user!.uid, productId });
      res.json({ action: "added" });
    } catch (error) {
      res.status(500).json({ error: "Wishlist-Aktion fehlgeschlagen." });
    }
  });

  app.delete("/api/wishlist/:productId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.productId);
      await db.delete(wishlistItems)
        .where(and(eq(wishlistItems.userId, req.user!.uid), eq(wishlistItems.productId, productId)));
      res.json({ message: "Entfernt" });
    } catch (error) {
      res.status(500).json({ error: "Entfernen fehlgeschlagen." });
    }
  });

  // Enhanced orders
  app.post("/api/orders", requireAuth, async (req: AuthRequest, res) => {
    try {
      const {
        items,
        billingAddress,
        shippingAddress,
        customerName,
        companyName,
        customerVatId,
        language,
        discountAmount,
      } = req.body;
      if (!items?.length) return res.status(400).json({ error: "Warenkorb ist leer." });

      const computed = await buildOrderLinesFromRequest(
        items.map((i: { id: string; quantity: number }) => ({ id: i.id, quantity: i.quantity }))
      );

      const shippingCost = 0;
      const discount = parseFloat(discountAmount) || 0;
      const totalGross = Math.max(0, computed.totalGross + shippingCost - discount);

      const orderNumber = generateOrderNumber();
      const billing = billingAddress || null;
      const shipping = shippingAddress || billing;

      const [order] = await db.insert(orders).values({
        userId: req.user!.uid,
        orderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "BANK_TRANSFER",
        total: totalGross.toString(),
        subtotalNet: computed.subtotalNet.toString(),
        taxAmount: computed.taxAmount.toString(),
        taxRatePercent: computed.taxRatePercent.toString(),
        shippingCost: shippingCost.toString(),
        discountAmount: discount.toString(),
        shippingAddress: shipping,
        billingAddress: billing,
        language: language === "en" ? "en" : "de",
        customerName: customerName || null,
        companyName: companyName || null,
        customerVatId: customerVatId || null,
      }).returning();

      const orderItemsForEmail: { name: string; quantity: number; price: number }[] = [];

      for (const line of computed.lines) {
        await db.insert(orderItems).values({
          orderId: order.id,
          productId: line.productId,
          productName: line.name,
          productImage: line.image,
          productSku: line.sku,
          quantity: line.quantity,
          price: line.unitPriceGross.toString(),
          unitPriceGross: line.unitPriceGross.toString(),
          unitPriceNet: line.unitPriceNet.toString(),
          lineTaxAmount: line.lineTaxAmount.toString(),
          taxRatePercent: line.taxRatePercent.toString(),
          taxTreatment: line.taxTreatment,
        });

        orderItemsForEmail.push({ name: line.name, quantity: line.quantity, price: line.unitPriceGross });

        const [product] = await db.select().from(products).where(eq(products.id, line.productId)).limit(1);
        if (product && product.stock !== null && product.stock > 0) {
          await db.update(products)
            .set({ stock: Math.max(0, product.stock - line.quantity), updatedAt: new Date() })
            .where(eq(products.id, line.productId));
        }
      }

      const settings = await getSettingsMap();

      const customerEmail = req.user!.email;
      if (customerEmail) {
        sendOrderEmails({
          customerEmail,
          orderNumber,
          total: totalGross.toString(),
          items: orderItemsForEmail,
          settings,
          language: language === "en" ? "en" : "de",
        }).catch((e) => console.error("Order email failed", e));
      }

      res.status(201).json({
        ...order,
        invoiceNumber: null,
        paymentInfo: settings,
        invoiceSettingsWarning: getMissingInvoiceSettings(settings),
      });
    } catch (error: unknown) {
      console.error("Failed to create order", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Bestellung fehlgeschlagen." });
    }
  });

  app.get("/api/orders/my", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userOrders = await db.select().from(orders)
        .where(eq(orders.userId, req.user!.uid))
        .orderBy(desc(orders.createdAt));

      const enriched = await Promise.all(userOrders.map(async (order) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const [inv] = await db.select({
          invoiceNumber: invoices.invoiceNumber,
          invoiceId: invoices.id,
          invoiceStatus: invoices.invoiceStatus,
        })
          .from(invoices)
          .where(and(eq(invoices.orderId, order.id), eq(invoices.invoiceType, "INVOICE")))
          .limit(1);
        return {
          ...order,
          orderNumber: order.orderNumber || `ORD-${order.id}`,
          invoiceNumber: inv?.invoiceNumber || null,
          invoiceId: inv?.invoiceId ?? null,
          invoiceStatus: inv?.invoiceStatus || null,
          items: items.map(i => ({
            id: i.productId?.toString() || i.id.toString(),
            name: i.productName || "Produkt",
            price: parseFloat(i.price),
            quantity: i.quantity,
            image: i.productImage || "",
          })),
        };
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Bestellungen konnten nicht geladen werden." });
    }
  });

  app.get("/api/orders/:orderId/invoice/pdf", requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      if (isNaN(orderId)) return res.status(400).json({ error: "Ungültige Bestellung." });

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) return res.status(404).json({ error: "Bestellung nicht gefunden." });
      if (order.userId !== req.user!.uid) return res.status(403).json({ error: "Zugriff verweigert." });

      const invoice = await getInvoiceByOrderId(orderId);
      if (!invoice) {
        return res.status(404).json({ error: "Für diese Bestellung wurde noch keine Rechnung ausgestellt." });
      }

      const pdf = await getInvoicePdfBufferByOrderId(orderId);
      if (!pdf) return res.status(404).json({ error: "Rechnung konnte nicht erzeugt werden." });

      const disposition = req.query.disposition === "attachment" ? "attachment" : "inline";
      const filename = `${invoice.invoiceNumber}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdf.length);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.send(pdf);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "PDF fehlgeschlagen." });
    }
  });

  // Admin CRM
  app.get("/api/admin/crm/customers", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const customerUsers = await db.select().from(users)
        .where(eq(users.role, "CUSTOMER"))
        .orderBy(desc(users.createdAt));

      const inquiryCounts = await db.select({
        email: inquiries.email,
        count: count(),
      }).from(inquiries).groupBy(inquiries.email);

      const countMap = Object.fromEntries(inquiryCounts.map(r => [r.email, r.count]));

      res.json(customerUsers.map(u => ({
        ...u,
        inquiryCount: countMap[u.email] || 0,
      })));
    } catch (error) {
      res.status(500).json({ error: "Kunden konnten nicht geladen werden." });
    }
  });

  // Admin orders
  app.get("/api/admin/orders", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const allOrders = await db.select({
        order: orders,
        user: users,
      })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.uid))
        .orderBy(desc(orders.createdAt));

      const enriched = await Promise.all(allOrders.map(async ({ order, user }) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const [inv] = await db.select({
          invoiceNumber: invoices.invoiceNumber,
          invoiceStatus: invoices.invoiceStatus,
        })
          .from(invoices)
          .where(and(eq(invoices.orderId, order.id), eq(invoices.invoiceType, "INVOICE")))
          .limit(1);
        return {
          ...order,
          orderNumber: order.orderNumber || `ORD-${order.id}`,
          customerEmail: user?.email,
          itemCount: items.length,
          invoiceNumber: inv?.invoiceNumber || null,
          invoiceStatus: inv?.invoiceStatus || null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Bestellungen konnten nicht geladen werden." });
    }
  });

  app.patch("/api/admin/orders/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, paymentStatus } = req.body;

      const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "Bestellung nicht gefunden." });

      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
        for (const item of items) {
          if (!item.productId) continue;
          const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (product) {
            await db.update(products)
              .set({
                stock: (product.stock ?? 0) + item.quantity,
                updatedAt: new Date(),
              })
              .where(eq(products.id, item.productId));
          }
        }
      }

      const resolvedPaymentStatus =
        paymentStatus ||
        (status === "CANCELLED"
          ? existing.paymentStatus === "PAID"
            ? "REFUNDED"
            : "CANCELLED"
          : undefined);

      const [updated] = await db.update(orders)
        .set({
          ...(status && { status }),
          ...(resolvedPaymentStatus && { paymentStatus: resolvedPaymentStatus }),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        await cancelInvoiceForOrder(id, "Bestellung storniert");
      }

      const settings = await getSettingsMap();
      const becamePaid =
        resolvedPaymentStatus === "PAID" &&
        existing.paymentStatus !== "PAID" &&
        updated.status !== "CANCELLED";

      if (becamePaid) {
        try {
          const invoice = await createInvoiceForOrder(id, settings);
          const pdfBuffer = (await getInvoicePdfBufferByOrderId(id)) || undefined;
          const [user] = await db.select().from(users).where(eq(users.uid, updated.userId)).limit(1);
          if (user?.email) {
            sendInvoiceIssuedEmail({
              customerEmail: user.email,
              orderNumber: updated.orderNumber || `ORD-${id}`,
              invoiceNumber: invoice.invoiceNumber,
              total: updated.total,
              settings,
              language: updated.language === "en" ? "en" : "de",
              pdfBuffer,
            }).catch((e) => console.error("Invoice email failed", e));
          }
        } catch (invErr) {
          console.error("Auto invoice on PAID failed:", invErr);
        }
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Update fehlgeschlagen." });
    }
  });

  // Admin invoices
  app.get("/api/admin/invoices", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      res.json(await listInvoicesForAdmin());
    } catch (error) {
      res.status(500).json({ error: "Rechnungen konnten nicht geladen werden." });
    }
  });

  app.get("/api/admin/invoices/settings-status", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      await ensureDefaultSettings();
      res.json(getMissingInvoiceSettings(await getSettingsMap()));
    } catch (error) {
      res.status(500).json({ error: "Status konnte nicht geladen werden." });
    }
  });

  app.get("/api/admin/invoices/:id/pdf", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const pdf = await getInvoicePdfBufferById(id);
      if (!pdf) return res.status(404).json({ error: "Rechnung nicht gefunden." });
      const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
      const invoiceNumber = row?.invoiceNumber || "invoice";
      const disposition = req.query.disposition === "attachment" ? "attachment" : "inline";
      const filename = `${invoiceNumber}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdf.length);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.send(pdf);
    } catch (error) {
      res.status(500).json({ error: "PDF fehlgeschlagen." });
    }
  });

  app.post("/api/admin/orders/:orderId/invoice", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      if (isNaN(orderId)) return res.status(400).json({ error: "Ungültige Bestellung." });

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) return res.status(404).json({ error: "Bestellung nicht gefunden." });
      if (order.status === "CANCELLED") {
        return res.status(400).json({ error: "Stornierte Bestellungen können keine Rechnung erhalten." });
      }

      await ensureDefaultSettings();
      const settings = await getSettingsMap();
      const invoice = await createInvoiceForOrder(orderId, settings);

      const pdfBuffer = (await getInvoicePdfBufferByOrderId(orderId)) || undefined;
      const [user] = await db.select().from(users).where(eq(users.uid, order.userId)).limit(1);
      if (user?.email) {
        sendInvoiceIssuedEmail({
          customerEmail: user.email,
          orderNumber: order.orderNumber || `ORD-${orderId}`,
          invoiceNumber: invoice.invoiceNumber,
          total: order.total,
          settings,
          language: order.language === "en" ? "en" : "de",
          pdfBuffer,
        }).catch((e) => console.error("Invoice email failed", e));
      }

      res.status(201).json(invoice);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Rechnung konnte nicht erstellt werden." });
    }
  });

  // Admin inventory
  app.get("/api/admin/inventory", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const allProducts = await db.select({
        product: products,
        brand: brands,
      })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .orderBy(desc(products.updatedAt));

      const totalStock = allProducts.reduce((s, p) => s + (p.product.stock || 0), 0);
      const available = allProducts
        .filter(p => p.product.status === "ACTIVE")
        .reduce((s, p) => s + (p.product.stock || 0), 0);
      const reserved = allProducts
        .filter(p => p.product.status === "RESERVED")
        .reduce((s, p) => s + (p.product.stock || 0), 0);

      res.json({
        stats: { totalStock, available, reserved },
        items: allProducts.map(p => ({
          id: p.product.id,
          name: p.product.name,
          sku: p.product.sku,
          brand: p.brand?.name,
          status: p.product.status,
          stock: p.product.stock,
          price: p.product.price,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Bestand konnte nicht geladen werden." });
    }
  });

  // Public shop settings (contact + payment info for footer/checkout)
  app.get("/api/settings", async (_req, res) => {
    try {
      await ensureDefaultSettings();
      res.json(await getSettingsMap());
    } catch {
      res.json(DEFAULT_SHOP_SETTINGS);
    }
  });

  // Admin settings
  app.get("/api/admin/settings", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      await ensureDefaultSettings();
      const settings = await getSettingsMap();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Einstellungen konnten nicht geladen werden." });
    }
  });

  app.put("/api/admin/settings", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      for (const [key, value] of Object.entries(data)) {
        const existing = await db.select().from(shopSettings).where(eq(shopSettings.key, key)).limit(1);
        if (existing.length > 0) {
          await db.update(shopSettings).set({ value, updatedAt: new Date() }).where(eq(shopSettings.key, key));
        } else {
          await db.insert(shopSettings).values({ key, value });
        }
      }
      res.json(await getSettingsMap());
    } catch (error) {
      res.status(500).json({ error: "Speichern fehlgeschlagen." });
    }
  });

  // Admin stats for dashboard
  app.get("/api/admin/stats", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const activeOrder = ne(orders.status, "CANCELLED");

      const [revenueResult] = await db.select({
        total: sum(orders.total),
      }).from(orders).where(and(gte(orders.createdAt, monthStart), activeOrder));

      const [orderCountResult] = await db.select({ count: count() }).from(orders).where(and(gte(orders.createdAt, monthStart), activeOrder));
      const [customerCountResult] = await db.select({ count: count() }).from(users).where(eq(users.role, "CUSTOMER"));
      const [stockResult] = await db.select({ total: sum(products.stock) }).from(products);

      const recentOrders = await db.select({
        order: orders,
        user: users,
      })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.uid))
        .where(activeOrder)
        .orderBy(desc(orders.createdAt))
        .limit(5);

      const lowStock = await db.select({
        product: products,
        brand: brands,
      })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(inArray(products.status, ["ACTIVE", "RESERVED"]), sql`${products.stock} <= 1`))
        .limit(5);

      const monthlyOrders = await db.select({
        month: sql<string>`TO_CHAR(${orders.createdAt}, 'Mon')`,
        revenue: sum(orders.total),
        sales: count(),
      })
        .from(orders)
        .where(and(gte(orders.createdAt, new Date(now.getFullYear(), now.getMonth() - 6, 1)), activeOrder))
        .groupBy(sql`TO_CHAR(${orders.createdAt}, 'Mon')`, sql`DATE_TRUNC('month', ${orders.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${orders.createdAt})`);

      res.json({
        stats: {
          revenue: parseFloat(revenueResult?.total || "0"),
          orders: orderCountResult?.count || 0,
          customers: customerCountResult?.count || 0,
          stock: parseInt(stockResult?.total || "0"),
        },
        recentOrders: recentOrders.map(r => ({
          id: r.order.id,
          orderNumber: r.order.orderNumber || `ORD-${r.order.id}`,
          total: r.order.total,
          customerEmail: r.user?.email,
          createdAt: r.order.createdAt,
        })),
        lowStock: lowStock.map(r => ({
          id: r.product.id,
          name: r.product.name,
          brand: r.brand?.name,
          stock: r.product.stock,
          status: r.product.status,
        })),
        chartData: monthlyOrders.map(r => ({
          name: r.month,
          revenue: parseFloat(r.revenue || "0"),
          sales: r.sales,
        })),
      });
    } catch (error) {
      console.error("Stats failed", error);
      res.status(500).json({ error: "Statistiken konnten nicht geladen werden." });
    }
  });

  // Admin brands
  app.get("/api/admin/brands", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const result = await db.select().from(brands).orderBy(brands.name);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Marken konnten nicht geladen werden." });
    }
  });

  app.post("/api/admin/brands", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Name erforderlich" });
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const [brand] = await db.insert(brands).values({ name, slug }).returning();
      res.status(201).json(brand);
    } catch (error) {
      res.status(500).json({ error: "Marke konnte nicht erstellt werden." });
    }
  });

  // Admin inquiries
  app.get("/api/admin/inquiries", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const result = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Anfragen konnten nicht geladen werden." });
    }
  });

  app.patch("/api/admin/inquiries/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const [updated] = await db.update(inquiries)
        .set({ status: req.body.status })
        .where(eq(inquiries.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Update fehlgeschlagen." });
    }
  });
}
