import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { shopSettings } from "../db/schema.ts";
import { DEFAULT_SHOP_SETTINGS } from "../config/shopDefaults.ts";

/** Normalisiert jsonb-Werte aus shop_settings für API/Formulare. */
export function coerceShopSettingString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Wert für jsonb-Spalte — Arrays/Objekte als echtes JSON speichern. */
export function coerceShopSettingForDb(key: string, value: string): unknown {
  if (key === "paymentMethodsJson") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export async function getSettingsMap(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(shopSettings);
  const map: Record<string, unknown> = { ...DEFAULT_SHOP_SETTINGS };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function ensureDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SHOP_SETTINGS)) {
    const existing = await db.select().from(shopSettings).where(eq(shopSettings.key, key)).limit(1);
    if (existing.length === 0) {
      await db.insert(shopSettings).values({ key, value });
    }
  }
}
