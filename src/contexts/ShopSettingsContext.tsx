import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_SHOP_SETTINGS } from "../config/shopDefaults.ts";

export type ShopSettings = {
  legalCompanyName: string;
  shopBrandName: string;
  shopName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  bankName: string;
  bankIban: string;
  bankBic: string;
  bankAccountHolder: string;
  paymentInstructionsDe: string;
  paymentInstructionsEn: string;
  vatId: string;
  taxNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  whatsappNumber: string;
  googleMapsUrl: string;
  authenticityNoteDe: string;
  authenticityNoteEn: string;
  marginTaxNoteDe: string;
  marginTaxNoteEn: string;
  shippingCostDe: string;
  shippingCostEu: string;
  shippingCostWorld: string;
  shippingFreeFrom: string;
  priceOnRequestFrom: string;
  stripeFeePercent: string;
  stripeFeeFixed: string;
  roundingStep: string;
  roundingMode: string;
  defaultPricingModel: string;
  bankTransferEnabled: string;
  prepaymentEnabled: string;
  stripeEnabled: string;
  shippingExpressCostDe: string;
  shippingExpressCostEu: string;
  shippingExpressCostWorld: string;
  pickupNoteDe: string;
  pickupNoteEn: string;
  certificateNoteDe: string;
  certificateNoteEn: string;
  testimonial1De: string;
  testimonial1En: string;
  testimonial1Author: string;
};

function toSettings(raw: Record<string, unknown>): ShopSettings {
  const str = (key: keyof ShopSettings) => String(raw[key] ?? DEFAULT_SHOP_SETTINGS[key] ?? "");
  return {
    legalCompanyName: str("legalCompanyName"),
    shopBrandName: str("shopBrandName"),
    shopName: str("shopName"),
    contactEmail: str("contactEmail"),
    contactPhone: str("contactPhone"),
    contactAddress: str("contactAddress"),
    bankName: str("bankName"),
    bankIban: str("bankIban"),
    bankBic: str("bankBic"),
    bankAccountHolder: str("bankAccountHolder"),
    paymentInstructionsDe: str("paymentInstructionsDe"),
    paymentInstructionsEn: str("paymentInstructionsEn"),
    vatId: str("vatId"),
    taxNumber: str("taxNumber"),
    instagramUrl: str("instagramUrl"),
    facebookUrl: str("facebookUrl"),
    whatsappNumber: str("whatsappNumber"),
    googleMapsUrl: str("googleMapsUrl"),
    authenticityNoteDe: str("authenticityNoteDe"),
    authenticityNoteEn: str("authenticityNoteEn"),
    marginTaxNoteDe: str("marginTaxNoteDe"),
    marginTaxNoteEn: str("marginTaxNoteEn"),
    shippingCostDe: str("shippingCostDe"),
    shippingCostEu: str("shippingCostEu"),
    shippingCostWorld: str("shippingCostWorld"),
    shippingFreeFrom: str("shippingFreeFrom"),
    priceOnRequestFrom: str("priceOnRequestFrom"),
    stripeFeePercent: str("stripeFeePercent"),
    stripeFeeFixed: str("stripeFeeFixed"),
    roundingStep: str("roundingStep"),
    roundingMode: str("roundingMode"),
    defaultPricingModel: str("defaultPricingModel"),
    bankTransferEnabled: str("bankTransferEnabled"),
    prepaymentEnabled: str("prepaymentEnabled"),
    stripeEnabled: str("stripeEnabled"),
    shippingExpressCostDe: str("shippingExpressCostDe"),
    shippingExpressCostEu: str("shippingExpressCostEu"),
    shippingExpressCostWorld: str("shippingExpressCostWorld"),
    pickupNoteDe: str("pickupNoteDe"),
    pickupNoteEn: str("pickupNoteEn"),
    certificateNoteDe: str("certificateNoteDe"),
    certificateNoteEn: str("certificateNoteEn"),
    testimonial1De: str("testimonial1De"),
    testimonial1En: str("testimonial1En"),
    testimonial1Author: str("testimonial1Author"),
  };
}

const ShopSettingsContext = createContext<{
  settings: ShopSettings;
  reload: () => void;
}>({
  settings: toSettings(DEFAULT_SHOP_SETTINGS),
  reload: () => {},
});

export function ShopSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>(toSettings(DEFAULT_SHOP_SETTINGS));

  const reload = () => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSettings(toSettings(data));
      })
      .catch(() => {});
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <ShopSettingsContext.Provider value={{ settings, reload }}>{children}</ShopSettingsContext.Provider>
  );
}

export function useShopSettings() {
  return useContext(ShopSettingsContext).settings;
}

export function useReloadShopSettings() {
  return useContext(ShopSettingsContext).reload;
}

/** Split "Line1\nLine2" for footer/contact display */
export function formatAddressLines(address: string): string[] {
  return address
    .split(/\n|<br\s*\/?>/i)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Normalize phone for wa.me / tel links (digits only, DE country code) */
export function normalizePhoneForLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "49" + digits.slice(1);
  return digits;
}
