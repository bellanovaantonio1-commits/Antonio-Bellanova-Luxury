import { Shield, Award, Package, Clock, Headphones } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import type { TrustFeature } from "../../lib/productPage.ts";

const ICONS: Record<string, typeof Shield> = {
  original: Shield,
  verified: Shield,
  certificate: Award,
  "certificate-verify": Shield,
  "insured-shipping": Package,
  express: Clock,
  service: Headphones,
};

interface ProductTrustFeaturesProps {
  features: TrustFeature[];
  authenticityNote: string;
  certificateNote?: string;
  compact?: boolean;
}

export default function ProductTrustFeatures({
  features,
  authenticityNote,
  certificateNote,
  compact = false,
}: ProductTrustFeaturesProps) {
  const { language, t } = useLanguage();

  if (features.length === 0 && !authenticityNote) return null;

  return (
    <div
      className={`${
        compact ? "py-6 border-y border-white/[0.06]" : "p-6 md:p-8 bg-white/[0.02] border border-white/[0.06]"
      } space-y-5`}
    >
      {!compact && (
        <p className="text-[10px] tracking-[0.35em] uppercase font-medium text-[#c5a059]">
          {t("product.trust.title")}
        </p>
      )}

      {authenticityNote && (
        <p className="text-sm text-white/65 leading-relaxed font-light">{authenticityNote}</p>
      )}

      {certificateNote && (
        <p className="text-xs text-white/40 italic leading-relaxed">{certificateNote}</p>
      )}

      {features.length > 0 && (
        <ul className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {features.map((feature) => {
            const Icon = ICONS[feature.id] || Shield;
            return (
              <li key={feature.id} className="flex items-center gap-3 text-[10px] tracking-[0.15em] uppercase text-white/55">
                <span className="w-9 h-9 shrink-0 rounded-full bg-[#0a0a0a] flex items-center justify-center text-[#c5a059] border border-white/[0.06]">
                  <Icon size={15} strokeWidth={1.5} />
                </span>
                <span>{language === "en" ? feature.labelEn : feature.labelDe}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
