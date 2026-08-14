import { useMemo } from "react";
import { useShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import {
  calculateShopPriceFromBase,
  parseShopPricingConfig,
  type ShopPriceBreakdown,
} from "../../lib/shopPricing.ts";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

interface PricingBreakdownPanelProps {
  basePriceInput: string;
  className?: string;
}

export default function PricingBreakdownPanel({ basePriceInput, className = "" }: PricingBreakdownPanelProps) {
  const shopSettings = useShopSettings();

  const breakdown: ShopPriceBreakdown | null = useMemo(() => {
    const base = parseFloat(basePriceInput);
    if (!Number.isFinite(base) || base <= 0) return null;
    try {
      const config = parseShopPricingConfig(shopSettings as unknown as Record<string, string>);
      return calculateShopPriceFromBase(base, config);
    } catch {
      return null;
    }
  }, [basePriceInput, shopSettings]);

  if (!breakdown) {
    return (
      <div className={`rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-xs text-gray-400 ${className}`}>
        Basispreis eingeben — Shop-Preis wird automatisch berechnet.
      </div>
    );
  }

  const rows = [
    { label: "Basispreis (Vorkasse)", value: formatEur(breakdown.basePrice), highlight: false },
    { label: "Berechneter Stripe-Preis (roh)", value: formatEur(breakdown.rawStripePrice), highlight: false },
    { label: "Shop-Preis (gerundet, Anzeige)", value: formatEur(breakdown.shopPrice), highlight: true },
    { label: "Vorkassen-Rabatt", value: `− ${formatEur(breakdown.prepaymentDiscount)}`, highlight: false },
    { label: "Geschätzte Stripe-Gebühr", value: formatEur(breakdown.estimatedStripeFee), highlight: false },
  ];

  return (
    <div className={`rounded-xl border border-[#D4AF37]/20 bg-[#faf8f3] p-5 space-y-3 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7b2e]">Preisübersicht</p>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 text-sm">
            <dt className="text-gray-500">{row.label}</dt>
            <dd className={row.highlight ? "font-serif text-lg text-gray-900" : "font-mono text-gray-800"}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[10px] text-gray-400 leading-relaxed pt-1 border-t border-[#D4AF37]/10">
        Gebühren & Rundung: Einstellungen → Stripe & Preise (
        {shopSettings.stripeFeePercent} % + {shopSettings.stripeFeeFixed} €, Rundung {shopSettings.roundingStep} €)
      </p>
    </div>
  );
}

export function useShopPriceBreakdown(basePriceInput: string): ShopPriceBreakdown | null {
  const shopSettings = useShopSettings();
  return useMemo(() => {
    const base = parseFloat(basePriceInput);
    if (!Number.isFinite(base) || base <= 0) return null;
    try {
      return calculateShopPriceFromBase(base, parseShopPricingConfig(shopSettings as unknown as Record<string, string>));
    } catch {
      return null;
    }
  }, [basePriceInput, shopSettings]);
}
