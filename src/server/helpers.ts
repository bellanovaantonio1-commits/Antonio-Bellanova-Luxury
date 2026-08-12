export { DEFAULT_SHOP_SETTINGS } from "../config/shopDefaults.ts";

export function generateOrderNumber(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${Date.now().toString().slice(-8)}-${suffix}`;
}
