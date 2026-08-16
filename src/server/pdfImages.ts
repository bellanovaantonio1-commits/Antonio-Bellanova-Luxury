function resolveFetchUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) {
    const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    return `${base}${url}`;
  }
  return url;
}

export async function fetchImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
  const trimmed = String(url || "").trim();
  if (!trimmed) return null;
  try {
    const response = await fetch(resolveFetchUrl(trimmed));
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
