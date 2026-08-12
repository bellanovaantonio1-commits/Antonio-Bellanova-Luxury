import { useEffect } from "react";

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export default function MetaTags({ title, description, image }: MetaTagsProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Antonio Bellanova Luxury` : "Antonio Bellanova Luxury — Exklusive Uhren & Schmuck";
    const desc = description || "Exklusive Luxusuhren und Schmuck in Köln. Rolex, Patek Philippe, Cartier und mehr — zertifiziert und persönlich beraten.";
    document.title = fullTitle;
    setMeta("description", desc);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "website", true);
    if (image) setMeta("og:image", image, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
  }, [title, description, image]);
  return null;
}
