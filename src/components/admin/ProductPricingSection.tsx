import { memo, useMemo } from "react";
import { useShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import {
  calculateShopPriceFromBase,
  parseShopPricingConfig,
  type ProductPricingModel,
  PRICING_MODEL_LABELS,
} from "../../lib/shopPricing.ts";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export interface ProductPricingSectionValue {
  pricingModel: ProductPricingModel;
  fixedSalePrice: string;
  basePrice: string;
}

interface ProductPricingSectionProps {
  value: ProductPricingSectionValue;
  onChange: (patch: Partial<ProductPricingSectionValue>) => void;
  className?: string;
}

function ProductPricingSectionInner({ value, onChange, className = "" }: ProductPricingSectionProps) {
  const shopSettings = useShopSettings();
  const config = useMemo(
    () => parseShopPricingConfig(shopSettings as unknown as Record<string, string>),
    [shopSettings]
  );

  const breakdown = useMemo(() => {
    if (value.pricingModel !== "PREPAYMENT_DISCOUNT") return null;
    const base = parseFloat(value.basePrice);
    if (!Number.isFinite(base) || base <= 0) return null;
    try {
      return calculateShopPriceFromBase(base, config);
    } catch {
      return null;
    }
  }, [value.pricingModel, value.basePrice, config]);

  return (
    <section className={`space-y-5 ${className}`}>
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Preismodell</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          {(["STANDARD", "PREPAYMENT_DISCOUNT"] as ProductPricingModel[]).map((model) => (
            <label
              key={model}
              className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border flex-1 transition-colors ${
                value.pricingModel === model
                  ? "border-[#D4AF37] bg-[#faf8f3]"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="pricingModel"
                checked={value.pricingModel === model}
                onChange={() => onChange({ pricingModel: model })}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-bold text-gray-900">{PRICING_MODEL_LABELS[model]}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {model === "STANDARD"
                    ? "Fester Preis für alle Zahlungsarten."
                    : "Basispreis Vorkasse → Shop-Preis wird berechnet."}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {value.pricingModel === "STANDARD" ? (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Verkaufspreis (EUR)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={value.fixedSalePrice}
            onChange={(e) => onChange({ fixedSalePrice: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 outline-none focus:ring-1 focus:ring-[#D4AF37]"
            placeholder="10000"
            required
          />
          <p className="text-[10px] text-gray-400">
            Gleicher Preis für Stripe und Banküberweisung — kein automatischer Rabatt.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Basispreis / gewünschter Vorkassepreis (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value.basePrice}
              onChange={(e) => onChange({ basePrice: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 outline-none focus:ring-1 focus:ring-[#D4AF37]"
              placeholder="1000"
              required
            />
          </div>

          {breakdown ? (
            <div className="rounded-xl border border-[#D4AF37]/20 bg-[#faf8f3] p-5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7b2e] mb-2">
                Automatische Berechnung
              </p>
              {[
                ["Basispreis", formatEur(breakdown.basePrice)],
                ["Berechneter Stripe-Preis", formatEur(breakdown.rawStripePrice)],
                ["Gerundeter Shoppreis", formatEur(breakdown.shopPrice)],
                ["Vorkasse-Rabatt", formatEur(breakdown.prepaymentDiscount)],
                ["Stripe-Gebühr geschätzt", formatEur(breakdown.estimatedStripeFee)],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-mono ${label === "Gerundeter Shoppreis" ? "font-serif text-lg text-gray-900" : "text-gray-800"}`}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Basispreis eingeben für Live-Berechnung.</p>
          )}
        </div>
      )}
    </section>
  );
}

const ProductPricingSection = memo(ProductPricingSectionInner);
export default ProductPricingSection;
