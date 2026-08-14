import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { getDeliveryHint, getProductAvailability } from "../../lib/productPage.ts";
import type { Product } from "../../types.ts";
import type { ShopSettings } from "../../contexts/ShopSettingsContext.tsx";

interface ProductStatusBadgeProps {
  product: Product;
  shopSettings: ShopSettings;
}

const STATUS_STYLES = {
  available: "text-emerald-400/90 border-emerald-500/20 bg-emerald-500/5",
  reserved: "text-amber-400/90 border-amber-500/20 bg-amber-500/5",
  sold: "text-white/40 border-white/10 bg-white/[0.02]",
  unavailable: "text-white/35 border-white/10 bg-white/[0.02]",
} as const;

export default function ProductStatusBadge({ product, shopSettings }: ProductStatusBadgeProps) {
  const { language, t } = useLanguage();
  const availability = getProductAvailability(product);
  const deliveryHint = getDeliveryHint(availability, shopSettings, language);

  const labelKey = {
    available: "product.status.available",
    reserved: "product.status.reserved",
    sold: "product.status.sold",
    unavailable: "product.status.unavailable",
  }[availability] as const;

  return (
    <div className="space-y-2">
      <div
        className={`inline-flex items-center px-4 py-2 border text-[10px] tracking-[0.3em] uppercase ${STATUS_STYLES[availability]}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-80" aria-hidden />
        {t(labelKey)}
      </div>
      {deliveryHint && (
        <p className="text-xs text-white/40 font-light leading-relaxed max-w-md">{deliveryHint}</p>
      )}
    </div>
  );
}
