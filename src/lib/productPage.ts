import type { Product } from "../types.ts";
import type { ShopSettings } from "../contexts/ShopSettingsContext.tsx";
import type { SpecRow } from "./productDisplay.ts";

export type ProductAvailability = "available" | "reserved" | "sold" | "unavailable";

export interface ProductPricingQuote {
  shopPrice: number;
  bankTransferPrice: number;
  prepaymentDiscount: number;
  showBankTransferPrice: boolean;
  currency: string;
}

export interface ProductCertificateEligibility {
  eligible: boolean;
  messages?: {
    de: { title: string; subtitle: string; note: string };
    en: { title: string; subtitle: string; note: string };
  };
}

export interface PublicProductCertificate {
  certificateNumber: string;
  brand: string;
  model: string;
  referenceNumber: string;
  serialNumber: string;
  status: string;
  statusLabelDe: string;
  statusLabelEn: string;
  issuedAt: string | null;
  verificationCode: string;
  verifyUrl: string;
  pdfUrl: string;
}

export interface TrustFeature {
  id: string;
  labelDe: string;
  labelEn: string;
}

export function getProductAvailability(product: Pick<Product, "status" | "stock">): ProductAvailability {
  const status = String(product.status || "").toUpperCase();
  if (status === "SOLD") return "sold";
  if (status === "RESERVED") return "reserved";
  if (status === "ACTIVE" && (product.stock ?? 0) > 0) return "available";
  return "unavailable";
}

export function canPurchaseProduct(
  product: Pick<Product, "status" | "stock">,
  priceOnRequest: boolean
): boolean {
  return getProductAvailability(product) === "available" && !priceOnRequest;
}

export function formatProductPrice(
  amount: number,
  language: "de" | "en",
  currency = "EUR"
): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}

export function getProductPricingQuote(product: Product): ProductPricingQuote {
  const pricing = (product as Product & { pricing?: ProductPricingQuote }).pricing;
  const shopPrice = pricing?.shopPrice ?? (parseFloat(String(product.price || "0")) || 0);
  const bankTransferPrice = pricing?.bankTransferPrice ?? shopPrice;
  const prepaymentDiscount = pricing?.prepaymentDiscount ?? 0;
  const showBankTransferPrice = pricing?.showBankTransferPrice ?? false;

  return {
    shopPrice,
    bankTransferPrice,
    prepaymentDiscount,
    showBankTransferPrice,
    currency: pricing?.currency || product.currency || "EUR",
  };
}

export function buildTrustFeatures(
  shopSettings: ShopSettings,
  certificateEligible: boolean
): TrustFeature[] {
  const features: TrustFeature[] = [];

  if (shopSettings.authenticityNoteDe || shopSettings.authenticityNoteEn) {
    features.push({
      id: "original",
      labelDe: "100 % Original",
      labelEn: "100% Authentic",
    });
    features.push({
      id: "verified",
      labelDe: "Echtheit geprüft",
      labelEn: "Authenticity verified",
    });
  }

  if (certificateEligible || shopSettings.certificateNoteDe || shopSettings.certificateNoteEn) {
    features.push({
      id: "certificate",
      labelDe: certificateEligible ? "Echtheitszertifikat" : "Echtheitszertifikat auf Anfrage",
      labelEn: certificateEligible ? "Certificate of authenticity" : "Certificate available on request",
    });
    if (certificateEligible) {
      features.push({
        id: "certificate-verify",
        labelDe: "Digital verifizierbar",
        labelEn: "Digitally verifiable",
      });
    }
  }

  if (
    shopSettings.shippingCostDe ||
    shopSettings.shippingCostEu ||
    shopSettings.shippingCostWorld
  ) {
    features.push({
      id: "insured-shipping",
      labelDe: "Versicherter Versand",
      labelEn: "Insured shipping",
    });
  }

  const expressConfigured =
    parseFloat(shopSettings.shippingExpressCostDe || "0") > 0 ||
    parseFloat(shopSettings.shippingExpressCostEu || "0") > 0 ||
    parseFloat(shopSettings.shippingExpressCostWorld || "0") > 0;
  if (expressConfigured) {
    features.push({
      id: "express",
      labelDe: "24h Express",
      labelEn: "24h express",
    });
  }

  if (shopSettings.contactPhone || shopSettings.contactEmail || shopSettings.whatsappNumber) {
    features.push({
      id: "service",
      labelDe: "Persönlicher Service",
      labelEn: "Personal service",
    });
  }

  return features;
}

