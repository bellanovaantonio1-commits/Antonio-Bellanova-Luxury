import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { brands, categories, products } from "../../db/schema.ts";
import type { CertificateSnapshot } from "./types.ts";
import { displayOrNotSpecified, resolvePublicCondition } from "./conditionPublic.ts";

function pickSpec(specs: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = specs[key];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return "";
}

function parseSpecs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function parseAdditionalImages(product: typeof products.$inferSelect): string[] {
  const main = String(product.mainImage || "").trim();
  const raw = Array.isArray(product.images) ? product.images : [];
  const seen = new Set<string>();
  const additional: string[] = [];

  for (const entry of raw) {
    const url = String(entry || "").trim();
    if (!url || url === main || seen.has(url)) continue;
    seen.add(url);
    additional.push(url);
  }

  return additional;
}

function resolveReference(product: typeof products.$inferSelect, specs: Record<string, unknown>): string {
  const sku = String(product.sku || "").trim();
  if (sku) return sku;
  const model = String(product.model || "").trim();
  if (model) return model;
  return pickSpec(specs, "Reference", "Ref No.", "Product Number", "Product No.", "Referenz");
}

export async function buildProductSnapshot(
  productId: number,
  _language: "de" | "en" = "de"
): Promise<CertificateSnapshot> {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produkt nicht gefunden.");

  let brandName = "";
  if (product.brandId) {
    const [brand] = await db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1);
    brandName = brand?.name || "";
  }

  let categoryNameDe = "";
  let categoryNameEn = "";
  if (product.categoryId) {
    const [cat] = await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1);
    categoryNameDe = cat?.nameDe || "";
    categoryNameEn = cat?.nameEn || cat?.nameDe || "";
  }

  const specs = parseSpecs(product.specifications);
  const serialNumber = pickSpec(
    specs,
    "Serial Number",
    "Serial No.",
    "Serial",
    "Seriennummer",
    "Serial number"
  );

  const dial = pickSpec(specs, "Dial Color", "Dial", "Zifferblatt");
  const bracelet = pickSpec(specs, "Bracelet", "Band", "Armband", "Strap");
  const clasp = pickSpec(specs, "Clasp", "Buckle", "Schließe");
  const waterResistance = pickSpec(specs, "Water Resistance", "Waterproof", "Wasserdichtigkeit");

  const scopeDe = String(product.scopeOfDeliveryDe || "").trim();
  const scopeEn = String(product.scopeOfDeliveryEn || scopeDe).trim();

  return {
    brand: displayOrNotSpecified(brandName, "de"),
    model: displayOrNotSpecified(product.model || product.name, "de"),
    referenceNumber: displayOrNotSpecified(resolveReference(product, specs), "de"),
    serialNumber: displayOrNotSpecified(serialNumber, "de"),
    category: displayOrNotSpecified(categoryNameDe, "de"),
    movement: displayOrNotSpecified(product.movement || pickSpec(specs, "Movement", "Caliber", "Werk"), "de"),
    caseMaterial: displayOrNotSpecified(product.material || pickSpec(specs, "Case Material", "Material", "Gehäuse"), "de"),
    caseSize: displayOrNotSpecified(product.diameter || pickSpec(specs, "Case Size", "Diameter", "Gehäusegröße"), "de"),
    dial: displayOrNotSpecified(dial, "de"),
    bracelet: displayOrNotSpecified(bracelet, "de"),
    clasp: displayOrNotSpecified(clasp, "de"),
    waterResistance: displayOrNotSpecified(waterResistance, "de"),
    year: displayOrNotSpecified(product.year, "de"),
    conditionPublicDe: resolvePublicCondition(product, "de"),
    conditionPublicEn: resolvePublicCondition(product, "en"),
    scopeOfDeliveryDe: scopeDe || displayOrNotSpecified("", "de"),
    scopeOfDeliveryEn: scopeEn || displayOrNotSpecified("", "en"),
    box: displayOrNotSpecified(product.box, "de"),
    papers: displayOrNotSpecified(product.papers, "de"),
    mainImage: String(product.mainImage || "").trim(),
    images: parseAdditionalImages(product),
    productName: String(product.name || "").trim(),
    productSku: String(product.sku || "").trim(),
  };
}

function resolveLocation(language: "de" | "en"): string {
  return language === "en" ? "Cologne" : "Köln";
}

export async function buildOrderCertificateSnapshot(
  productId: number,
  order: { id: number; orderNumber?: string | null; paidAt?: Date | null; createdAt?: Date | null },
  language: "de" | "en" = "de"
): Promise<CertificateSnapshot> {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produkt nicht gefunden.");

  const base = await buildProductSnapshot(productId, language);
  const purchaseDate = order.paidAt?.toISOString() || order.createdAt?.toISOString() || new Date().toISOString();
  const now = new Date().toISOString();

  return {
    ...base,
    orderNumber: order.orderNumber || `ORD-${order.id}`,
    purchaseDate,
    certificateDate: now,
    paymentStatus: "PAID",
    location: displayOrNotSpecified(resolveLocation(language), language),
  };
}

export function snapshotFromStored(raw: unknown): CertificateSnapshot {
  if (!raw || typeof raw !== "object") {
    throw new Error("Ungültiger Zertifikats-Snapshot.");
  }
  return raw as CertificateSnapshot;
}
