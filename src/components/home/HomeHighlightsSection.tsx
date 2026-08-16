import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { Product } from "../../types.ts";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { getProductImageUrl } from "../../lib/productImage.ts";
import { useProductWindowRotation } from "../../hooks/useProductWindowRotation.ts";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.ts";

interface HomeHighlightsSectionProps {
  products: Product[];
  loading?: boolean;
}

function getProductTitle(product: Product, language: string): string {
  return language === "en" && product.titleEn
    ? product.titleEn
    : product.titleDe || product.name;
}

export default function HomeHighlightsSection({ products, loading }: HomeHighlightsSectionProps) {
  const { language, t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();

  const { visibleItems, canRotate, cycle, goNext, goPrev } = useProductWindowRotation(products, {
    intervalMs: 60_000,
    autoRotate: !prefersReducedMotion,
  });

  const displayProducts =
    visibleItems.length >= Math.min(3, products.length)
      ? visibleItems
      : products.slice(0, Math.min(3, products.length));

  const fadeTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.65, ease: [0.4, 0, 0.2, 1] as const };

  useEffect(() => {
    products.forEach((product) => {
      const url = getProductImageUrl(product);
      if (!url) return;
      const img = new Image();
      img.src = url;
    });
  }, [products]);

  return (
    <section className="py-32 px-10 bg-[#050505]">
      <div className="max-w-7xl mx-auto space-y-24">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[#c5a059] text-[10px] tracking-[0.4em] uppercase font-bold mb-4 block">
              {t("home.highlights.subtitle")}
            </span>
            <h2 className="text-5xl font-serif tracking-tight">{t("home.highlights.title")}</h2>
          </div>
          <Link
            to="/shop"
            className="text-[10px] tracking-[0.3em] uppercase border-b border-white/20 pb-1 hover:text-[#c5a059] hover:border-[#c5a059] transition-all mb-2"
          >
            {t("home.highlights.view_all")}
          </Link>
        </div>

        <div className="relative">
          {canRotate && !loading && (
            <>
              <button
                type="button"
                aria-label={language === "en" ? "Previous highlights" : "Vorherige Highlights"}
                className="absolute -left-2 lg:-left-6 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-12 w-12 items-center justify-center border border-white/10 bg-black/40 hover:border-[#c5a059]/40 hover:bg-[#c5a059]/10 transition-colors"
                onClick={goPrev}
              />
              <button
                type="button"
                aria-label={language === "en" ? "Next highlights" : "Nächste Highlights"}
                className="absolute -right-2 lg:-right-6 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-12 w-12 items-center justify-center border border-white/10 bg-black/40 hover:border-[#c5a059]/40 hover:bg-[#c5a059]/10 transition-colors"
                onClick={goNext}
              />
            </>
          )}

          <div className="min-h-[28rem]">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-8">
                    <div className="aspect-[4/5] bg-[#0a0a0a]" />
                    <div className="h-6 bg-[#0a0a0a] w-3/4" />
                  </div>
                ))}
              </div>
            ) : displayProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                {displayProducts.map((product, slot) => (
                  <div key={`slot-${slot}`} className="min-h-[28rem]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${cycle}-${product.id}`}
                      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                      transition={fadeTransition}
                      whileHover={{ y: -10 }}
                      className="group space-y-8"
                    >
                      <Link to={`/product/${product.slug}`} className="block">
                        <div className="aspect-[4/5] bg-[#0a0a0a] relative overflow-hidden">
                          <img
                            src={getProductImageUrl(product) || "/collections/vintage.webp"}
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                            alt={getProductTitle(product, language)}
                            loading="lazy"
                            decoding="async"
                            width={800}
                            height={1000}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-8 left-8">
                            <span className="text-[9px] tracking-[0.3em] uppercase text-[#c5a059] font-bold">
                              Ref. {product.sku || "N/A"}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="space-y-3 min-h-[4.5rem]">
                        <Link to={`/product/${product.slug}`}>
                          <h3 className="text-2xl font-serif italic tracking-tight group-hover:text-[#c5a059] transition-colors line-clamp-2">
                            {getProductTitle(product, language)}
                          </h3>
                        </Link>
                        <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">
                          {product.brand?.name || "Antonio Bellanova"}
                        </p>
                      </div>
                    </motion.div>
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10">
                <p className="text-white/30 text-sm italic font-light">
                  {language === "en" ? "No current highlights available." : "Keine aktuellen Highlights verfügbar."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
