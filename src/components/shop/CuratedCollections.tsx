import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { SHOP_COLLECTIONS, type ShopCollectionSlug } from "../../config/shopCollections.ts";
import { getProductImageUrl, isValidImageUrl } from "../../lib/productImage.ts";
import type { Product } from "../../types.ts";

type CollectionImageState = Record<ShopCollectionSlug, string>;

function buildInitialImages(): CollectionImageState {
  return Object.fromEntries(
    SHOP_COLLECTIONS.map((c) => [c.slug, c.fallbackImage])
  ) as CollectionImageState;
}

export default function CuratedCollections() {
  const { language, t } = useLanguage();
  const [images, setImages] = useState<CollectionImageState>(buildInitialImages);

  useEffect(() => {
    let cancelled = false;

    async function loadCollectionPreviews() {
      const entries = await Promise.all(
        SHOP_COLLECTIONS.map(async (collection) => {
          try {
            const res = await fetch(
              `/api/products?collection=${collection.slug}&limit=1`
            );
            if (!res.ok) return [collection.slug, collection.fallbackImage] as const;

            const products: Product[] = await res.json();
            const preview = products[0];
            const productImage = getProductImageUrl(preview);

            if (productImage && isValidImageUrl(productImage)) {
              return [collection.slug, productImage] as const;
            }
          } catch {
            /* keep bundled fallback */
          }
          return [collection.slug, collection.fallbackImage] as const;
        })
      );

      if (cancelled) return;
      setImages(Object.fromEntries(entries) as CollectionImageState);
    }

    loadCollectionPreviews();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleImageError = (slug: ShopCollectionSlug) => {
    const fallback = SHOP_COLLECTIONS.find((c) => c.slug === slug)?.fallbackImage;
    if (fallback) {
      setImages((prev) =>
        prev[slug] === fallback ? prev : { ...prev, [slug]: fallback }
      );
    }
  };

  return (
    <section className="py-20 md:py-28 px-5 sm:px-10 border-b border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12 md:mb-16 space-y-3">
          <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">
            {t("home.collections.title")}
          </p>
          <h2 className="text-3xl md:text-4xl font-serif italic font-light text-white/90">
            {t("shop.collections.title")}
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-10">
          {SHOP_COLLECTIONS.map((collection) => {
            const label = t(collection.labelKey);
            const alt = language === "en" ? collection.altEn : collection.altDe;
            const src = images[collection.slug] || collection.fallbackImage;

            return (
              <Link
                key={collection.slug}
                to={`/shop?collection=${collection.slug}`}
                className="group flex flex-col gap-5 md:gap-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]/60 rounded-2xl"
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)]">
                  <img
                    src={src}
                    alt={alt}
                    width={800}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03] group-active:scale-[1.01]"
                    onError={() => handleImageError(collection.slug)}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>

                <div className="space-y-2 px-1">
                  <h3 className="text-2xl md:text-[1.75rem] font-serif italic text-white transition-colors duration-300 group-hover:text-[#c5a059]">
                    {label}
                  </h3>
                  <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-bold text-white/40 transition-colors duration-300 group-hover:text-[#c5a059]">
                    {t("home.categories.explore")}
                    <ArrowRight
                      size={12}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
