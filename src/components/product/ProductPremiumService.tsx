import { Shield, Package, Headphones } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import type { ShopSettings } from "../../contexts/ShopSettingsContext.tsx";

interface ProductPremiumServiceProps {
  shopSettings: ShopSettings;
}

export default function ProductPremiumService({ shopSettings }: ProductPremiumServiceProps) {
  const { language, t } = useLanguage();
  const authenticityNote =
    language === "en" ? shopSettings.authenticityNoteEn : shopSettings.authenticityNoteDe;
  const pickupNote = language === "en" ? shopSettings.pickupNoteEn : shopSettings.pickupNoteDe;

  const pillars = [
    {
      icon: Shield,
      title: t("product.premium.authenticity"),
      desc: authenticityNote || t("product.premium.authenticity_desc"),
    },
    {
      icon: Package,
      title: t("product.premium.shipping"),
      desc: pickupNote || t("product.premium.shipping_desc"),
    },
    {
      icon: Headphones,
      title: t("product.premium.service"),
      desc: t("product.premium.service_desc"),
    },
  ];

  return (
    <section className="mt-24 md:mt-32 border-t border-white/[0.06] pt-16 md:pt-20">
      <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c5a059] mb-4">{t("product.premium.title")}</p>
        <p className="text-lg md:text-xl font-serif italic text-white/75 font-light leading-relaxed">
          {t("product.premium.subtitle")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
        {pillars.map((pillar) => (
          <article key={pillar.title} className="text-center px-4 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full border border-[#c5a059]/20 flex items-center justify-center text-[#c5a059]">
              <pillar.icon size={20} strokeWidth={1.5} />
            </div>
            <h3 className="text-[11px] tracking-[0.35em] uppercase text-white/80">{pillar.title}</h3>
            <p className="text-sm text-white/45 font-light leading-relaxed">{pillar.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
