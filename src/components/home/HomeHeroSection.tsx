import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { Product } from "../../types.ts";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { useShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import { getProductImageUrl } from "../../lib/productImage.ts";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../../lib/priceOnRequest.ts";
import { useHeroRotation } from "../../hooks/useHeroRotation.ts";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.ts";

interface HomeHeroSectionProps {
  products: Product[];
  loading?: boolean;
}

function getProductTitle(product: Product, language: string): string {
  return language === "en" && product.titleEn
    ? product.titleEn
    : product.titleDe || product.name;
}

function getProductCondition(product: Product, language: string): string {
  return language === "en"
    ? product.conditionEn || product.conditionDe || product.condition || ""
    : product.conditionDe || product.conditionEn || product.condition || "";
}

function splitHeroTitle(name: string): { line1: string; line2: string } {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length <= 2) {
    return { line1: name, line2: "" };
  }
  return {
    line1: parts.slice(0, 2).join(" "),
    line2: parts.slice(2).join(" "),
  };
}

export default function HomeHeroSection({ products, loading }: HomeHeroSectionProps) {
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();
  const priceOnRequestThreshold = parsePriceOnRequestThreshold(shopSettings);
  const prefersReducedMotion = usePrefersReducedMotion();

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const heroPanelRef = useRef<HTMLDivElement>(null);

  const isPaused = isHovered || isFocused;
  const autoRotate = !prefersReducedMotion;

  const { currentItem, activeIndex, canRotate, progress, goNext, goPrev, goTo } =
    useHeroRotation(products, { paused: isPaused, autoRotate });

  const fadeTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.85, ease: [0.4, 0, 0.2, 1] as const };

  const contentTransition = prefersReducedMotion
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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!canRotate || loading) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    },
    [canRotate, goNext, goPrev, loading]
  );

  const heroContent = useMemo(() => {
    if (!currentItem) return null;

    const title = getProductTitle(currentItem, language);
    const { line1, line2 } = splitHeroTitle(title);
    const condition = getProductCondition(currentItem, language);
    const priceOnRequest = isPriceOnRequest(currentItem.price, priceOnRequestThreshold);
    const formattedPrice = priceOnRequest
      ? t("product.price_on_request")
      : new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(parseFloat(currentItem.price));

    const brandName = currentItem.brand?.name || shopSettings.shopBrandName || "Antonio Bellanova";
    const reference = currentItem.sku?.trim() || null;

    return {
      key: String(currentItem.id),
      image: getProductImageUrl(currentItem) || "/collections/sport.webp",
      line1,
      line2,
      condition,
      formattedPrice,
      slug: currentItem.slug,
      brandName,
      reference,
      announceTitle: title,
    };
  }, [currentItem, language, priceOnRequestThreshold, shopSettings.shopBrandName, t]);

  return (
    <section className="relative h-screen flex overflow-hidden border-b border-white/10">
      <div
        ref={heroPanelRef}
        className="w-full lg:w-3/5 border-r border-white/10 relative p-12 flex flex-col justify-end outline-none"
        tabIndex={canRotate && !loading ? 0 : -1}
        role="region"
        aria-roledescription="carousel"
        aria-label={language === "en" ? "Featured products" : "Ausgewählte Produkte"}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          if (!heroPanelRef.current?.contains(event.relatedTarget as Node | null)) {
            setIsFocused(false);
          }
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />

        <div className="absolute inset-0 overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 bg-[#0a0a0a] animate-pulse opacity-30" />
          ) : (
            <AnimatePresence mode="sync">
              {heroContent && (
                <motion.div
                  key={`bg-${heroContent.key}`}
                  initial={{ opacity: prefersReducedMotion ? 0.3 : 0 }}
                  animate={{ opacity: 0.3 }}
                  exit={{ opacity: 0 }}
                  transition={fadeTransition}
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${heroContent.image}')` }}
                />
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-80 h-[500px] border border-white/20 rounded-full flex items-center justify-center">
            <div className="w-60 h-60 border border-[#c5a059]/40 rounded-full animate-pulse" />
          </div>
        </div>

        {canRotate && !loading && (
          <>
            <button
              type="button"
              aria-label={t("home.hero.previous")}
              className="absolute top-0 bottom-36 left-0 w-[18%] z-[25] cursor-w-resize bg-transparent border-0 p-0"
              onClick={goPrev}
            />
            <button
              type="button"
              aria-label={t("home.hero.next")}
              className="absolute top-0 bottom-36 right-0 w-[18%] z-[25] cursor-e-resize bg-transparent border-0 p-0"
              onClick={goNext}
            />
          </>
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {heroContent ? heroContent.announceTitle : ""}
        </div>

        <div className="relative z-20 pointer-events-none">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#c5a059] text-[10px] tracking-[0.4em] mb-4 uppercase font-bold"
          >
            {t("home.hero.subtitle")}
          </motion.p>

          {!loading && heroContent && (heroContent.brandName || heroContent.reference) ? (
            <AnimatePresence mode="wait">
              <motion.p
                key={`brand-${heroContent.key}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={contentTransition}
                className="text-[10px] tracking-[0.25em] uppercase text-white/45 mb-5"
              >
                {heroContent.brandName}
                {heroContent.reference ? (
                  <span className="text-white/25 before:content-['·'] before:mx-3">
                    {t("home.hero.ref")} {heroContent.reference}
                  </span>
                ) : null}
              </motion.p>
            </AnimatePresence>
          ) : null}

          <div className="min-h-[7.5rem] md:min-h-[9.5rem] mb-10">
            {loading ? (
              <div className="h-full flex flex-col justify-end gap-3">
                <div className="h-10 md:h-14 bg-white/5 animate-pulse w-4/5" />
                <div className="h-10 md:h-14 bg-white/5 animate-pulse w-3/5" />
              </div>
            ) : heroContent ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`title-${heroContent.key}`}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                  transition={contentTransition}
                >
                  <h2 className="text-white text-5xl md:text-7xl font-serif leading-[0.9] font-light">
                    {heroContent.line1}
                    {heroContent.line2 ? (
                      <>
                        <br />
                        <span className="italic">{heroContent.line2}</span>
                      </>
                    ) : null}
                  </h2>
                </motion.div>
              </AnimatePresence>
            ) : (
              <h2 className="text-white text-4xl md:text-5xl font-serif leading-tight font-light opacity-60">
                {language === "en" ? "Discover our collection" : "Entdecken Sie unsere Kollektion"}
              </h2>
            )}
          </div>

          <div className="min-h-[3.5rem]">
            {loading ? (
              <div className="flex flex-wrap items-center gap-10">
                <div className="h-10 w-32 bg-white/5 animate-pulse" />
                <div className="h-10 w-32 bg-white/5 animate-pulse" />
              </div>
            ) : heroContent ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`meta-${heroContent.key}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={contentTransition}
                  className="flex flex-wrap items-center gap-10"
                >
                  {heroContent.condition ? (
                    <div className="min-w-[8rem]">
                      <p className="text-[10px] opacity-40 tracking-widest uppercase mb-1">
                        {t("product.condition")}
                      </p>
                      <p className="text-sm tracking-wide line-clamp-2">{heroContent.condition}</p>
                    </div>
                  ) : null}
                  <div className="min-w-[8rem]">
                    <p className="text-[10px] opacity-40 tracking-widest uppercase mb-1">
                      {language === "en" ? "Price" : "Preis"}
                    </p>
                    <p className="text-sm tracking-wide font-serif italic underline underline-offset-8 decoration-white/20">
                      {heroContent.formattedPrice}
                    </p>
                  </div>
                  <Link
                    to={`/product/${heroContent.slug}`}
                    className="ml-auto h-14 px-10 border border-white/20 text-[10px] tracking-[0.3em] hover:bg-white hover:text-black transition-all uppercase flex items-center justify-center font-bold pointer-events-auto"
                  >
                    {t("home.hero.view_details")}
                  </Link>
                </motion.div>
              </AnimatePresence>
            ) : (
              <Link
                to="/shop"
                className="inline-flex h-14 px-10 border border-white/20 text-[10px] tracking-[0.3em] hover:bg-white hover:text-black transition-all uppercase items-center justify-center font-bold pointer-events-auto"
              >
                {language === "en" ? "Browse shop" : "Zum Shop"}
              </Link>
            )}
          </div>
        </div>

        {canRotate && !loading && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2">
              {products.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  aria-label={`${t("home.hero.show_product")}: ${getProductTitle(product, language)}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={() => goTo(index)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index === activeIndex
                      ? "w-6 bg-[#c5a059]"
                      : "w-1.5 bg-white/25 hover:bg-white/45"
                  }`}
                />
              ))}
            </div>

            {autoRotate && (
              <div
                className="w-24 h-px bg-white/10 overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-[#c5a059]/70 transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden lg:flex lg:w-2/5 flex-col">
        <div className="flex-1 border-b border-white/10 p-12">
          <p className="text-[10px] tracking-[0.3em] opacity-40 uppercase mb-10">
            {t("home.categories.title")}
          </p>
          <ul className="space-y-8">
            {[
              { name: t("home.categories.watches"), slug: "watches" },
              { name: t("home.categories.jewelry"), slug: "jewelry" },
            ].map((item) => (
              <li
                key={item.slug}
                className="group flex items-center justify-between cursor-pointer border-b border-transparent hover:border-[#c5a059]/50 pb-4 transition-all"
              >
                <Link
                  to={`/shop?cat=${item.slug}`}
                  className="text-3xl font-serif italic group-hover:pl-4 transition-all block w-full"
                >
                  {item.name}
                </Link>
                <span className="text-[10px] opacity-30 group-hover:opacity-100 transition-all tracking-widest uppercase">
                  {t("home.categories.explore")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="h-56 bg-[#0a0a0a] p-12 flex flex-col justify-center relative">
          <div className="absolute right-0 top-0 h-full w-1 bg-[#c5a059]" />
          <p className="text-[10px] tracking-[0.3em] text-[#c5a059] uppercase mb-3 font-bold">
            {t("home.service.title")}
          </p>
          <p className="text-sm leading-relaxed opacity-70 mb-6 font-light">
            {t("home.service.description")}
          </p>
          <div className="flex gap-8">
            <Link
              to="/termin"
              className="text-[11px] tracking-widest border-b border-[#c5a059] pb-0.5 hover:opacity-60 transition-opacity uppercase font-bold"
            >
              {t("home.service.book")}
            </Link>
            {shopSettings.googleMapsUrl ? (
              <a
                href={shopSettings.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] tracking-widest border-b border-white/20 pb-0.5 hover:opacity-60 transition-opacity uppercase font-light"
              >
                {t("home.service.directions")}
              </a>
            ) : (
              <span className="text-[11px] tracking-widest border-b border-white/20 pb-0.5 uppercase font-light opacity-50">
                {t("home.service.directions")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
