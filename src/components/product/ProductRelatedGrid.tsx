import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { formatProductPrice } from "../../lib/productPage.ts";
import { getProductImageUrl } from "../../lib/productImage.ts";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../../lib/priceOnRequest.ts";
import type { Product } from "../../types.ts";
import type { ShopSettings } from "../../contexts/ShopSettingsContext.tsx";

interface ProductRelatedGridProps {
  products: Product[];
  shopSettings: ShopSettings;
}

export default function ProductRelatedGrid({ products, shopSettings }: ProductRelatedGridProps) {
  const { language, t } = useLanguage();
  const threshold = parsePriceOnRequestThreshold(shopSettings);

  if (products.length === 0) return null;

  return (
    <section className="mt-24 md:mt-32 border-t border-white/[0.06] pt-16 md:pt-20">
      <h2 className="text-2xl md:text-3xl font-serif mb-12 md:mb-14 italic font-light text-[#c5a059] tracking-tight">
        {t("product.similar")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
        {products.map((item) => {
          const title =
            language === "en" && item.titleEn ? item.titleEn : item.titleDe || item.name || "";
          const priceOnRequest = isPriceOnRequest(item.price, threshold);
          const imageUrl = getProductImageUrl(item);
          return (
            <Link key={item.id} to={`/product/${item.slug}`} className="group block space-y-4">
              <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden border border-white/[0.04]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] tracking-widest uppercase text-white/20">
                    {t("product.no_image")}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#c5a059] font-medium">
                  {item.brand?.name}
                </p>
                <h3 className="text-lg font-serif italic text-white/90 group-hover:text-[#c5a059] transition-colors line-clamp-2">
                  {title}
                </h3>
                <p className="text-sm text-white/45 font-light">
                  {priceOnRequest
                    ? t("product.price_on_request")
                    : formatProductPrice(parseFloat(item.price), language)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
