export function buildProductJsonLd(
  product: {
    name: string;
    titleDe?: string | null;
    titleEn?: string | null;
    descriptionDe?: string | null;
    descriptionEn?: string | null;
    seoDescriptionDe?: string | null;
    price: string;
    sku?: string | null;
    slug: string;
    stock?: number | null;
    status?: string | null;
    images?: unknown;
    brand?: { name?: string | null } | null;
  },
  baseUrl: string,
  language: "de" | "en" = "de"
) {
  const images = Array.isArray(product.images) ? product.images : [];
  const title = language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name);
  const description = (
    language === "en"
      ? product.descriptionEn || product.seoDescriptionDe || title
      : product.descriptionDe || product.seoDescriptionDe || title
  )
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  return {
    "@type": "Product",
    name: title,
    description,
    sku: product.sku || undefined,
    image: images[0] || undefined,
    brand: product.brand?.name ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: "EUR",
      price: parseFloat(product.price).toFixed(2),
      availability:
        product.status === "ACTIVE" && (product.stock ?? 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };
}
