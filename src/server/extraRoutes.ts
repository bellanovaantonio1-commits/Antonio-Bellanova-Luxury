import { Express } from "express";
import { eq, and, sql, desc, gt, inArray, gte, count, sum, ne } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.ts";
import { db } from "../db/index.ts";
import {
  users, products, brands, categories, orders, orderItems,
  shopSettings, inquiries, wishlistItems, wishlistAlerts, userAddresses,
  newsletterSubscribers, invoices
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
import { calculateShippingCost, ShippingMethod } from "./shipping.ts";
import { createStripeCheckoutSession, createStripeRefund } from "./stripe.ts";
import { restoreOrderStock } from "./stripeOrder.ts";
import { getSettingsMap, ensureDefaultSettings } from "./settings.ts";
import {
  buildCheckoutPaymentPayload,
  getPricingAuditLog,
  getPricingPaymentsPayload,
  savePricingPaymentsSettings,
} from "./pricingSettings.ts";
import {
  roundMoney,
  parseShopPricingConfig,
  resolveProductPricing,
  resolveStoredProductPricing,
  toProductPriceDbFields,
  isStripePaymentAvailable,
  resolveCheckoutPaymentMethod,
} from "../lib/shopPricing.ts";
import { registerCertificateRoutes, cancelCertificatesForOrder, linkCertificatesForOrderItems } from "./certificate/routes.ts";
import { registerLegalRoutes, buildLegalAcceptanceSnapshot } from "./legal/routes.ts";

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
        return res.json({ message: "Bereits angemeldet.", subscribed: true });
      }
      await db.insert(newsletterSubscribers).values({ email: email.toLowerCase(), status: "PENDING" });
      res.status(201).json({
        message: "Bitte bestätigen Sie Ihre Anmeldung per E-Mail (Double-Opt-in).",
        subscribed: true,
        pending: true,
      });
    } catch (error) {
      console.error("Newsletter signup failed", error);
      res.status(500).json({ error: "Anmeldung fehlgeschlagen." });
    }
  });

  app.get("/api/account/newsletter", requireAuth, async (req: AuthRequest, res) => {
    try {
      const email = req.user!.email?.toLowerCase();
      if (!email) return res.json({ subscribed: false });
      const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
      res.json({ subscribed: Boolean(row && row.status !== "UNSUBSCRIBED"), status: row?.status || null });
    } catch {
      res.status(500).json({ error: "Newsletter-Status konnte nicht geladen werden." });
    }
  });

  app.post("/api/account/newsletter", requireAuth, async (req: AuthRequest, res) => {
    try {
      const email = req.user!.email?.toLowerCase();
      if (!email) return res.status(400).json({ error: "Keine E-Mail hinterlegt." });
      const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
      if (existing) {
        if (existing.status === "UNSUBSCRIBED") {
          await db.update(newsletterSubscribers).set({ status: "PENDING" }).where(eq(newsletterSubscribers.email, email));
        }
        return res.json({ message: "Newsletter-Anmeldung gespeichert.", subscribed: true });
      }
      await db.insert(newsletterSubscribers).values({ email, status: "PENDING" });
      res.status(201).json({
        message: "Newsletter-Anmeldung gespeichert. Double-Opt-in wird per E-Mail bestätigt.",
        subscribed: true,
      });
    } catch (error) {
      console.error("Account newsletter failed", error);
      res.status(500).json({ error: "Anmeldung fehlgeschlagen." });
    }
  });

  app.delete("/api/account/newsletter", requireAuth, async (req: AuthRequest, res) => {
    try {
      const email = req.user!.email?.toLowerCase();
      if (!email) return res.status(400).json({ error: "Keine E-Mail hinterlegt." });
      await db.update(newsletterSubscribers).set({ status: "UNSUBSCRIBED" }).where(eq(newsletterSubscribers.email, email));
      res.json({ message: "Newsletter abgemeldet.", subscribed: false });
    } catch {
      res.status(500).json({ error: "Abmeldung fehlgeschlagen." });
    }
  });

  // Saved addresses
  app.get("/api/account/addresses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db.select().from(userAddresses)
        .where(eq(userAddresses.userId, req.user!.uid))
        .orderBy(desc(userAddresses.createdAt));
      res.json(rows);
    } catch {
      res.status(500).json({ error: "Adressen konnten nicht geladen werden." });
    }
  });

  app.post("/api/account/addresses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, street, postalCode, city, country, isDefault } = req.body;
      if (!name || !street || !postalCode || !city) {
        return res.status(400).json({ error: "Alle Pflichtfelder ausfüllen." });
      }
      const existing = await db.select().from(userAddresses).where(eq(userAddresses.userId, req.user!.uid));
      const makeDefault = isDefault === true || existing.length === 0;
      if (makeDefault) {
        await db.update(userAddresses).set({ isDefault: "false" }).where(eq(userAddresses.userId, req.user!.uid));
      }
      const [row] = await db.insert(userAddresses).values({
        userId: req.user!.uid,
        name: String(name).trim(),
        street: String(street).trim(),
        postalCode: String(postalCode).trim(),
        city: String(city).trim(),
        country: String(country || "Deutschland").trim(),
        isDefault: makeDefault ? "true" : "false",
      }).returning();
      res.status(201).json(row);
    } catch {
      res.status(500).json({ error: "Adresse konnte nicht gespeichert werden." });
    }
  });

  app.patch("/api/account/addresses/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [existing] = await db.select().from(userAddresses)
        .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, req.user!.uid)))
        .limit(1);
      if (!existing) return res.status(404).json({ error: "Adresse nicht gefunden." });

      const { name, street, postalCode, city, country } = req.body;
      const [updated] = await db.update(userAddresses).set({
        ...(name != null && { name: String(name).trim() }),
        ...(street != null && { street: String(street).trim() }),
        ...(postalCode != null && { postalCode: String(postalCode).trim() }),
        ...(city != null && { city: String(city).trim() }),
        ...(country != null && { country: String(country).trim() }),
      }).where(eq(userAddresses.id, id)).returning();
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Adresse konnte nicht aktualisiert werden." });
    }
  });

  app.post("/api/account/addresses/:id/default", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [existing] = await db.select().from(userAddresses)
        .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, req.user!.uid)))
        .limit(1);
      if (!existing) return res.status(404).json({ error: "Adresse nicht gefunden." });
      await db.update(userAddresses).set({ isDefault: "false" }).where(eq(userAddresses.userId, req.user!.uid));
      const [updated] = await db.update(userAddresses).set({ isDefault: "true" }).where(eq(userAddresses.id, id)).returning();
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Standardadresse konnte nicht gesetzt werden." });
    }
  });

  app.delete("/api/account/addresses/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [existing] = await db.select().from(userAddresses)
        .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, req.user!.uid)))
        .limit(1);
      if (!existing) return res.status(404).json({ error: "Adresse nicht gefunden." });
      await db.delete(userAddresses).where(eq(userAddresses.id, id));
      if (existing.isDefault === "true") {
        const [next] = await db.select().from(userAddresses)
          .where(eq(userAddresses.userId, req.user!.uid))
          .limit(1);
        if (next) {
          await db.update(userAddresses).set({ isDefault: "true" }).where(eq(userAddresses.id, next.id));
        }
      }
      res.json({ message: "Adresse gelöscht." });
    } catch {
      res.status(500).json({ error: "Adresse konnte nicht gelöscht werden." });
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

  app.post("/api/products/:slug/inquiry", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, message } = req.body;
      if (!email) return res.status(400).json({ error: "E-Mail ist erforderlich." });

      const [product] = await db.select({
        product: products,
        brand: brands,
      })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(products.slug, req.params.slug))
        .limit(1);

      if (!product) return res.status(404).json({ error: "Produkt nicht gefunden." });

      const productTitle = product.product.titleDe || product.product.name;
      const subject = `Reservierung / Anfrage: ${productTitle}`;

      const [inquiry] = await db.insert(inquiries).values({
        type: "RESERVE",
        firstName,
        lastName,
        email,
        phone,
        subject,
        message: message || `Interesse an ${productTitle}`,
        metadata: {
          productId: product.product.id,
          productSlug: product.product.slug,
          productSku: product.product.sku,
          productName: productTitle,
          brand: product.brand?.name,
          price: product.product.price,
        },
      }).returning();

      const settings = await getSettingsMap();
      sendInquiryEmails({
        type: "RESERVE",
        typeLabel: "Produkt-Reservierung",
        firstName,
        lastName,
        email,
        phone,
        subject,
        message: message || `Interesse an ${productTitle}`,
        metadata: {
          productId: product.product.id,
          productSlug: product.product.slug,
          productSku: product.product.sku,
          productName: productTitle,
          brand: product.brand?.name,
          price: product.product.price,
        },
        settings,
      }).catch((e) => console.error("Reserve inquiry email failed", e));

      res.status(201).json({ id: inquiry.id, message: "Ihre Anfrage wurde übermittelt." });
    } catch (error) {
      console.error("Product inquiry failed", error);
      res.status(500).json({ error: "Anfrage konnte nicht gespeichert werden." });
    }
  });

  app.get("/api/shipping/quote", async (req, res) => {
    try {
      const country = String(req.query.country || "Deutschland");
      const subtotal = parseFloat(String(req.query.subtotal || "0")) || 0;
      const method = (String(req.query.method || "standard") as ShippingMethod);
      const deliveryMethod = String(req.query.deliveryMethod || "SHIPPING");
      const settings = await getSettingsMap();
      const cost = deliveryMethod === "PICKUP"
        ? 0
        : calculateShippingCost(country, settings as Record<string, string>, subtotal, method);
      const paymentPayload = buildCheckoutPaymentPayload(settings);
      res.json({
        shippingCost: cost,
        freeFrom: parseFloat(String(settings.shippingFreeFrom || "500")) || 500,
        ...paymentPayload,
        pickupNoteDe: settings.pickupNoteDe || "",
        pickupNoteEn: settings.pickupNoteEn || "",
      });
    } catch {
      res.status(500).json({ error: "Versand konnte nicht berechnet werden." });
    }
  });

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
      await db.delete(wishlistAlerts)
        .where(and(eq(wishlistAlerts.userId, req.user!.uid), eq(wishlistAlerts.productId, productId)));
      res.json({ message: "Entfernt" });
    } catch (error) {
      res.status(500).json({ error: "Entfernen fehlgeschlagen." });
    }
  });

  app.get("/api/wishlist/alerts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db.select().from(wishlistAlerts).where(eq(wishlistAlerts.userId, req.user!.uid));
      res.json(rows);
    } catch {
      res.status(500).json({ error: "Alerts konnten nicht geladen werden." });
    }
  });

  app.put("/api/wishlist/alerts/:productId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const { notifyPriceDrop, notifyBackInStock } = req.body;
      const [existing] = await db.select().from(wishlistAlerts)
        .where(and(eq(wishlistAlerts.userId, req.user!.uid), eq(wishlistAlerts.productId, productId)))
        .limit(1);

      if (existing) {
        const [updated] = await db.update(wishlistAlerts).set({
          notifyPriceDrop: notifyPriceDrop === false ? "false" : "true",
          notifyBackInStock: notifyBackInStock === false ? "false" : "true",
        }).where(eq(wishlistAlerts.id, existing.id)).returning();
        return res.json(updated);
      }

      const [created] = await db.insert(wishlistAlerts).values({
        userId: req.user!.uid,
        productId,
        notifyPriceDrop: notifyPriceDrop === false ? "false" : "true",
        notifyBackInStock: notifyBackInStock === false ? "false" : "true",
      }).returning();
      res.status(201).json(created);
    } catch {
      res.status(500).json({ error: "Alert konnte nicht gespeichert werden." });
    }
  });

  // Checkout quote (server-side pricing preview)
  app.post("/api/checkout/quote", async (req, res) => {
    try {
      const {
        items,
        paymentMethod,
        deliveryMethod,
        shippingMethod,
        billingAddress,
        shippingAddress,
      } = req.body;

      if (!items?.length) return res.status(400).json({ error: "Warenkorb ist leer." });

      const settings = await getSettingsMap();
      const strSettings = settings as Record<string, string>;
      const resolvedPaymentMethod = resolveCheckoutPaymentMethod(paymentMethod, strSettings);

      const computed = await buildOrderLinesFromRequest(
        items.map((i: { id: string; quantity: number }) => ({ id: i.id, quantity: i.quantity })),
        { paymentMethod: resolvedPaymentMethod }
      );

      const isPickup = deliveryMethod === "PICKUP";
      const shipAddr = shippingAddress || billingAddress;
      const shippingCountry = isPickup ? "Deutschland" : (shipAddr?.country || "Deutschland");
      const shipMethod: ShippingMethod = isPickup ? "pickup" : (shippingMethod === "express" ? "express" : "standard");
      const shippingCost = calculateShippingCost(
        shippingCountry,
        strSettings,
        computed.totalGross,
        shipMethod
      );

      res.json({
        paymentMethod: resolvedPaymentMethod,
        shopSubtotalGross: computed.shopSubtotalGross,
        subtotalGross: computed.totalGross,
        prepaymentDiscount: computed.prepaymentDiscount,
        shippingCost,
        totalGross: roundMoney(computed.totalGross + shippingCost),
        ...buildCheckoutPaymentPayload(settings),
      });
    } catch (error: unknown) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Preisberechnung fehlgeschlagen.",
      });
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
        paymentMethod,
        deliveryMethod,
        shippingMethod,
        termsAccepted,
      } = req.body;
      if (!items?.length) return res.status(400).json({ error: "Warenkorb ist leer." });
      if (!termsAccepted) {
        return res.status(400).json({
          error: "Bitte bestätigen Sie die AGB und nehmen Sie die Widerrufsbelehrung zur Kenntnis.",
        });
      }

      const orderLang = language === "en" ? "en" : "de";
      const legalSnapshot = await buildLegalAcceptanceSnapshot(orderLang);

      const settings = await getSettingsMap();
      const strSettings = settings as Record<string, string>;
      const resolvedPaymentMethod = resolveCheckoutPaymentMethod(paymentMethod, strSettings);

      const computed = await buildOrderLinesFromRequest(
        items.map((i: { id: string; quantity: number }) => ({ id: i.id, quantity: i.quantity })),
        { paymentMethod: resolvedPaymentMethod }
      );

      const isPickup = deliveryMethod === "PICKUP";
      const shippingCountry = isPickup ? "Deutschland" : ((shippingAddress || billingAddress)?.country || "Deutschland");
      const shipMethod: ShippingMethod = isPickup ? "pickup" : (shippingMethod === "express" ? "express" : "standard");
      const shippingCost = calculateShippingCost(
        shippingCountry,
        settings as Record<string, string>,
        computed.totalGross,
        shipMethod
      );
      const prepaymentDiscount =
        resolvedPaymentMethod === "BANK_TRANSFER" ? computed.prepaymentDiscount : 0;
      const totalGross = Math.max(0, computed.totalGross + shippingCost);

      const orderNumber = generateOrderNumber();
      const billing = billingAddress || null;
      const shipping = shippingAddress || billing;

      const [order] = await db.insert(orders).values({
        userId: req.user!.uid,
        orderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: resolvedPaymentMethod,
        total: totalGross.toString(),
        subtotalNet: computed.subtotalNet.toString(),
        taxAmount: computed.taxAmount.toString(),
        taxRatePercent: computed.taxRatePercent.toString(),
        shippingCost: shippingCost.toString(),
        discountAmount: prepaymentDiscount.toString(),
        shopSubtotalGross: computed.shopSubtotalGross.toString(),
        shippingAddress: isPickup ? { ...billing, type: "PICKUP" } : shipping,
        billingAddress: billing,
        deliveryMethod: isPickup ? "PICKUP" : "SHIPPING",
        language: orderLang,
        customerName: customerName || null,
        companyName: companyName || null,
        customerVatId: customerVatId || null,
        legalAcceptanceSnapshot: legalSnapshot,
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
          pricingModel: line.pricingModel,
          shopUnitPriceGross: line.shopUnitPriceGross.toString(),
          basePriceSnapshot: line.basePriceSnapshot != null ? line.basePriceSnapshot.toString() : null,
          prepaymentDiscountSnapshot: line.prepaymentDiscountSnapshot.toString(),
        });

        orderItemsForEmail.push({ name: line.name, quantity: line.quantity, price: line.unitPriceGross });

        const [product] = await db.select().from(products).where(eq(products.id, line.productId)).limit(1);
        if (product && product.stock !== null && product.stock > 0) {
          await db.update(products)
            .set({ stock: Math.max(0, product.stock - line.quantity), updatedAt: new Date() })
            .where(eq(products.id, line.productId));
        }
      }

      const customerEmail = req.user!.email;
      if (customerEmail && resolvedPaymentMethod === "BANK_TRANSFER") {
        sendOrderEmails({
          customerEmail,
          orderNumber,
          total: totalGross.toString(),
          items: orderItemsForEmail,
          settings,
          language: orderLang,
          paymentMethod: resolvedPaymentMethod,
          shippingCost: shippingCost.toString(),
          prepaymentDiscount: prepaymentDiscount.toString(),
          billingAddress: billing,
          shippingAddress: shipping,
        }).catch((e) => console.error("Order email failed", e));
      }

      let checkoutUrl: string | null = null;
      let stripeCheckoutSessionId: string | null = null;

      await linkCertificatesForOrderItems(order.id).catch((e) =>
        console.error("Certificate link failed:", e)
      );

      if (resolvedPaymentMethod === "STRIPE" && customerEmail) {
        const session = await createStripeCheckoutSession({
          orderId: order.id,
          orderNumber,
          totalEur: totalGross,
          customerEmail,
          language: language === "en" ? "en" : "de",
          lineItems: computed.lines.map((line) => ({
            name: line.name,
            quantity: line.quantity,
            unitAmountEur: line.unitPriceGross,
          })),
          shippingEur: shippingCost,
        });
        checkoutUrl = session.url;
        stripeCheckoutSessionId = session.sessionId;
        await db.update(orders)
          .set({ stripeCheckoutSessionId, updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }

      res.status(201).json({
        ...order,
        stripeCheckoutSessionId,
        invoiceNumber: null,
        paymentInfo: settings,
        checkoutUrl,
        ...buildCheckoutPaymentPayload(settings),
        invoiceSettingsWarning: getMissingInvoiceSettings(settings),
      });
    } catch (error: unknown) {
      console.error("Failed to create order", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Bestellung fehlgeschlagen." });
    }
  });

  app.get("/api/orders/by-number/:orderNumber", requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderNumber = req.params.orderNumber;
      const [order] = await db.select().from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);

      if (!order) return res.status(404).json({ error: "Bestellung nicht gefunden." });
      if (order.userId !== req.user!.uid) return res.status(403).json({ error: "Zugriff verweigert." });

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const [inv] = await db.select({
        invoiceNumber: invoices.invoiceNumber,
        invoiceId: invoices.id,
        invoiceStatus: invoices.invoiceStatus,
      })
        .from(invoices)
        .where(and(eq(invoices.orderId, order.id), eq(invoices.invoiceType, "INVOICE")))
        .limit(1);

      res.json({
        id: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        total: order.total,
        paidAt: order.paidAt,
        stripeCheckoutSessionId: order.stripeCheckoutSessionId,
        stripePaymentIntentId: order.stripePaymentIntentId,
        invoiceNumber: inv?.invoiceNumber || null,
        invoiceId: inv?.invoiceId ?? null,
        invoiceStatus: inv?.invoiceStatus || null,
        items: items.map((i) => ({
          name: i.productName || "Produkt",
          quantity: i.quantity,
          price: parseFloat(i.price),
        })),
      });
    } catch {
      res.status(500).json({ error: "Bestellstatus konnte nicht geladen werden." });
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
      const { status, paymentStatus, trackingNumber, carrier } = req.body;

      const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "Bestellung nicht gefunden." });

      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        if (
          existing.paymentMethod === "STRIPE" &&
          existing.paymentStatus === "PAID" &&
          existing.stripePaymentIntentId
        ) {
          try {
            await createStripeRefund(existing.stripePaymentIntentId, parseFloat(existing.total));
          } catch (refundErr) {
            console.error("Stripe refund failed:", refundErr);
            return res.status(502).json({ error: "Stripe-Erstattung fehlgeschlagen." });
          }
        }

        await restoreOrderStock(id);
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
          ...(trackingNumber != null && { trackingNumber: String(trackingNumber).trim() || null }),
          ...(carrier != null && { carrier: String(carrier).trim() || null }),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        await cancelInvoiceForOrder(id, "Bestellung storniert");
        await cancelCertificatesForOrder(id, {
          uid: req.user!.uid,
          name: req.user!.name,
          email: req.user!.email,
        }).catch((e) => console.error("Certificate cancel failed:", e));
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

  // Admin: Preise & Zahlungen
  app.get("/api/admin/pricing-payments", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      res.json(await getPricingPaymentsPayload());
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Laden fehlgeschlagen." });
    }
  });

  app.put("/api/admin/pricing-payments", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const result = await savePricingPaymentsSettings(req.body, {
        uid: req.user!.uid,
        name: req.user!.name,
        email: req.user!.email,
      });
      res.json(result);
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." });
    }
  });

  app.get("/api/admin/pricing-payments/audit-log", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || "100"), 10) || 100;
      res.json({ entries: await getPricingAuditLog(limit) });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Audit-Log fehlgeschlagen." });
    }
  });

  // Admin: Preise neu berechnen (nur PREPAYMENT_DISCOUNT)
  app.post("/api/admin/products/recalculate-prices/preview", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const settings = await getSettingsMap();
      const config = parseShopPricingConfig(settings as Record<string, string>);
      const all = await db.select().from(products);

      const changes = all
        .filter((p) => p.pricingModel === "PREPAYMENT_DISCOUNT")
        .map((p) => {
          const oldShop = parseFloat(String(p.price || "0")) || 0;
          const oldDiscount = parseFloat(String(p.bankTransferDiscount || "0")) || 0;
          const resolved = resolveProductPricing(
            { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: p.basePrice },
            config
          );
          const fields = toProductPriceDbFields(resolved);
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            oldPrice: oldShop,
            newPrice: parseFloat(fields.price),
            oldDiscount,
            newDiscount: parseFloat(fields.bankTransferDiscount),
          };
        })
        .filter((c) => c.oldPrice !== c.newPrice || c.oldDiscount !== c.newDiscount);

      res.json({ count: changes.length, changes });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Vorschau fehlgeschlagen." });
    }
  });

  app.post("/api/admin/products/recalculate-prices/apply", requireAuth, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const settings = await getSettingsMap();
      const config = parseShopPricingConfig(settings as Record<string, string>);
      const all = await db.select().from(products).where(eq(products.pricingModel, "PREPAYMENT_DISCOUNT"));

      let updated = 0;
      for (const p of all) {
        const resolved = resolveProductPricing(
          { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: p.basePrice },
          config
        );
        const fields = toProductPriceDbFields(resolved);
        await db.update(products).set({
          price: fields.price,
          roundedShopPrice: fields.roundedShopPrice,
          calculatedStripePrice: fields.calculatedStripePrice,
          bankTransferDiscount: fields.bankTransferDiscount,
          basePrice: fields.basePrice,
          updatedAt: new Date(),
        }).where(eq(products.id, p.id));
        updated += 1;
      }

      res.json({ updated, message: `${updated} Produkte neu berechnet.` });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Neuberechnung fehlgeschlagen." });
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

  registerCertificateRoutes(app);
  registerLegalRoutes(app);
}
