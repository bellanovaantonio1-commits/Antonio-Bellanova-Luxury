import "./src/load-env.ts";

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

// ES Module path resolution (with fallback for CJS)
const __filename = fileURLToPath(import.meta.url || `file://${process.cwd()}/server.ts`);
const __dirname = path.dirname(__filename);

import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";
import { adminAuth, adminDb, adminStorage, FieldValue } from "./src/lib/firebase-admin.ts";
import firebaseConfig from "./firebase-applet-config.json";
import { db } from "./src/db/index.ts";
import { users, products, categories, brands, orderItems, wishlistItems, wishlistAlerts } from "./src/db/schema.ts";
import { eq, or, like, and, sql, desc, asc, gt, inArray, ne, gte, lte, ilike, isNotNull } from "drizzle-orm";
import { importService } from "./src/services/import/ImportService.ts";
import { imageStorageService } from "./src/services/import/ImageStorageService.ts";


import { registerExtraRoutes } from "./src/server/extraRoutes.ts";
import { ensureLegalDefaults } from "./src/server/legal/service.ts";
import { handleStripeWebhook } from "./src/server/stripeWebhook.ts";
import { buildProductJsonLd, injectProductMeta, loadSpaIndexHtml } from "./src/server/seo.ts";
import { notifyWishlistAlerts } from "./src/server/wishlistAlerts.ts";
import { refreshCertificatesForProduct } from "./src/server/certificate/service.ts";
import { getShopCollectionCondition, getCuratedCollectionCondition, isShopCollectionSlug } from "./src/lib/shopCollectionFilters.ts";
import { getSettingsMap } from "./src/server/settings.ts";
import {
  resolveProductPricing,
  parseShopPricingConfig,
  toProductPriceDbFields,
  getUnitPriceForPayment,
} from "./src/lib/shopPricing.ts";

