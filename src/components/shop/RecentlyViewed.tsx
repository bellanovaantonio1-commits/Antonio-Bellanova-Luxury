import { Link } from "react-router-dom";
import { useRecentlyViewed } from "../../contexts/RecentlyViewedContext.tsx";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { useShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../../lib/priceOnRequest.ts";

interface RecentlyViewedProps {
  excludeSlug?: string;
}

export default function RecentlyViewed({ excludeSlug }: RecentlyViewedProps) {
  const { items } = useRecentlyViewed();
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();
  const threshold = parsePriceOnRequestThreshold(shopSettings);

  const visible = items.filter((i) => i.slug !== excludeSlug).slice(0, 4);
  if (visible.length === 0) return null;

  const formatPrice = (price: string) =>
    isPriceOnRequest(price, threshold)
      ? t("product.price_on_request")
      : new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(price));

  return (
    <div className="mt-32 border-t border-white/10 pt-20">
      <h2 className="text-3xl font-serif mb-12 italic font-light text-[#c5a059]">{t("shop.recently_viewed")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {visible.map((item) => (
          <Link key={item.slug} to={`/product/${item.slug}`} className="group space-y-3">
            <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden">
              <img
                src={item.image || ""}
                alt={item.title}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div>
              {item.brand && <p className="text-[9px] tracking-widest uppercase text-[#c5a059] font-bold">{item.brand}</p>}
              <h3 className="text-sm font-serif italic group-hover:text-[#c5a059] transition-colors line-clamp-2">{item.title}</h3>
              <p className="text-xs text-white/50 mt-1">{formatPrice(item.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
