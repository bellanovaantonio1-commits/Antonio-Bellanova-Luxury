import { MessageSquare, MessageCircle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { canPurchaseProduct } from "../../lib/productPage.ts";
import type { Product } from "../../types.ts";

interface ProductActionsProps {
  product: Product;
  priceOnRequest: boolean;
  onAddToCart: () => void;
  onReserve: () => void;
  whatsappUrl: string;
  layout?: "stack" | "inline";
}

export default function ProductActions({
  product,
  priceOnRequest,
  onAddToCart,
  onReserve,
  whatsappUrl,
  layout = "stack",
}: ProductActionsProps) {
  const { t } = useLanguage();
  const canBuy = canPurchaseProduct(product, priceOnRequest);
  const isReserved = String(product.status || "").toUpperCase() === "RESERVED";
  const isSold = String(product.status || "").toUpperCase() === "SOLD";

  const stackClass = layout === "stack" ? "flex flex-col gap-3" : "flex flex-wrap gap-3";

  return (
    <div className={stackClass}>
      {canBuy && (
        <button
          type="button"
          onClick={onAddToCart}
          className="w-full bg-white text-black py-5 md:py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all duration-300 hover:bg-[#c5a059] hover:text-white"
        >
          {t("product.add_to_cart")}
        </button>
      )}

      {!isSold && (
        <button
          type="button"
          onClick={onReserve}
          className={`w-full border border-[#c5a059]/35 text-[#c5a059] hover:bg-[#c5a059] hover:text-black py-5 md:py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all duration-300 flex items-center justify-center gap-3 ${
            !canBuy || priceOnRequest || isReserved ? "bg-[#c5a059]/[0.06]" : ""
          }`}
        >
          <MessageSquare size={16} strokeWidth={1.5} />
          {t("product.reserve.button")}
        </button>
      )}

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full border border-white/15 text-white/80 hover:border-green-600/40 hover:text-green-400 hover:bg-green-950/20 py-5 md:py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all duration-300 flex items-center justify-center gap-3"
      >
        <MessageCircle size={16} strokeWidth={1.5} />
        {t("product.whatsapp")}
      </a>
    </div>
  );
}
