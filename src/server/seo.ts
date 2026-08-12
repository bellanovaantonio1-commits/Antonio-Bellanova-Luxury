import fs from "fs";
import path from "path";
import { buildProductJsonLd } from "../lib/productJsonLd.ts";

export { buildProductJsonLd };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function injectProductMeta(html: string, opts: {
  title: string;
  description: string;
  image?: string;
  url: string;
  jsonLd?: object;
}): string {
  const metaBlock = [
    `<title>${escapeHtml(opts.title)}</title>`,
    `<meta name="description" content="${escapeHtml(opts.description)}" />`,
    `<meta property="og:title" content="${escapeHtml(opts.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(opts.description)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:url" content="${escapeHtml(opts.url)}" />`,
    opts.image ? `<meta property="og:image" content="${escapeHtml(opts.image)}" />` : "",
    `<link rel="canonical" href="${escapeHtml(opts.url)}" />`,
    `<link rel="alternate" hreflang="de" href="${escapeHtml(opts.url)}" />`,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(opts.url)}?lang=en" />`,
    opts.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, metaBlock)
    .replace(/<meta name="description"[\s\S]*?\/>/i, "");
}

let cachedIndexHtml: string | null = null;

export function loadSpaIndexHtml(): string {
  if (cachedIndexHtml) return cachedIndexHtml;
  const distPath = path.join(process.cwd(), "dist", "index.html");
  const devPath = path.join(process.cwd(), "index.html");
  const filePath = fs.existsSync(distPath) ? distPath : devPath;
  cachedIndexHtml = fs.readFileSync(filePath, "utf-8");
  return cachedIndexHtml;
}

export { stripTags };