export function buildGalleryBadges(shopSettings: ShopSettings): { de: string; en: string }[] {
  const badges: { de: string; en: string }[] = [];
  if (shopSettings.authenticityNoteDe || shopSettings.authenticityNoteEn) {
    badges.push({ de: "100 % ORIGINAL", en: "100% AUTHENTIC" });
    badges.push({ de: "ECHTHEIT GEPRÜFT", en: "AUTHENTICITY VERIFIED" });
  }
  return badges;
}

export function getProductLocation(_product: Product, _shopSettings: ShopSettings, language: "de" | "en" = "de"): string {
  return language === "en" ? "Cologne" : "Köln";
}

export function buildDetailRows(
  product: Product,
  language: "de" | "en",
  specRows: SpecRow[],
  displayCondition: string,
  displayScope: string,
  shopSettings: ShopSettings
): SpecRow[] {
  const rows: SpecRow[] = [];
  const seen = new Set<string>();

  const add = (labelDe: string, labelEn: string, value?: string | null) => {
    const v = value?.trim();
    if (!v || v === "-" || v === "N/A") return;
    const label = language === "en" ? labelEn : labelDe;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ label, value: v });
  };

  add("Zustand", "Condition", displayCondition);
  add("Zustandsrang", "Condition rank", product.overallRank || product.sourceRank);
  add("Lieferumfang", "Scope of delivery", displayScope);
  add("Referenz", "Reference", product.sku);
  add("Modellnummer", "Model number", product.model);
  add("Werk", "Movement", product.movement);
  add("Gehäusegröße", "Case size", product.diameter);
  add("Gehäusematerial", "Case material", product.material);
  add("Herstellungsjahr", "Year of manufacture", product.year);

  add("Standort", "Location", getProductLocation(product, shopSettings, language));

  if (product.maintenanceDescription?.trim()) {
    add("Service", "Service", product.maintenanceDescription);
  } else if (product.maintenancePerformed?.trim()) {
    add("Service", "Service", product.maintenancePerformed);
  }

  for (const row of specRows) {
    const key = row.label.toLowerCase();
    if (seen.has(key)) continue;
    if (!row.value?.trim() || row.value === "-" || row.value === "N/A") continue;
    seen.add(key);
    rows.push(row);
  }

  return rows;
}

export function getCategoryBreadcrumb(product: Product, language: "de" | "en") {
  if (product.type === "JEWELRY") {
    return {
      label: language === "en" ? "Jewelry" : "Schmuck",
      path: "/shop?cat=jewelry",
    };
  }
  return {
    label: language === "en" ? "Watches" : "Uhren",
    path: "/shop?cat=watches",
  };
}

export function getDeliveryHint(
  availability: ProductAvailability,
  shopSettings: ShopSettings,
  language: "de" | "en"
): string | null {
  if (availability !== "available") return null;
  const freeFrom = parseFloat(shopSettings.shippingFreeFrom || "0");
  if (freeFrom > 0) {
    return language === "en"
      ? `Insured shipping · free from ${formatProductPrice(freeFrom, language)}`
      : `Versicherter Versand · frei ab ${formatProductPrice(freeFrom, language)}`;
  }
  const pickup = language === "en" ? shopSettings.pickupNoteEn : shopSettings.pickupNoteDe;
  if (pickup?.trim()) return pickup.trim();
  return language === "en" ? "Insured shipping available" : "Versicherter Versand verfügbar";
}
