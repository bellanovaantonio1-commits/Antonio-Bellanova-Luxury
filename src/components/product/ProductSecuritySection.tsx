import { Shield, CreditCard, Headphones, Package, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import type { ShopSettings } from "../../contexts/ShopSettingsContext.tsx";

interface ProductSecuritySectionProps {
  shopSettings: ShopSettings;
  hasAuthenticity: boolean;
}

export default function ProductSecuritySection({ shopSettings, hasAuthenticity }: ProductSecuritySectionProps) {
  const { language, t } = useLanguage();

  const items = [
    (shopSettings.shippingCostDe || shopSettings.shippingCostEu || shopSettings.shippingCostWorld) && {
      icon: Package,
      label: t("product.security.insured"),
      href: "/shipping",
    },
    shopSettings.stripeEnabled !== "false" || shopSettings.bankTransferEnabled !== "false"
      ? { icon: CreditCard, label: t("product.security.payment"), href: "/payment-info" }
      : null,
    (shopSettings.contactPhone || shopSettings.contactEmail) && {
      icon: Headphones,
      label: t("product.security.advice"),
      href: "/contact",
    },
    hasAuthenticity && { icon: Shield, label: t("product.security.authenticity"), href: "/faq" },
    { icon: RotateCcw, label: t("product.security.returns"), href: "/withdrawal" },
  ].filter(Boolean) as { icon: typeof Shield; label: string; href: string }[];

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-8 border-t border-white/[0.06]">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.href}
          className="group flex flex-col items-center text-center gap-3 py-4 px-2 hover:bg-white/[0.02] transition-colors"
        >
          <span className="w-10 h-10 rounded-full border border-white/[0.06] flex items-center justify-center text-[#c5a059]/80 group-hover:text-[#c5a059] group-hover:border-[#c5a059]/20 transition-colors">
            <item.icon size={16} strokeWidth={1.5} />
          </span>
          <span className="text-[9px] tracking-[0.2em] uppercase text-white/45 group-hover:text-white/70 transition-colors">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
