import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { formatProductPrice, getProductPricingQuote } from "../../lib/productPage.ts";
import type { Product } from "../../types.ts";

interface ProductPricingBlockProps {
  product: Product;
  priceOnRequest: boolean;
  marginTaxNote: string;
}

export default function ProductPricingBlock({ product, priceOnRequest, marginTaxNote }: ProductPricingBlockProps) {
  const { language, t } = useLanguage();
  const pricing = getProductPricingQuote(product);

  if (priceOnRequest) {
    return (
      <div className="space-y-2">
        <p className="text-3xl md:text-4xl font-serif italic text-[#c5a059] tracking-tight">
          {t("product.price_on_request")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <p className="text-3xl md:text-4xl font-serif italic text-[#c5a059] tracking-tight">
          {formatProductPrice(pricing.shopPrice, language, pricing.currency)}
        </p>
        {marginTaxNote && (
          <span className="text-[10px] tracking-[0.2em] text-white/30 uppercase font-light max-w-xs sm:text-right">
            {marginTaxNote}
          </span>
        )}
      </div>

      {pricing.showBankTransferPrice && (
        <div className="border-l border-[#c5a059]/40 pl-5 py-1 space-y-1">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/40">
            {t("product.prepayment_price")}
          </p>
          <p className="text-xl font-serif italic text-white/90">
            {formatProductPrice(pricing.bankTransferPrice, language, pricing.currency)}
          </p>
          {pricing.prepaymentDiscount > 0 && (
            <p className="text-xs text-white/45 font-light">
              {t("product.prepayment_savings").replace(
                "{amount}",
                formatProductPrice(pricing.prepaymentDiscount, language, pricing.currency)
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
