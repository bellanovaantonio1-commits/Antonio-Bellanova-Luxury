export type ShopCollectionSlug = "sport" | "vintage" | "under-5000";

export interface ShopCollectionDefinition {
  slug: ShopCollectionSlug;
  /** Bundled fallback — always served from /public, no external hotlink. */
  fallbackImage: string;
  labelKey: "shop.collections.sport" | "shop.collections.vintage" | "shop.collections.affordable";
  altDe: string;
  altEn: string;
}

export const SHOP_COLLECTIONS: ShopCollectionDefinition[] = [
  {
    slug: "sport",
    fallbackImage: "/collections/sport.webp",
    labelKey: "shop.collections.sport",
    altDe: "Sportliche Luxus-Chronograph Armbanduhr aus Edelstahl",
    altEn: "Luxury sports chronograph wristwatch in stainless steel",
  },
  {
    slug: "vintage",
    fallbackImage: "/collections/vintage.webp",
    labelKey: "shop.collections.vintage",
    altDe: "Vintage Luxusarmbanduhr mit Lederarmband und klassischem Zifferblatt",
    altEn: "Vintage luxury wristwatch with leather strap and classic dial",
  },
  {
    slug: "under-5000",
    fallbackImage: "/collections/under-5000.webp",
    labelKey: "shop.collections.affordable",
    altDe: "Elegante Luxusarmbanduhr bis 5.000 Euro",
    altEn: "Elegant luxury wristwatch under 5,000 euros",
  },
];

export function getCollectionBySlug(slug: string): ShopCollectionDefinition | undefined {
  return SHOP_COLLECTIONS.find((c) => c.slug === slug);
}
