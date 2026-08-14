import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { canPurchaseProduct, formatProductPrice, getProductPricingQuote } from "../../lib/productPage.ts";
import type { Product } from "../../types.ts";

interface ProductMobileBarProps {
  product: Product;
  displayTitle: string;
  priceOnRequest: boolean;
  onAddToCart: () => void;
  onReserve: () => void;
}

export default function ProductMobileBar({
  product,
  displayTitle,
  priceOnRequest,
  onAddToCart,
  onReserve,
}: ProductMobileBarProps) {
  const { language, t } = useLanguage();
  const pricing = getProductPricingQuote(product);
  const canBuy = canPurchaseProduct(product, priceOnRequest);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-[#050505]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3 safe-area-pb">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-white/35 truncate">{product.brand?.name}</p>
        <p className="text-sm font-serif text-[#c5a059] truncate">
          {priceOnRequest
            ? t("product.price_on_request")
            : formatProductPrice(
                pricing.showBankTransferPrice ? pricing.bankTransferPrice : pricing.shopPrice,
                language,
                pricing.currency
              )}
        </p>
        <p className="text-[9px] text-white/25 truncate sr-only">{displayTitle}</p>
      </div>
      {canBuy && (
        <button
          type="button"
          onClick={onAddToCart}
          className="px-4 py-3 bg-white text-black text-[9px] tracking-widest uppercase font-bold shrink-0"
        >
          {t("product.add_to_cart")}
        </button>
      )}
      <button
        type="button"
        onClick={onReserve}
        className="px-4 py-3 border border-[#c5a059]/50 text-[#c5a059] text-[9px] tracking-widest uppercase font-bold shrink-0"
      >
        {t("product.reserve.button").split(" / ")[0]}
      </button>
    </div>
  );
}
