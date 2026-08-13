import type { Product } from "../types.ts";

/** Returns true when the value is a usable image URL or site-local path. */
export function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url || url === "?" || url === "null" || url === "undefined") return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
  );
}

/** Safely parse product images from API (array or JSON string). */
export function parseProductImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter(isValidImageUrl);
  }
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.filter(isValidImageUrl) : [];
    } catch {
      return isValidImageUrl(images) ? [images] : [];
    }
  }
  return [];
}

/** Best available product image: mainImage first, then first gallery image. */
export function getProductImageUrl(
  product: Pick<Product, "mainImage" | "images"> | null | undefined
): string | null {
  if (!product) return null;
  if (isValidImageUrl(product.mainImage)) return product.mainImage.trim();
  const fromGallery = parseProductImages(product.images)[0];
  return fromGallery ?? null;
}
