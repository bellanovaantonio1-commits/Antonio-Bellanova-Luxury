export async function fetchImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
  const trimmed = String(url || "").trim();
  if (!trimmed) return null;
  try {
    const response = await fetch(trimmed);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.startsWith("image/")) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function fetchImageBuffers(urls: string[]): Promise<Buffer[]> {
  const results = await Promise.all(urls.map((url) => fetchImageBuffer(url)));
  return results.filter((buf): buf is Buffer => buf != null);
}
