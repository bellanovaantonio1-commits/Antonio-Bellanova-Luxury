import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import type { PaymentDisplayMethod } from "../../lib/paymentDisplay.ts";

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

  const visibleMethods = useMemo(
    () => methods.filter((method) => method.id !== "stripe"),
    [methods]
  );

  if (!loaded || visibleMethods.length === 0) return null;

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

      <ul className="flex flex-wrap gap-2">
        {visibleMethods.map((method) => (
          <li key={method.id}>
            <span className="inline-flex items-center px-3 py-2 border border-white/[0.08] bg-[#0a0a0a] text-[11px] tracking-[0.12em] text-white/75 font-light hover:border-[#c5a059]/35 hover:text-[#c5a059] transition-colors duration-300">
              {language === "en" ? method.labelEn : method.labelDe}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-white/40 font-light leading-relaxed">
        {t("product.payment.secure_note")}
      </p>
    </section>
  );
}
