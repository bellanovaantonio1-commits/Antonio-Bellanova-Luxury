/** Collect unique certificate image URLs from snapshot fields (old + new format). */
export function getCertificateDisplayImages(snapshot: {
  mainImage?: string | null;
  images?: string[] | null;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (raw?: string | null) => {
    const url = String(raw || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  for (const url of snapshot.images || []) add(url);
  add(snapshot.mainImage);

  return out;
}
