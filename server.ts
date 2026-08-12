import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

// ES Module path resolution (with fallback for CJS)
const __filename = fileURLToPath(import.meta.url || `file://${process.cwd()}/server.ts`);
const __dirname = path.dirname(__filename);

import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";
import { adminAuth, adminDb, adminStorage, FieldValue } from "./src/lib/firebase-admin.ts";
import firebaseConfig from "./firebase-applet-config.json";
import { db } from "./src/db/index.ts";
import { users, products, categories, brands } from "./src/db/schema.ts";
import { eq, or, like, and, sql, desc, gt, inArray } from "drizzle-orm";
import { importService } from "./src/services/import/ImportService.ts";
import { imageStorageService } from "./src/services/import/ImageStorageService.ts";


import { registerExtraRoutes } from "./src/server/extraRoutes.ts";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // --- API Routes ---
  // Auth & Sync
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      console.log("Syncing user to SQL & Firestore:", req.user!.uid);
      
      const email = req.user!.email!;
      const isAdminEmail = email === "antoniobellanova1812@gmail.com";
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

      res.json(userData);
    } catch (error: any) {
      console.error("Sync failed:", error);
      res.status(500).json({ error: "Sync failed" });
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
  app.get("/api/products", async (req, res) => {
    try {
      const { cat, all, limit: limitParam } = req.query;
      console.log("Querying SQL products. Cat:", cat, "All:", all);
      
      let conditions: any[] = [];
      
      // If not "all" (admin view), only show ACTIVE products with stock
      if (all !== "true") {
        conditions.push(inArray(products.status, ["ACTIVE"]));
        conditions.push(gt(products.stock, 0));
      }
      
      if (cat === "watches") {
        conditions.push(eq(products.type, "WATCH"));
      } else if (cat === "jewelry") {
        conditions.push(eq(products.type, "JEWELRY"));
      } else if (cat === "new") {
        // Neuheiten: newest active products (no extra type filter)
      }

      let query = db.select({
        product: products,
        brand: brands,
        category: categories
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt));

      if (limitParam) {
        query = query.limit(parseInt(limitParam as string)) as typeof query;
      }

      const allProducts = await query;

      console.log(`Found ${allProducts.length} products for customer view`);
      
      // Map to include brand/category structure for frontend compatibility
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
      const product = {
        ...item.product,
        images: Array.isArray(item.product.images) ? item.product.images : (typeof item.product.images === 'string' ? JSON.parse(item.product.images) : []),
        specifications: typeof item.product.specifications === 'string' ? JSON.parse(item.product.specifications) : (item.product.specifications || {}),
        brand: item.brand,
        category: item.category
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
      const searchQ = (req.query.q as string || "").toLowerCase();
      if (!searchQ) return res.json([]);

      const result = await db.select().from(products)
        .where(and(
          inArray(products.status, ["ACTIVE"]),
          or(
            like(sql`LOWER(${products.name})`, `%${searchQ}%`),
            like(sql`LOWER(${products.sku})`, `%${searchQ}%`),
            like(sql`LOWER(${products.descriptionDe})`, `%${searchQ}%`)
          )
        ));
      
      res.json(result);
    } catch (error) {
      console.error("Search failed", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  registerExtraRoutes(app);

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

      // 3. Delete from SQL
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

      // 3. Delete from SQL if we have an ID
      if (sqlId) {
        await db.delete(products).where(eq(products.id, sqlId));
        console.log(`Deleted SQL product ${sqlId}`);
      }

      res.json({ message: "Product and associated data deleted successfully" });
    } catch (error) {
      console.error("Failed to delete product", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.post("/api/admin/products", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      const sku = data.sku || "unknown";
      const sourceProvider = data.sourceProvider;
      const sourceProductId = data.sourceProductId;
      const sourceVariantId = data.sourceVariantId;
      
      // 1. Identify existing product by SKU or Source ID
      let existingId: number | null = null;
      let existingStatus: string | null = null;
      
      // Check by SKU first if available
      if (data.sku && data.sku !== "unknown") {
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

      const mediaRecords = imageResults.filter((r): r is any => r !== null).sort((a, b) => a.position - b.position);
      const storedImages = mediaRecords.map(m => m.storageUrl);
      const mainImage = mediaRecords.find(m => m.isPrimary)?.storageUrl || storedImages[0] || null;

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
        price: data.price ? data.price.toString() : (data.grossSalePrice ? data.grossSalePrice.toString() : "0"),
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
        specifications: data.specifications ? JSON.stringify(data.specifications) : JSON.stringify({}),
        // SEO
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
        margin: data.margin ? data.margin.toString() : null,
        stock: data.stock !== undefined ? parseInt(data.stock.toString()) : 1,
        model: data.model || data.modelName,
        sourceUrl: data.sourceUrl || data.url,
        sourceProvider: data.sourceProvider,
        sourceProductId: data.sourceProductId,
        sourceVariantId: data.sourceVariantId,
        sourceData: data.source ? JSON.stringify(data.source) : null,
      };

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
        
        if (typeof rawBrand === 'string') {
          brandName = rawBrand;
        } else if (rawBrand && typeof rawBrand === 'object') {
          brandName = (rawBrand as any).name || (rawBrand as any).title || String(rawBrand);
        } else {
          brandName = String(rawBrand || "");
        }
        
        brandName = brandName.trim();
        if (brandName) {
          let brand = await db.select().from(brands).where(eq(brands.name, brandName)).limit(1);
          if (brand.length === 0) {
            const [newBrand] = await db.insert(brands).values({
              name: brandName,
              slug: brandName.toLowerCase().replace(/\s+/g, "-")
            }).returning();
            sanitizedData.brandId = newBrand.id;
          } else {
            sanitizedData.brandId = brand[0].id;
          }
        }
      }

      if (data.categoryName || data.category) {
        const rawCat = data.categoryName || data.category;
        let catName = "";

        if (typeof rawCat === 'string') {
          catName = rawCat;
        } else if (rawCat && typeof rawCat === 'object') {
          catName = (rawCat as any).name || (rawCat as any).titleDe || (rawCat as any).titleEn || String(rawCat);
        } else {
          catName = String(rawCat || "");
        }

        catName = catName.trim();
        if (catName) {
          let category = await db.select().from(categories).where(eq(categories.nameDe, catName)).limit(1);
          if (category.length === 0) {
            const [newCat] = await db.insert(categories).values({
              nameDe: catName,
              slug: catName.toLowerCase().replace(/\s+/g, "-")
            }).returning();
            sanitizedData.categoryId = newCat.id;
          } else {
            sanitizedData.categoryId = category[0].id;
          }
        }
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
        } else {
          console.log(`Creating new product for SKU: ${sku}`);
          const [inserted] = await db.insert(products).values({
            ...sanitizedData,
            slug: data.slug || (sanitizedData.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()),
            images: storedImages,
            mainImage: mainImage,
            published: "true", // Set to true by default for new imports
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

            const mediaPromises = imageResults.filter((r): r is any => r !== null).map(media => 
              productRef.collection("media").add({
                ...media,
                productId: productRef.id
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

      res.status(existingId ? 200 : 201).json({ 
        id: productRef?.id || `sql-${sqlProduct.id}`, 
        sqlId: sqlProduct.id,
        ...sanitizedData
      });
    } catch (error) {
      console.error("Failed to process product import", error);
      res.status(500).json({ error: "Failed to process product import" });
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
