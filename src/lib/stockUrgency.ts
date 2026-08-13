export function isLowStock(stock: number | null | undefined): boolean {
  return stock !== null && stock !== undefined && stock > 0 && stock <= 2;
}

export function stockUrgencyKey(stock: number | null | undefined): string | null {
  if (!isLowStock(stock)) return null;
  if (stock === 1) return "product.stock.last_one";
  return "product.stock.low";
}
