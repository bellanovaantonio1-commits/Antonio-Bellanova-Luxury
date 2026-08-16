import { isValidImageUrl, parseProductImages } from "../../lib/productImage.ts";
import type { CertificateSnapshot } from "./types.ts";

type ProductImageSource = {
  mainImage?: string | null;
  images?: unknown;
};

function addUnique(seen: Set<string>, out: string[], raw?: string | null) {
  const url = String(raw || "").trim();
  if (!url || seen.has(url)) return;
  seen.add(url);
  out.push(url);
}

/** All product image URLs (main first, then gallery, deduplicated). */
export function collectProductImageUrls(product: ProductImageSource): string[] {
  const gallery = parseProductImages(product.images);
  const seen = new Set<string>();
  const out: string[] = [];

  if (isValidImageUrl(product.mainImage)) {
    addUnique(seen, out, product.mainImage);
  }
  for (const url of gallery) addUnique(seen, out, url);

  return out;
}

/** Merge snapshot + optional live product data for display/PDF. */
export function getAllCertificateImageUrls(
  snap: Pick<CertificateSnapshot, "mainImage" | "images">,
  product?: ProductImageSource | null
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (raw?: string | null) => addUnique(seen, out, raw);

  for (const url of snap.images || []) add(url);
  add(snap.mainImage);

  if (product) {
    for (const url of collectProductImageUrls(product)) add(url);
  }

  return out;
}

export function applySnapshotImages(
  snap: CertificateSnapshot,
  product?: ProductImageSource | null
): CertificateSnapshot {
  const all = getAllCertificateImageUrls(snap, product);
  if (all.length === 0) return snap;
  return {
    ...snap,
    mainImage: all[0],
    images: all,
  };
}
