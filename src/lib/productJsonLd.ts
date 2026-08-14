export function buildProductJsonLd(
  product: {
    name: string;
    titleDe?: string | null;
    titleEn?: string | null;
    descriptionDe?: string | null;
    descriptionEn?: string | null;
    seoDescriptionDe?: string | null;
    seoDescriptionEn?: string | null;
    price: string;
    sku?: string | null;
    model?: string | null;
    slug: string;
    stock?: number | null;
    status?: string | null;
    condition?: string | null;
    conditionDe?: string | null;
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
      ? product.descriptionEn || product.seoDescriptionEn || title
      : product.descriptionDe || product.seoDescriptionDe || title
  )
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  const conditionMap: Record<string, string> = {
    NEW: "https://schema.org/NewCondition",
    PRE_OWNED: "https://schema.org/UsedCondition",
    USED: "https://schema.org/UsedCondition",
  };
  const itemCondition =
    conditionMap[String(product.condition || "").toUpperCase()] ||
    (product.conditionDe || product.condition ? "https://schema.org/UsedCondition" : undefined);

  return {
    "@type": "Product",
    name: title,
    description,
    sku: product.sku || undefined,
    model: product.model || undefined,
    image: images[0] || undefined,
    brand: product.brand?.name ? { "@type": "Brand", name: product.brand.name } : undefined,
    itemCondition,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: "EUR",
      price: parseFloat(product.price).toFixed(2),
      availability:
        product.status === "ACTIVE" && (product.stock ?? 0) > 0
          ? "https://schema.org/InStock"
          : product.status === "RESERVED"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/OutOfStock",
    },
  };
}
