import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { canPurchaseProduct } from "../../lib/productPage.ts";
import type { Product } from "../../types.ts";

interface ProductActionsProps {
  product: Product;
  slug: string;
  priceOnRequest: boolean;
  onAddToCart: () => void;
  onReserve: () => void;
  whatsappUrl: string;
}

export default function ProductActions({
  product,
  slug,
  priceOnRequest,
  onAddToCart,
  onReserve,
  whatsappUrl,
}: ProductActionsProps) {
  const { language, t } = useLanguage();
  const canBuy = canPurchaseProduct(product, priceOnRequest);
  const isReserved = String(product.status || "").toUpperCase() === "RESERVED";
  const isSold = String(product.status || "").toUpperCase() === "SOLD";
  const datasheetHref = `/api/products/${encodeURIComponent(slug)}/datasheet.pdf?lang=${language}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
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
            className={`w-full border border-[#c5a059]/35 text-[#c5a059] hover:bg-[#c5a059] hover:text-black py-5 md:py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all duration-300 ${
              !canBuy || priceOnRequest || isReserved ? "bg-[#c5a059]/[0.06]" : ""
            }`}
          >
            {t("product.reserve.button")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] tracking-[0.2em] uppercase">
        {whatsappUrl !== "#" && (
          <>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-green-400 transition-colors"
            >
              {t("product.whatsapp")}
            </a>
            <span className="text-white/15" aria-hidden="true">
              ·
            </span>
          </>
        )}
        <a
          href={datasheetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-[#c5a059] transition-colors"
        >
          {t("product.datasheet")}
        </a>
      </div>
    </div>
  );
}
