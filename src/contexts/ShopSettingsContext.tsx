import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_SHOP_SETTINGS } from "../config/shopDefaults.ts";

export type ShopSettings = {
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
  instagramUrl: string;
  facebookUrl: string;
  whatsappNumber: string;
  googleMapsUrl: string;
};

function toSettings(raw: Record<string, unknown>): ShopSettings {
  const str = (key: keyof ShopSettings) => String(raw[key] ?? DEFAULT_SHOP_SETTINGS[key] ?? "");
  return {
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
    instagramUrl: str("instagramUrl"),
    facebookUrl: str("facebookUrl"),
    whatsappNumber: str("whatsappNumber"),
    googleMapsUrl: str("googleMapsUrl"),
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
