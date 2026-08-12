import { DEFAULT_SHOP_SETTINGS } from "../config/shopDefaults.ts";

export function parsePriceOnRequestThreshold(
  settings?: { priceOnRequestFrom?: string } | Record<string, string>
): number {
  const raw = settings?.priceOnRequestFrom ?? DEFAULT_SHOP_SETTINGS.priceOnRequestFrom ?? "10000";
  const n = parseFloat(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 10000;
}

export function isPriceOnRequest(price: number | string, threshold?: number): boolean {
  const p = typeof price === "string" ? parseFloat(price) : price;
  const t = threshold ?? parsePriceOnRequestThreshold();
  return Number.isFinite(p) && p >= t;
}
