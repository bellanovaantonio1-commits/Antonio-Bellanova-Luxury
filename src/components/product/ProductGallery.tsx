import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { buildGalleryBadges } from "../../lib/productPage.ts";
import type { ShopSettings } from "../../contexts/ShopSettingsContext.tsx";

interface ProductGalleryProps {
  images: string[];
  displayTitle: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onOpenLightbox: () => void;
  isFavorited: boolean;
  onWishlist: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  stockBadge?: string | null;
  shopSettings: ShopSettings;
}

export default function ProductGallery({
  images,
  displayTitle,
  activeIndex,
  onActiveIndexChange,
  onOpenLightbox,
  isFavorited,
  onWishlist,
  onShare,
  stockBadge,
  shopSettings,
}: ProductGalleryProps) {
  const { language, t } = useLanguage();
  const badges = buildGalleryBadges(shopSettings);
  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[activeIndex] : null;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onActiveIndexChange(Math.max(0, activeIndex - 1));
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onActiveIndexChange(Math.min(images.length - 1, activeIndex + 1));
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <div
        className={`aspect-[4/5] bg-[#0a0a0a] overflow-hidden relative group border border-white/[0.06] ${
          hasImages ? "cursor-zoom-in" : ""
        }`}
        onClick={() => hasImages && onOpenLightbox()}
        role={hasImages ? "button" : undefined}
        tabIndex={hasImages ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasImages && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onOpenLightbox();
          }
        }}
        aria-label={hasImages ? `${displayTitle} — ${t("product.view_details")}` : undefined}
      >
        {currentImage ? (
          <motion.img
            key={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            src={currentImage}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
            alt={displayTitle}
            loading="eager"
            fetchPriority="high"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center px-8 text-center">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/25">{t("product.no_image")}</p>
          </div>
        )}

        {stockBadge && (
          <span className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-[#c5a059] text-[8px] tracking-[0.25em] uppercase px-3 py-1.5 border border-[#c5a059]/20">
            {stockBadge}
          </span>
        )}

        {badges.length > 0 && (
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none">
            {badges.map((badge) => (
              <span
                key={badge.de}
                className="text-[8px] tracking-[0.3em] uppercase text-white/70 bg-black/50 backdrop-blur-sm px-3 py-1 border border-white/10"
              >
                {language === "en" ? badge.en : badge.de}
              </span>
            ))}
          </div>
        )}

        <div className="absolute top-5 right-5 flex gap-2 z-10">
          <button
            type="button"
            onClick={onWishlist}
            aria-pressed={isFavorited}
            aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
            className={`p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 transition-colors ${
              isFavorited ? "text-[#c5a059]" : "text-white/80 hover:text-[#c5a059]"
            }`}
          >
            <Heart size={17} strokeWidth={1.5} fill={isFavorited ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share"
            className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:text-[#c5a059] transition-colors"
          >
            <Share2 size={17} strokeWidth={1.5} />
          </button>
        </div>

        {images.length > 1 && (
          <>
            {activeIndex > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 min-h-11 min-w-11 flex items-center justify-center bg-black/40 backdrop-blur-sm border border-white/10 text-white/60 hover:text-[#c5a059] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                aria-label="Previous image"
              >
                <ChevronLeft size={22} strokeWidth={1} />
              </button>
            )}
            {activeIndex < images.length - 1 && (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-h-11 min-w-11 flex items-center justify-center bg-black/40 backdrop-blur-sm border border-white/10 text-white/60 hover:text-[#c5a059] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                aria-label="Next image"
              >
                <ChevronRight size={22} strokeWidth={1} />
              </button>
            )}
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => onActiveIndexChange(idx)}
              aria-label={`Image ${idx + 1}`}
              aria-current={activeIndex === idx ? "true" : undefined}
              className={`aspect-[4/5] bg-[#0a0a0a] overflow-hidden border transition-all duration-300 ${
                activeIndex === idx
                  ? "border-[#c5a059] ring-1 ring-[#c5a059]/30"
                  : "border-white/[0.06] hover:border-white/20"
              }`}
            >
              <img
                src={img}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  activeIndex === idx ? "opacity-100" : "opacity-45 hover:opacity-80"
                }`}
                alt=""
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