function toEntitySlug(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Remove FK references so products can be deleted without breaking order history. */
async function clearProductForeignKeys(productId?: number): Promise<void> {
  if (productId != null) {
    await db.delete(wishlistItems).where(eq(wishlistItems.productId, productId));
    await db.delete(wishlistAlerts).where(eq(wishlistAlerts.productId, productId));
    await db.update(orderItems).set({ productId: null }).where(eq(orderItems.productId, productId));
    return;
  }

  await db.delete(wishlistItems);
  await db.delete(wishlistAlerts);
  await db.update(orderItems).set({ productId: null }).where(isNotNull(orderItems.productId));
}

async function findOrCreateBrandId(brandName: string): Promise<number | null> {
  const name = brandName.trim();
  if (!name) return null;

  const slug = toEntitySlug(name);
  const bySlug = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  if (bySlug.length > 0) return bySlug[0].id;

  const byName = await db
    .select()
    .from(brands)
    .where(sql`lower(${brands.name}) = lower(${name})`)
    .limit(1);
  if (byName.length > 0) return byName[0].id;

  try {
    const [created] = await db.insert(brands).values({ name, slug }).returning();
    return created.id;
  } catch {
    const existing = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
    if (existing.length > 0) return existing[0].id;
    throw new Error(`Marke "${name}" konnte nicht gespeichert werden.`);
  }
}

async function findOrCreateCategoryId(categoryName: string): Promise<number | null> {
  const name = categoryName.trim();
  if (!name) return null;

  const slug = toEntitySlug(name);
  const bySlug = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (bySlug.length > 0) return bySlug[0].id;

  const byName = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.nameDe}) = lower(${name})`)
    .limit(1);
  if (byName.length > 0) return byName[0].id;

  try {
    const [created] = await db.insert(categories).values({ nameDe: name, slug }).returning();
    return created.id;
  } catch {
    const existing = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (existing.length > 0) return existing[0].id;
    throw new Error(`Kategorie "${name}" konnte nicht gespeichert werden.`);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        await handleStripeWebhook(req.body as Buffer, req.headers["stripe-signature"] as string | undefined);
        res.json({ received: true });
      } catch (error) {
        console.error("Stripe webhook failed", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Webhook failed" });
      }
    }
  );

  if (!process.env.DATABASE_URL?.trim()) {
    console.warn("[DB] DATABASE_URL is not set — API/database features will fail until configured.");
  } else {
    console.log("[DB] DATABASE_URL configured.");
  }

  app.use(express.json());

  // --- API Routes ---
  // Auth & Sync
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      console.log("Syncing user to SQL & Firestore:", req.user!.uid);
      
      const email = req.user!.email!;
      const adminEmails = (process.env.ADMIN_EMAILS || "antoniobellanova1812@gmail.com,belllanovaantonio1@gmail.com")
        .split(",").map(e => e.trim().toLowerCase());
      const isAdminEmail = adminEmails.includes(email.toLowerCase());
      const role = isAdminEmail ? "ADMIN" : "CUSTOMER";

      // SQL Sync
      const existingUser = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      
      let userData;
      if (existingUser.length === 0) {
        const result = await db.insert(users).values({
          uid: req.user!.uid,
          email: email,
          role: role,
        }).returning();
        userData = result[0];
        console.log(`New user created in SQL: ${req.user!.uid}`);
      } else {
        userData = existingUser[0];
        // Upgrade to ADMIN if email matches but role is different
        if (isAdminEmail && userData.role !== "ADMIN") {
          const result = await db.update(users)
            .set({ role: "ADMIN", updatedAt: new Date() })
            .where(eq(users.uid, req.user!.uid))
            .returning();
          userData = result[0];
          console.log(`User upgraded to ADMIN in SQL: ${req.user!.uid}`);
        }
      }

      // Firestore Sync (Required for Firestore Security Rules)
      if (adminDb) {
        try {
          await adminDb.collection("users").doc(req.user!.uid).set({
            uid: req.user!.uid,
            email: email,
            role: role,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`User synced to Firestore: ${req.user!.uid}`);
        } catch (fsErr: any) {
          console.warn("Firestore user sync failed:", fsErr.message);
        }
      }

      res.json({ ...userData, role: isAdminEmail ? "ADMIN" : userData.role });
    } catch (error: any) {
      console.error("Sync failed:", error);
      // Graceful fallback wenn DB nicht erreichbar
      const email = req.user!.email!;
      const adminEmails = (process.env.ADMIN_EMAILS || "antoniobellanova1812@gmail.com,belllanovaantonio1@gmail.com")
        .split(",").map(e => e.trim().toLowerCase());
      const role = adminEmails.includes(email.toLowerCase()) ? "ADMIN" : "CUSTOMER";
      res.json({ uid: req.user!.uid, email, role, dbOffline: true });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const existingUser = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (existingUser.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(existingUser[0]);
    } catch (error) {
      res.status(500).json({ error: "Fetch failed" });
    }
  });

  // Products
  // Public brands list
  app.get("/api/brands", async (_req, res) => {
    try {
      const result = await db.select().from(brands).orderBy(brands.name);
      res.json(result);
    } catch {
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  app.get("/api/brands/:slug", async (req, res) => {
    try {
      const [brand] = await db.select().from(brands).where(eq(brands.slug, req.params.slug)).limit(1);
      if (!brand) return res.status(404).json({ error: "Brand not found" });
      res.json(brand);
    } catch {
      res.status(500).json({ error: "Failed to fetch brand" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const {
        cat, all, limit: limitParam, sort, brand: brandSlug, minPrice, maxPrice, exclude,
        conditionGroup, box, papers, material, movement, diameter, collection, hero, curated,
      } = req.query;
      
      let conditions: any[] = [];
      
      if (all !== "true") {
        conditions.push(inArray(products.status, ["ACTIVE"]));
        conditions.push(gt(products.stock, 0));
      }

      if (hero === "true") {
        conditions.push(eq(products.featuredInHero, true));
      }
      
      if (cat === "watches") conditions.push(eq(products.type, "WATCH"));
      else if (cat === "jewelry") conditions.push(eq(products.type, "JEWELRY"));
      else if (cat === "new") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        conditions.push(gte(products.createdAt, cutoff));
      }

      if (brandSlug) conditions.push(eq(brands.slug, brandSlug as string));
      if (minPrice) conditions.push(gte(products.price, minPrice as string));
      if (maxPrice) conditions.push(lte(products.price, maxPrice as string));
      if (exclude) conditions.push(ne(products.slug, exclude as string));
      if (conditionGroup) conditions.push(eq(products.conditionGroup, String(conditionGroup)));
      if (material) conditions.push(ilike(products.material, `%${String(material)}%`));
      if (movement) conditions.push(ilike(products.movement, `%${String(movement)}%`));
      if (diameter) conditions.push(ilike(products.diameter, `%${String(diameter)}%`));

      if (box === "yes") {
        conditions.push(or(
          eq(products.box, "true"),
          eq(products.box, "Ja"),
          ilike(products.box, "yes"),
          ilike(products.box, "ja"),
        ));
      }
      if (papers === "yes") {
        conditions.push(or(
          eq(products.papers, "true"),
          eq(products.papers, "Ja"),
          ilike(products.papers, "yes"),
          ilike(products.papers, "ja"),
        ));
      }

      if (typeof collection === "string" && isShopCollectionSlug(collection)) {
        if (curated === "true") {
          conditions.push(getCuratedCollectionCondition(collection));
        } else {
          conditions.push(getShopCollectionCondition(collection));
        }
      }

      let orderBy = cat === "new" ? desc(products.createdAt) : desc(products.createdAt);
      if (sort === "price-asc") orderBy = asc(products.price);
      else if (sort === "price-desc") orderBy = desc(products.price);
      else if (sort === "name") orderBy = asc(products.name);

      let query = db.select({
        product: products,
        brand: brands,
        category: categories
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy);

      if (limitParam) {
        query = query.limit(parseInt(limitParam as string)) as typeof query;
      }

      const allProducts = await query;
      
      const mappedProducts = allProducts.map(item => ({
        ...item.product,
        images: Array.isArray(item.product.images) ? item.product.images : (typeof item.product.images === 'string' ? JSON.parse(item.product.images) : []),
        brand: item.brand,
        category: item.category
      }));

      res.json(mappedProducts);
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Sitemap
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const activeProducts = await db.select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(and(inArray(products.status, ["ACTIVE"]), gt(products.stock, 0)));

      const base = process.env.APP_URL || "https://antonio-bellanova-luxury.onrender.com";
      const staticPages = ["", "shop", "contact", "sell", "faq", "legal", "privacy", "terms", "shipping", "returns", "withdrawal", "withdrawal-form", "payment-info"];
      const brandRows = await db.select({ slug: brands.slug }).from(brands);
      const urls = [
        ...staticPages.map(p => `${base}/${p}`),
        ...brandRows.map(b => `${base}/brands/${b.slug}`),
        ...brandRows.map(b => `${base}/shop?brand=${b.slug}`),
        ...activeProducts.map(p => `${base}/product/${p.slug}`),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;

      res.setHeader("Content-Type", "application/xml");
      res.send(xml);
    } catch {
      res.status(500).send("");
    }
  });

  app.get("/api/products/:slug/related", async (req, res) => {
    try {
      const [source] = await db.select({ product: products, brand: brands })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(products.slug, req.params.slug))
        .limit(1);
      if (!source) return res.json([]);

      const price = parseFloat(source.product.price || "0");
      const minP = (price * 0.75).toFixed(2);
      const maxP = (price * 1.25).toFixed(2);

      let related = await db.select({ product: products, brand: brands })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(
          inArray(products.status, ["ACTIVE"]),
          gt(products.stock, 0),
          ne(products.slug, req.params.slug),
          source.product.brandId ? eq(products.brandId, source.product.brandId) : sql`1=1`,
          gte(products.price, minP),
          lte(products.price, maxP),
        ))
        .limit(4);

      if (related.length < 4) {
        const existing = new Set(related.map(r => r.product.id));
        const fallback = await db.select({ product: products, brand: brands })
          .from(products)
          .leftJoin(brands, eq(products.brandId, brands.id))
          .where(and(
            inArray(products.status, ["ACTIVE"]),
            gt(products.stock, 0),
            ne(products.slug, req.params.slug),
            source.product.type ? eq(products.type, source.product.type) : sql`1=1`,
          ))
          .limit(8);
        for (const row of fallback) {
          if (related.length >= 4) break;
          if (!existing.has(row.product.id)) {
            related.push(row);
            existing.add(row.product.id);
          }
        }
      }

      res.json(related.slice(0, 4).map(item => ({
        ...item.product,
        images: Array.isArray(item.product.images) ? item.product.images : (typeof item.product.images === 'string' ? JSON.parse(item.product.images) : []),
        brand: item.brand,
      })));
    } catch (error) {
      console.error("Related products failed", error);
      res.status(500).json({ error: "Failed to fetch related products" });
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const result = await db.select({
        product: products,
        brand: brands,
        category: categories
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, req.params.slug))
      .limit(1);
      
      if (result.length === 0) return res.status(404).json({ error: "Product not found" });
      
      const item = result[0];
      const settings = await getSettingsMap();
      const strSettings = settings as Record<string, string>;
      const pricingLine = getUnitPriceForPayment(item.product, "BANK_TRANSFER");
      const prepaymentEnabled =
        strSettings.prepaymentEnabled !== "false" && strSettings.bankTransferEnabled !== "false";
      const showBankTransferPrice =
        item.product.pricingModel === "PREPAYMENT_DISCOUNT" &&
        prepaymentEnabled &&
        pricingLine.prepaymentDiscount > 0;

      const product = {
        ...item.product,
        images: Array.isArray(item.product.images) ? item.product.images : (typeof item.product.images === 'string' ? JSON.parse(item.product.images) : []),
        specifications: typeof item.product.specifications === 'string' ? JSON.parse(item.product.specifications) : (item.product.specifications || {}),
        brand: item.brand,
        category: item.category,
        pricing: {
          shopPrice: pricingLine.shopUnitPrice,
          bankTransferPrice: pricingLine.payableUnitPrice,
          prepaymentDiscount: pricingLine.prepaymentDiscount,
          showBankTransferPrice,
          currency: item.product.currency || "EUR",
        },
      };

      res.json(product);
    } catch (error) {
      console.error("Failed to fetch product by slug:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });


  // Search
  app.get("/api/products/search", async (req, res) => {
    try {
      const searchQ = (req.query.q as string || "").trim();
      if (!searchQ) return res.json([]);

      const q = `%${searchQ.toLowerCase()}%`;
      const result = await db.select({ product: products, brand: brands })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(
          inArray(products.status, ["ACTIVE"]),
          gt(products.stock, 0),
          or(
            ilike(products.name, q),
            ilike(products.titleDe, q),
            ilike(products.titleEn, q),
            ilike(products.model, q),
            ilike(products.sku, q),
            ilike(brands.name, q),
          )
        ))
        .limit(12);

      res.json(result.map(item => ({
        ...item.product,
        brand: item.brand?.name,
        images: Array.isArray(item.product.images) ? item.product.images : (typeof item.product.images === 'string' ? JSON.parse(item.product.images) : []),
      })));
    } catch (error) {
      console.error("Search failed", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  registerExtraRoutes(app);
  ensureLegalDefaults().catch((err) => console.error("[legal] Default documents:", err));

  app.get("/robots.txt", (_req, res) => {
    const base = process.env.APP_URL || "https://antonio-bellanova-luxury.onrender.com";
    res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
  });

  async function renderProductPage(slug: string, res: express.Response) {
    const result = await db.select({
      product: products,
      brand: brands,
    })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.slug, slug))
      .limit(1);

    if (result.length === 0) return false;

    const item = result[0];
    const images = Array.isArray(item.product.images)
      ? item.product.images
      : typeof item.product.images === "string"
        ? JSON.parse(item.product.images)
        : [];
    const product = { ...item.product, images, brand: item.brand };
    const base = process.env.APP_URL || "https://antonio-bellanova-luxury.onrender.com";
    const url = `${base}/product/${product.slug}`;
    const title = product.seoTitleDe || product.titleDe || product.name;
    const description = (product.seoDescriptionDe || product.shortDescriptionDe || product.descriptionDe || title)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const html = injectProductMeta(loadSpaIndexHtml(), {
      title: `${title} | Antonio Bellanova Luxury`,
      description,
      image: images[0],
      url,
      jsonLd: { "@context": "https://schema.org", ...buildProductJsonLd(product as any, base, "de") },
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
    return true;
  }

  // Admin Products Retrieval (SQL Source of Truth)
  app.get("/api/admin/products", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const result = await db.select({
        product: products,
        brand: brands,
        category: categories
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.updatedAt));

      const mapped = result.map(item => ({
        ...item.product,
        images: Array.isArray(item.product.images) ? item.product.images : (typeof item.product.images === 'string' ? JSON.parse(item.product.images) : []),
        specifications: typeof item.product.specifications === 'string' ? JSON.parse(item.product.specifications) : (item.product.specifications || {}),
        sourceData: typeof item.product.sourceData === 'string' ? JSON.parse(item.product.sourceData) : (item.product.sourceData || {}),
        brand: item.brand,
        category: item.category
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Failed to fetch admin products", error);
      res.status(500).json({ error: "Failed to fetch admin products" });
    }
  });

  // Admin Products
  app.post("/api/admin/products/analyze", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      
      const result = await importService.analyzeUrl(url);
      res.json(result);
    } catch (error: any) {
      console.error("Analysis failed:", error);
      res.status(500).json({ error: error.message || "Failed to analyze product" });
    }
  });

  app.delete("/api/admin/products/all", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      console.log("Bulk delete initiated by:", req.user?.email);
      
      // 1. Delete from Firestore (try/catch to avoid blocking SQL delete)
      if (adminDb) {
        try {
          console.log("Deleting Firestore products...");
          const snapshot = await adminDb.collection("products").get();
          if (!snapshot.empty) {
            const batch = adminDb.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log(`Deleted ${snapshot.size} Firestore product documents`);
          }
        } catch (fsErr) {
          console.warn("Firestore bulk delete failed (non-blocking):", fsErr);
        }
      }

      // 2. Clean up ALL product media from storage
      try {
        console.log("Cleaning up all product images from storage...");
        const bucket = adminStorage.bucket();
        const [files] = await bucket.getFiles({ prefix: 'products/' });
        if (files.length > 0) {
          console.log(`Deleting ${files.length} files from storage...`);
          await Promise.all(files.map(file => file.delete()));
          console.log("Successfully cleared products folder in storage");
        }
      } catch (storageErr: any) {
        console.warn("Storage bulk cleanup failed:", storageErr.message);
      }

      // 3. Clear FK references, then delete from SQL
      console.log("Clearing product references from SQL...");
      await clearProductForeignKeys();
      console.log("Deleting products from SQL...");
      await db.delete(products);
      console.log("SQL products deleted successfully");
      
      res.json({ message: "All products and associated data deleted successfully" });
    } catch (error: any) {
      console.error("Failed to delete all products:", error);
      res.status(500).json({ error: "Failed to delete all products: " + error.message });
    }
  });

  app.delete("/api/admin/products/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const rawId = req.params.id;
      let sqlId: number | null = null;
      let firestoreId: string | null = null;
      let productSku: string | null = null;

      if (!isNaN(parseInt(rawId))) {
        sqlId = parseInt(rawId);
      } else {
        firestoreId = rawId;
      }

      // Fetch SKU from SQL or Firestore if possible before deletion
      if (sqlId) {
        const [sqlProduct] = await db.select().from(products).where(eq(products.id, sqlId)).limit(1);
        if (sqlProduct) productSku = sqlProduct.sku;
      }

      // 1. Delete from Firestore
      if (adminDb) {
        try {
          if (sqlId) {
            const snapshot = await adminDb.collection("products").where("sqlId", "==", sqlId).get();
            if (!snapshot.empty) {
              const batch = adminDb.batch();
              snapshot.docs.forEach(doc => {
                if (!productSku) productSku = doc.data().sku;
                batch.delete(doc.ref);
              });
              await batch.commit();
              console.log(`Deleted Firestore docs for SQL product ${sqlId}`);
            }
          } else if (firestoreId) {
            const docRef = adminDb.collection("products").doc(firestoreId);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
              const data = docSnap.data();
              if (data?.sqlId) sqlId = data.sqlId;
              if (data?.sku) productSku = data.sku;
              await docRef.delete();
              console.log(`Deleted Firestore doc ${firestoreId}`);
            }
          }
        } catch (fsErr) {
          console.warn("Firestore delete failed (non-blocking):", fsErr);
        }
      }

      // 2. Clean up media from storage if SKU is known
      if (productSku) {
        await imageStorageService.deleteProductMedia(productSku);
      }

      // 3. Clear FK references, then delete from SQL if we have an ID
      if (sqlId) {
        await clearProductForeignKeys(sqlId);
        await db.delete(products).where(eq(products.id, sqlId));
        console.log(`Deleted SQL product ${sqlId}`);
      }

      if (!sqlId && !firestoreId) {
        return res.status(404).json({ error: "Produkt nicht gefunden." });
      }

      res.json({ message: "Product and associated data deleted successfully" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete product";
      console.error("Failed to delete product", error);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/admin/products", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      const sku = data.sku || "unknown";
      const sourceProvider = data.sourceProvider;
      const sourceProductId = data.sourceProductId;
      const sourceVariantId = data.sourceVariantId;
      
      // 1. Identify existing product by ID (admin edit), SKU or Source ID
      let existingId: number | null = null;
      let existingStatus: string | null = null;

      const parsedSqlId = parseInt(String(data.id || data.sqlId || ""), 10);
      if (Number.isFinite(parsedSqlId) && parsedSqlId > 0 && data.overwrite === true) {
        const [byId] = await db.select().from(products).where(eq(products.id, parsedSqlId)).limit(1);
        if (byId) {
          existingId = byId.id;
          existingStatus = byId.status;
        }
      }

      // Check by SKU first if available
      if (!existingId && data.sku && data.sku !== "unknown") {
        const existingBySku = await db.select().from(products).where(eq(products.sku, data.sku)).limit(1);
        if (existingBySku.length > 0) {
          existingId = existingBySku[0].id;
          existingStatus = existingBySku[0].status;
        }
      }

      // If not found by SKU, check by Source ID
      if (!existingId && sourceProvider && sourceProductId) {
        const condition = sourceVariantId 
          ? and(eq(products.sourceProvider, sourceProvider), eq(products.sourceProductId, sourceProductId), eq(products.sourceVariantId, sourceVariantId))
          : and(eq(products.sourceProvider, sourceProvider), eq(products.sourceProductId, sourceProductId));

        const existingBySource = await db.select().from(products).where(condition).limit(1);
        if (existingBySource.length > 0) {
          existingId = existingBySource[0].id;
          existingStatus = existingBySource[0].status;
        }
      }

      // SMART UPSERT LOGIC:
      // FALL D: SKU existiert bereits UND ist veröffentlicht (ACTIVE).
      // Dann NICHT einfach einen Fehler anzeigen, es sei denn overwrite ist false.
      if (existingId && existingStatus === "ACTIVE" && data.overwrite !== true) {
        return res.status(409).json({ 
          error: "Produkt bereits importiert (SKU existiert)", 
          productId: existingId,
          status: existingStatus 
        });
      }
      
      // FALL B & C: SKU existiert als ENTWURF (DRAFT) -> Wir erlauben das Update immer
      // oder wenn overwrite true ist.

      // 2. Process Images for Permanent Storage in Parallel
      console.log(`Processing ${data.images?.length || 0} images for SKU: ${sku}`);

      let storedImages: string[] = [];
      let mainImage: string | null = null;
      let mediaRecords: Array<{
        sourceUrl: string;
        storageUrl: string;
        position: number;
        isPrimary: boolean;
        createdAt: string;
      }> = [];

      const hasIncomingImages = Array.isArray(data.images) && data.images.length > 0;

      if (existingId && !hasIncomingImages) {
        const [prev] = await db.select().from(products).where(eq(products.id, existingId)).limit(1);
        if (prev) {
          storedImages = Array.isArray(prev.images)
            ? (prev.images as string[])
            : typeof prev.images === "string"
              ? JSON.parse(prev.images)
              : [];
          mainImage = prev.mainImage || storedImages[0] || null;
          mediaRecords = storedImages.map((storageUrl, i) => ({
            sourceUrl: storageUrl,
            storageUrl,
            position: i,
            isPrimary: storageUrl === mainImage || (i === 0 && !mainImage),
            createdAt: new Date().toISOString(),
          }));
        }
      } else {
        const imageResults = await Promise.all((data.images || []).map(async (sourceUrl: string, i: number) => {
        try {
          // Only upload if it's not already a storage URL
          if (sourceUrl.startsWith('https://storage.googleapis.com')) {
             return {
              sourceUrl,
              storageUrl: sourceUrl,
              position: i,
              isPrimary: sourceUrl === data.mainImage || (i === 0 && !data.mainImage),
              createdAt: new Date().toISOString()
            };
          }
          const storageUrl = await imageStorageService.uploadFromUrl(sourceUrl, `products/${sku}`);
          return {
            sourceUrl,
            storageUrl,
            position: i,
            isPrimary: sourceUrl === data.mainImage || (i === 0 && !data.mainImage),
            createdAt: new Date().toISOString()
          };
        } catch (err) {
          console.error(`Failed to process image ${i}: ${sourceUrl}`, err);
          return null;
        }
      }));

        mediaRecords = imageResults.filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => a.position - b.position);
        storedImages = mediaRecords.map((m) => m.storageUrl);
        mainImage = mediaRecords.find((m) => m.isPrimary)?.storageUrl || storedImages[0] || null;
      }

      const settingsMap = await getSettingsMap();
      const pricingConfig = parseShopPricingConfig(settingsMap as Record<string, string>);

      const pricingModel =
        data.pricingModel === "PREPAYMENT_DISCOUNT" ? "PREPAYMENT_DISCOUNT" : "STANDARD";

      let resolvedPricing;
      if (pricingModel === "PREPAYMENT_DISCOUNT") {
        const baseInput =
          data.basePrice ??
          (data.grossSalePrice != null && String(data.grossSalePrice).trim() !== "" ? data.grossSalePrice : null);
        resolvedPricing = resolveProductPricing(
          { pricingModel: "PREPAYMENT_DISCOUNT", basePrice: baseInput },
          pricingConfig
        );
      } else {
        resolvedPricing = resolveProductPricing(
          {
            pricingModel: "STANDARD",
            fixedSalePrice: data.fixedSalePrice ?? data.price ?? data.grossSalePrice,
          },
          pricingConfig
        );
      }

      const priceFields = toProductPriceDbFields(resolvedPricing);

      // 3. Prepare data for SQL with explicit field mapping
      const sanitizedData: any = {
        name: data.name || data.titleDe || data.titleEn || "Unbenanntes Produkt",
        sku: data.sku,
        type: data.type || "WATCH",
        condition: data.condition || data.conditionDe || "PRE_OWNED",
        descriptionDe: data.descriptionDe || data.description || "",
        descriptionEn: data.descriptionEn || "",
        titleDe: data.titleDe || data.name || "",
        titleEn: data.titleEn || data.name || "",
        conditionDe: data.conditionDe || "",
        conditionEn: data.conditionEn || "",
        specificationsDe: data.specificationsDe || data.specificationsText || "",
        specificationsEn: data.specificationsEn || data.specificationsText || "",
        scopeOfDeliveryDe: data.scopeOfDeliveryDe || data.scopeOfDelivery || "",
        scopeOfDeliveryEn: data.scopeOfDeliveryEn || data.scopeOfDelivery || "",
        price: priceFields.price,
        pricingModel: priceFields.pricingModel,
        basePrice: priceFields.basePrice,
        fixedSalePrice: priceFields.fixedSalePrice,
        calculatedStripePrice: priceFields.calculatedStripePrice,
        roundedShopPrice: priceFields.roundedShopPrice,
        bankTransferDiscount: priceFields.bankTransferDiscount,
        currency: data.currency || "EUR",
        status: data.status || "DRAFT",
        year: data.year,
        shortDescriptionDe: data.shortDescriptionDe,
        shortDescriptionEn: data.shortDescriptionEn,
        material: data.material,
        diameter: data.diameter,
        movement: data.movement,
        box: data.box ? data.box.toString() : null,
        papers: data.papers ? data.papers.toString() : null,
        specifications: typeof data.specifications === "object" && data.specifications !== null
          ? data.specifications
          : {},
        seoTitleDe: data.seoTitleDe,
        seoDescriptionDe: data.seoDescriptionDe,
        seoTitleEn: data.seoTitleEn,
        seoDescriptionEn: data.seoDescriptionEn,
        // Condition Details
        conditionGroup: data.conditionGroup,
        sourceCondition: data.sourceCondition,
        sourceRank: data.sourceRank,
        caseRank: data.caseRank,
        bandRank: data.bandRank,
        overallRank: data.overallRank,
        conditionRemarks: data.conditionRemarks,
        maintenancePerformed: data.maintenancePerformed ? data.maintenancePerformed.toString() : null,
        maintenanceDescription: data.maintenanceDescription,
        dailyRateDisplay: data.dailyRateDisplay,
        dailyRateSeconds: data.dailyRateSeconds ? data.dailyRateSeconds.toString() : null,
        // Calculation & Pricing
        purchasePrice: data.purchasePrice ? data.purchasePrice.toString() : null,
        purchaseCurrency: data.purchaseCurrency || "EUR",
        purchasePriceEur: data.purchasePriceEur ? data.purchasePriceEur.toString() : null,
        purchasePriceOriginal: data.purchasePriceOriginal ? data.purchasePriceOriginal.toString() : null,
        exchangeRate: data.exchangeRate ? data.exchangeRate.toString() : null,
        shippingCost: data.shippingCost ? data.shippingCost.toString() : null,
        insuranceCost: data.insuranceCost ? data.insuranceCost.toString() : null,
        customsRate: data.customsRate ? data.customsRate.toString() : null,
        customsRatePercent: data.customsRatePercent ? data.customsRatePercent.toString() : null,
        customsAmount: data.customsAmount ? data.customsAmount.toString() : null,
        customsAmountEur: data.customsAmountEur ? data.customsAmountEur.toString() : null,
        manualCustomsAmountEur: data.manualCustomsAmountEur ? data.manualCustomsAmountEur.toString() : null,
        importVatEur: data.importVatEur ? data.importVatEur.toString() : null,
        customsBrokerFee: data.customsBrokerFee ? data.customsBrokerFee.toString() : null,
        customsClearanceFee: data.customsClearanceFee ? data.customsClearanceFee.toString() : null,
        otherImportCosts: data.otherImportCosts ? data.otherImportCosts.toString() : null,
        landedCost: data.landedCost ? data.landedCost.toString() : null,
        netSalePrice: data.netSalePrice ? data.netSalePrice.toString() : null,
        grossSalePrice: data.grossSalePrice ? data.grossSalePrice.toString() : null,
        profitEur: data.profitEur ? data.profitEur.toString() : null,
        effectiveMarginPercent: data.effectiveMarginPercent ? data.effectiveMarginPercent.toString() : null,
        taxAmount: data.taxAmount ? data.taxAmount.toString() : null,
        taxRatePercent: data.taxRatePercent ? data.taxRatePercent.toString() : null,
        taxTreatment: data.taxTreatment || "MARGIN",
        hsCode: data.hsCode,
        originCountry: data.originCountry,
        dispatchCountry: data.dispatchCountry,
        destinationCountry: data.destinationCountry || "DE",
        margin: data.margin != null && data.margin !== "" ? String(data.margin).replace(",", ".") : null,
        stock: data.stock !== undefined ? parseInt(String(data.stock), 10) || 1 : 1,
        featuredInHero: data.featuredInHero === true || data.featuredInHero === "true",
        featuredInSport: data.featuredInSport === true || data.featuredInSport === "true",
        featuredInVintage: data.featuredInVintage === true || data.featuredInVintage === "true",
        featuredInUnder5000: data.featuredInUnder5000 === true || data.featuredInUnder5000 === "true",
        model: data.model || data.modelName,
        sourceUrl: data.sourceUrl || data.url,
        sourceProvider: data.sourceProvider,
        sourceProductId: data.sourceProductId,
        sourceVariantId: data.sourceVariantId,
        sourceData: (() => {
          const raw = data.source || data.sourceData || null;
          if (typeof raw === "string") {
            try { return JSON.parse(raw); } catch { return null; }
          }
          return raw;
        })(),
      };

      // Normalize numeric fields (reject NaN for PostgreSQL)
      const numericFields = [
        "price", "basePrice", "fixedSalePrice", "calculatedStripePrice", "roundedShopPrice", "bankTransferDiscount",
        "purchasePrice", "purchasePriceEur", "purchasePriceOriginal", "exchangeRate",
        "shippingCost", "insuranceCost", "customsRate", "customsRatePercent", "customsAmount",
        "customsAmountEur", "manualCustomsAmountEur", "importVatEur", "customsBrokerFee",
        "customsClearanceFee", "otherImportCosts", "landedCost", "netSalePrice", "grossSalePrice",
        "profitEur", "effectiveMarginPercent", "taxAmount", "taxRatePercent", "margin",
        "dailyRateSeconds",
      ] as const;

      for (const field of numericFields) {
        const raw = sanitizedData[field];
        if (raw === null || raw === undefined || raw === "") {
          if (field === "price" && !sanitizedData.price) sanitizedData.price = "0";
          continue;
        }
        const normalized = String(raw).replace(/\s/g, "").replace(",", ".");
        const n = parseFloat(normalized);
        if (!Number.isFinite(n)) {
          if (field === "price") sanitizedData.price = "0";
          else sanitizedData[field] = null;
        } else {
          sanitizedData[field] = n.toString();
        }
      }

      if (!sanitizedData.price) sanitizedData.price = "0";

      // Handle status and published
      const currentStatus = data.status || "DRAFT";
      if (currentStatus === "ACTIVE") {
        sanitizedData.publishedAt = new Date();
        sanitizedData.published = "true";
      } else {
        sanitizedData.published = "false";
      }

      // Handle Brand and Category lookup/creation
      if (data.brandName || data.brand) {
        const rawBrand = data.brandName || data.brand;
        let brandName = "";

        if (typeof rawBrand === "string") {
          brandName = rawBrand;
        } else if (rawBrand && typeof rawBrand === "object") {
          brandName = (rawBrand as any).name || (rawBrand as any).title || String(rawBrand);
        } else {
          brandName = String(rawBrand || "");
        }

        const brandId = await findOrCreateBrandId(brandName);
        if (brandId) sanitizedData.brandId = brandId;
      }

      if (data.categoryName || data.category) {
        const rawCat = data.categoryName || data.category;
        let catName = "";

        if (typeof rawCat === "string") {
          catName = rawCat;
        } else if (rawCat && typeof rawCat === "object") {
          catName = (rawCat as any).name || (rawCat as any).titleDe || (rawCat as any).titleEn || String(rawCat);
        } else {
          catName = String(rawCat || "");
        }

        const categoryId = await findOrCreateCategoryId(catName);
        if (categoryId) sanitizedData.categoryId = categoryId;
      }

      let existingProductBeforeUpdate: typeof products.$inferSelect | null = null;
      if (existingId) {
        const [prev] = await db.select().from(products).where(eq(products.id, existingId)).limit(1);
        existingProductBeforeUpdate = prev || null;
      }

      let sqlProduct;
      try {
        if (existingId) {
          console.log(`Updating existing product ${existingId}`);
          const [updated] = await db.update(products).set({
            ...sanitizedData,
            images: storedImages,
            mainImage: mainImage,
            updatedAt: new Date()
          }).where(eq(products.id, existingId)).returning();
          sqlProduct = updated;

          if (existingProductBeforeUpdate) {
            notifyWishlistAlerts({
              productId: updated.id,
              productName: updated.name || updated.titleDe || "Produkt",
              productSlug: updated.slug,
              oldPrice: existingProductBeforeUpdate.price,
              newPrice: updated.price,
              oldStock: existingProductBeforeUpdate.stock,
              newStock: updated.stock,
            }).catch((e) => console.error("Wishlist alerts failed", e));
          }
        } else {
          console.log(`Creating new product for SKU: ${sku}`);
          const [inserted] = await db.insert(products).values({
            ...sanitizedData,
            slug: data.slug || (sanitizedData.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()),
            images: storedImages,
            mainImage: mainImage,
            updatedAt: new Date()
          }).returning();
          sqlProduct = inserted;
        }
      } catch (sqlErr) {
        console.error("SQL Save Failed:", sqlErr);
        throw new Error(`Fehler beim Speichern in der SQL-Datenbank: ${sqlErr instanceof Error ? sqlErr.message : String(sqlErr)}`);
      }

      // 4. Save to Firestore (Real-time source)
      let productRef;
      if (adminDb) {
        try {
          const firestoreData = {
            ...data,
            ...sanitizedData,
            images: storedImages,
            mainImage,
            sqlId: sqlProduct.id,
            published: sanitizedData.published === "true",
            updatedAt: new Date().toISOString()
          };
          // Remove internal fields
          delete (firestoreData as any).overwrite;

          const snapshot = await adminDb.collection("products").where("sqlId", "==", sqlProduct.id).get();
          if (!snapshot.empty) {
            productRef = snapshot.docs[0].ref;
            await productRef.update(firestoreData);
            console.log(`Updated Firestore document for product ${sqlProduct.id}`);
          } else {
            productRef = await adminDb.collection("products").add({
              ...firestoreData,
              createdAt: new Date().toISOString()
            });
            console.log(`Created new Firestore document for product ${sqlProduct.id}`);
          }

          // 5. Update ProductMedia subcollection
          if (productRef) {
            console.log(`Updating ProductMedia for document: ${productRef.id}`);
            const mediaSnapshot = await productRef.collection("media").get();
            const deletePromises = mediaSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);

            const mediaPromises = mediaRecords.map((media) =>
              productRef.collection("media").add({
                ...media,
                productId: productRef.id,
              })
            );
            await Promise.all(mediaPromises);
          }
        } catch (fsErr: any) {
          console.error("Firestore Save Failed (Non-blocking):", fsErr);
          if (fsErr.code === 7 || fsErr.message?.includes('PERMISSION_DENIED')) {
            console.warn("CRITICAL: Firestore Permission Denied. Please ensure the database is provisioned and the service account has access.");
          }
        }
      }

      try {
        const refreshed = await refreshCertificatesForProduct(sqlProduct.id, {
          uid: req.user!.uid,
          name: req.user!.name,
          email: req.user!.email,
        });
        if (refreshed > 0) {
          console.log(`Refreshed ${refreshed} certificate snapshot(s) for product ${sqlProduct.id}`);
        }
      } catch (certErr) {
        console.error("Certificate snapshot refresh after product save failed:", certErr);
      }

      const [enrichedRow] = await db
        .select({ product: products, brand: brands, category: categories })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, sqlProduct.id))
        .limit(1);

      const enrichedProduct = enrichedRow
        ? {
            ...enrichedRow.product,
            images: storedImages,
            mainImage,
            brand: enrichedRow.brand,
            category: enrichedRow.category,
            brandName: enrichedRow.brand?.name,
            categoryName: enrichedRow.category?.nameDe,
          }
        : { ...sqlProduct, images: storedImages, mainImage };

      res.status(existingId ? 200 : 201).json({
        id: enrichedProduct.id,
        sqlId: sqlProduct.id,
        firestoreId: productRef?.id,
        ...enrichedProduct,
      });
    } catch (error) {
      console.error("Failed to process product import", error);
      const message = error instanceof Error ? error.message : "Failed to process product import";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/admin/products/re-enrich", requireAuth, requireRole(["ADMIN"]), async (_req: AuthRequest, res) => {
    try {
      const rows = await db
        .select({ product: products, brand: brands })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id));

      let processed = 0;
      let updated = 0;
      const errors: { id: number; error: string }[] = [];

      for (const row of rows) {
        processed++;
        try {
          const resolved = reEnrichProductFields(row.product, row.brand?.name);
          const updatedFields = {
            ...resolvedContentToDbFields(resolved),
            updatedAt: new Date(),
          };

          await db.update(products).set(updatedFields).where(eq(products.id, row.product.id));

          if (adminDb) {
            try {
              const snapshot = await adminDb.collection("products").where("sqlId", "==", row.product.id).get();
              if (!snapshot.empty) {
                await snapshot.docs[0].ref.update({
                  ...updatedFields,
                  updatedAt: new Date().toISOString(),
                });
              }
            } catch (fsErr) {
              console.warn(`Firestore re-enrich sync failed for product ${row.product.id}:`, fsErr);
            }
          }

          updated++;
        } catch (err) {
          errors.push({
            id: row.product.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      res.json({ processed, updated, errors });
    } catch (error: unknown) {
      console.error("Bulk re-enrich failed:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Re-enrichment failed" });
    }
  });

  app.post("/api/admin/products/:id/retranslate", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid product ID" });

      const product = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (product.length === 0) return res.status(404).json({ error: "Product not found" });

      const sourceData = typeof product[0].sourceData === 'string' 
        ? JSON.parse(product[0].sourceData) 
        : product[0].sourceData;

      if (!sourceData) return res.status(400).json({ error: "No source data available for this product" });

      const { analyzeProductImport } = await import( "./src/lib/gemini.ts" );
      const analysis = await analyzeProductImport(sourceData);

      const updatedFields = {
        titleDe: analysis.contentDe.title,
        titleEn: analysis.contentEn.title,
        descriptionDe: analysis.contentDe.description,
        descriptionEn: analysis.contentEn.description,
        conditionDe: analysis.contentDe.conditionText,
        conditionEn: analysis.contentEn.conditionText,
        specificationsDe: analysis.contentDe.specificationsText,
        specificationsEn: analysis.contentEn.specificationsText,
        scopeOfDeliveryDe: analysis.contentDe.scopeOfDelivery,
        scopeOfDeliveryEn: analysis.contentEn.scopeOfDelivery,
        updatedAt: new Date()
      };

      const [updated] = await db.update(products).set(updatedFields).where(eq(products.id, id)).returning();

      // Sync to Firestore
      if (adminDb) {
        try {
          const snapshot = await adminDb.collection("products").where("sqlId", "==", id).get();
          if (!snapshot.empty) {
            await snapshot.docs[0].ref.update({
              ...updatedFields,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (fsErr) {
          console.warn("Firestore retranslate sync failed:", fsErr);
        }
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Retranslation failed:", error);
      res.status(500).json({ error: error.message || "Retranslation failed" });
    }
  });

  // --- Vite integration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/product/:slug", async (req, res, next) => {
      try {
        const rendered = await renderProductPage(req.params.slug, res);
        if (rendered) return;
      } catch (error) {
        console.error("Product prerender failed", error);
      }
      next();
    });
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Luxury Shop Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
