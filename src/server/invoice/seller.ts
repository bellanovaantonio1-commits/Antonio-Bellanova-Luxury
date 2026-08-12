import { DEFAULT_SHOP_SETTINGS } from "../../config/shopDefaults.ts";
import type { SellerSnapshot } from "./types.ts";
import { REQUIRED_INVOICE_SETTING_KEYS, RECOMMENDED_INVOICE_SETTING_KEYS } from "./types.ts";

export function buildSellerSnapshot(settings: Record<string, unknown>): SellerSnapshot {
  const str = (key: string) => String(settings[key] ?? DEFAULT_SHOP_SETTINGS[key as keyof typeof DEFAULT_SHOP_SETTINGS] ?? "").trim();
  return {
    legalCompanyName: str("legalCompanyName") || str("shopName"),
    shopBrandName: str("shopBrandName") || "Antonio Bellanova Luxury",
    address: str("contactAddress"),
    email: str("contactEmail"),
    phone: str("contactPhone"),
    vatId: str("vatId"),
    taxNumber: str("taxNumber"),
    bankName: str("bankName"),
    bankIban: str("bankIban"),
    bankBic: str("bankBic"),
    bankAccountHolder: str("bankAccountHolder"),
  };
}

export function getMissingInvoiceSettings(settings: Record<string, unknown>): {
  missingRequired: string[];
  missingRecommended: string[];
  emailConfigured: boolean;
} {
  const missingRequired = REQUIRED_INVOICE_SETTING_KEYS.filter((key) => {
    const val = String(settings[key] ?? DEFAULT_SHOP_SETTINGS[key as keyof typeof DEFAULT_SHOP_SETTINGS] ?? "").trim();
    return !val;
  });

  const hasVat = String(settings.vatId ?? DEFAULT_SHOP_SETTINGS.vatId ?? "").trim();
  const hasTax = String(settings.taxNumber ?? DEFAULT_SHOP_SETTINGS.taxNumber ?? "").trim();
  const missingRecommended =
    hasVat || hasTax ? [] : [...RECOMMENDED_INVOICE_SETTING_KEYS];

  return {
    missingRequired,
    missingRecommended,
    emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
  };
}

export function assertInvoiceSettingsReady(settings: Record<string, unknown>): void {
  const { missingRequired } = getMissingInvoiceSettings(settings);
  if (missingRequired.length > 0) {
    throw new Error(
      `Rechnungsstellung nicht möglich. Fehlende Pflichtangaben in den Einstellungen: ${missingRequired.join(", ")}`
    );
  }
}
