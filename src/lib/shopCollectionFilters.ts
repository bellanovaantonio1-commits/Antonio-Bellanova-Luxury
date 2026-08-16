import { eq, lte, type SQL } from "drizzle-orm";
import { products } from "../db/schema.ts";
import type { ShopCollectionSlug } from "../config/shopCollections.ts";
import type { Product } from "../types.ts";
import { shuffleOrder } from "./rotationQueue.ts";

/** Shop listing filters — used when opening /shop?collection=… */
export function getShopCollectionCondition(collection: ShopCollectionSlug): SQL {
  switch (collection) {
    case "sport":
      return eq(products.featuredInSport, true);
    case "vintage":
      return eq(products.conditionGroup, "VINTAGE");
    case "under-5000":
      return lte(products.price, "5000");
  }
}

/** Startseiten-Karten — nur explizit kuratierte Produkte */
export function getCuratedCollectionCondition(collection: ShopCollectionSlug): SQL {
  switch (collection) {
    case "sport":
      return eq(products.featuredInSport, true);
    case "vintage":
      return eq(products.featuredInVintage, true);
    case "under-5000":
      return eq(products.featuredInUnder5000, true);
  }
}

export function isShopCollectionSlug(value: string): value is ShopCollectionSlug {
  return value === "sport" || value === "vintage" || value === "under-5000";
}

export function productMatchesShopCollection(
  product: Product,
  collection: ShopCollectionSlug
): boolean {
  switch (collection) {
    case "sport":
      return product.featuredInSport === true;
    case "vintage":
      return product.conditionGroup === "VINTAGE";
    case "under-5000": {
      const price = Number.parseFloat(String(product.price ?? ""));
      return Number.isFinite(price) && price <= 5000;
    }
  }
}

export function pickUniqueCollectionPreviews(
  byCollection: Record<ShopCollectionSlug, Product[]>,
  slugs: readonly ShopCollectionSlug[],
  options?: { stable?: boolean }
): Record<ShopCollectionSlug, Product | null> {
  const result = Object.fromEntries(slugs.map((slug) => [slug, null])) as Record<
    ShopCollectionSlug,
    Product | null
  >;

  const usedIds = new Set<string>();
  const processingOrder = options?.stable
    ? [...slugs]
    : shuffleOrder(slugs.length).map((index) => slugs[index]);

  for (const slug of processingOrder) {
    const candidates = (byCollection[slug] ?? []).filter(
      (product) => !usedIds.has(String(product.id))
    );
    if (candidates.length === 0) continue;

    const pick = options?.stable
      ? candidates[0]
      : shuffleOrder(candidates.length).map((index) => candidates[index])[0];
    if (!pick) continue;

    result[slug] = pick;
    usedIds.add(String(pick.id));
  }

  return result;
}
