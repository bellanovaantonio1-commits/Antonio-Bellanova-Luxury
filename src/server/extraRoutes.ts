import { Express } from "express";
import { eq, and, sql, desc, gt, inArray, gte, count, sum, ne } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.ts";
import { db } from "../db/index.ts";
import {
  users, products, brands, categories, orders, orderItems,
  shopSettings, inquiries, wishlistItems, newsletterSubscribers
} from "../db/schema.ts";
import { generateOrderNumber, DEFAULT_SHOP_SETTINGS } from "./helpers.ts";
import { extractProductFromText } from "../lib/gemini.ts";
import { sendOrderEmails, sendInquiryEmails } from "./email.ts";

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
      const { items, totalAmount, shippingAddress } = req.body;
      if (!items?.length) return res.status(400).json({ error: "Warenkorb ist leer." });

      const orderNumber = generateOrderNumber();

      const [order] = await db.insert(orders).values({
        userId: req.user!.uid,
        orderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "BANK_TRANSFER",
        total: totalAmount.toString(),
        shippingAddress: shippingAddress || null,
      }).returning();

      const orderItemsForEmail: { name: string; quantity: number; price: number }[] = [];

      for (const item of items) {
        const productId = parseInt(item.id);
        const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);

        await db.insert(orderItems).values({
          orderId: order.id,
          productId,
          productName: item.name,
          productImage: item.image,
          quantity: item.quantity,
          price: item.price.toString(),
        });

        orderItemsForEmail.push({ name: item.name, quantity: item.quantity, price: item.price });

        if (product && product.stock !== null && product.stock > 0) {
          await db.update(products)
            .set({ stock: Math.max(0, product.stock - item.quantity), updatedAt: new Date() })
            .where(eq(products.id, productId));
        }
      }

      const settings = await getSettingsMap();
      const customerEmail = req.user!.email;
      if (customerEmail) {
        sendOrderEmails({
          customerEmail,
          orderNumber,
          total: totalAmount.toString(),
          items: orderItemsForEmail,
          settings,
        }).catch((e) => console.error("Order email failed", e));
      }

      res.status(201).json({ ...order, paymentInfo: settings });
    } catch (error) {
      console.error("Failed to create order", error);
      res.status(500).json({ error: "Bestellung fehlgeschlagen." });
    }
  });

  app.get("/api/orders/my", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userOrders = await db.select().from(orders)
        .where(eq(orders.userId, req.user!.uid))
        .orderBy(desc(orders.createdAt));

      const enriched = await Promise.all(userOrders.map(async (order) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return {
          ...order,
          orderNumber: order.orderNumber || `ORD-${order.id}`,
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
        return {
          ...order,
          orderNumber: order.orderNumber || `ORD-${order.id}`,
          customerEmail: user?.email,
          itemCount: items.length,
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

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Update fehlgeschlagen." });
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
