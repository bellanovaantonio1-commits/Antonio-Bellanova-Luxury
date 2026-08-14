/** Produkte, für die nach Zahlungseingang ein Echtheitszertifikat ausgestellt wird. */
export function isProductCertifiable(product: { type?: string | null }): boolean {
  const type = String(product.type || "").toUpperCase();
  return type === "WATCH" || type === "JEWELRY";
}
