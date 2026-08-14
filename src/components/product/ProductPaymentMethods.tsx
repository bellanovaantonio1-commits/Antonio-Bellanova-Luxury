import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import type { PaymentDisplayMethod } from "../../lib/paymentDisplay.ts";
import PaymentMethodIcon from "./PaymentMethodIcon.tsx";

export default function ProductPaymentMethods() {
  const { language, t } = useLanguage();
  const [methods, setMethods] = useState<PaymentDisplayMethod[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payment-methods")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setMethods(Array.isArray(data?.methods) ? data.methods : []);
      })
      .catch(() => {
        if (!cancelled) setMethods([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || methods.length === 0) return null;

  return (
    <section
      className="mt-8 pt-8 border-t border-white/[0.06]"
      aria-label={t("product.payment.title")}
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <p className="text-[10px] tracking-[0.35em] uppercase text-[#c5a059] font-medium">
          {t("product.payment.title")}
        </p>
        <Link
          to="/payment-info"
          className="text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-[#c5a059] transition-colors shrink-0"
        >
          {t("product.payment.details")}
        </Link>
      </div>

      <ul className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin md:flex-wrap md:overflow-visible md:pb-0">
        {methods.map((method) => (
          <li key={method.id} className="group shrink-0">
            <div className="flex items-center justify-center min-w-[4.5rem] h-12 px-3 border border-white/[0.06] bg-white/[0.02] hover:border-[#c5a059]/30 hover:bg-[#c5a059]/[0.04] transition-all duration-300">
              <PaymentMethodIcon id={method.id} className="w-11 h-5" />
              <span className="sr-only">
                {language === "en" ? method.labelEn : method.labelDe}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-white/40 font-light leading-relaxed">
        {t("product.payment.secure_note")}
      </p>
    </section>
  );
}
