import { useState } from "react";
import { Shield, Award } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import LegalDocumentView from "../legal/LegalDocumentView.tsx";
import type { SpecRow } from "../../lib/productDisplay.ts";
import type { ProductCertificateEligibility } from "../../lib/productPage.ts";

type TabId = "description" | "specifications" | "certificate" | "shipping";

interface ProductTabsSectionProps {
  descriptionParagraphs: string[];
  specRows: SpecRow[];
  certificateEligible: boolean;
  certificateMessages?: ProductCertificateEligibility["messages"] | null;
  certificateNote?: string;
}

export default function ProductTabsSection({
  descriptionParagraphs,
  specRows,
  certificateEligible,
  certificateMessages,
  certificateNote,
}: ProductTabsSectionProps) {
  const { language, t } = useLanguage();
  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: t("product.tabs.description") },
    { id: "specifications", label: t("product.tabs.specifications") },
    ...(certificateEligible ? [{ id: "certificate" as TabId, label: t("product.tabs.certificate") }] : []),
    { id: "shipping", label: t("product.tabs.shipping") },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("description");

  const messages = certificateMessages?.[language === "en" ? "en" : "de"];

  return (
    <section className="mt-24 md:mt-32 border-t border-white/[0.06] pt-16 md:pt-20">
      <div
        className="flex flex-wrap gap-x-8 gap-y-3 border-b border-white/[0.06] pb-0 mb-10 overflow-x-auto"
        role="tablist"
        aria-label="Product information"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-[10px] tracking-[0.35em] uppercase transition-colors whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-[#c5a059] border-[#c5a059]"
                : "text-white/35 border-transparent hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === "description" && (
          <div className="max-w-3xl space-y-6 text-[14px] leading-[1.9] text-white/70 font-light">
            {descriptionParagraphs.length > 0 ? (
              descriptionParagraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
            ) : (
              <p className="italic text-white/35">{t("product.no_description")}</p>
            )}
          </div>
        )}

        {activeTab === "specifications" && (
          <div className="max-w-4xl">
            {specRows.length > 0 ? (
              <div className="grid grid-cols-1 gap-0">
                {specRows.map((row, idx) => (
                  <div
                    key={`${row.label}-${idx}`}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-2 py-5 border-b border-white/[0.04] px-1 hover:bg-white/[0.015] transition-colors"
                  >
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/35">{row.label}</span>
                    <span className="text-[13px] text-white/85 font-light sm:text-right max-w-xl">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-white/35">{t("product.no_description")}</p>
            )}
          </div>
        )}

        {activeTab === "certificate" && certificateEligible && (
          <div className="max-w-3xl">
            <div className="rounded-2xl border border-[#c5a059]/20 bg-gradient-to-br from-[#c5a059]/5 to-transparent p-8 md:p-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10">
                  <Award className="text-[#c5a059]" size={22} strokeWidth={1.2} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif italic text-[#f5f0e8]">
                    {messages?.title || (language === "en" ? "Certificate of authenticity" : "Echtheitszertifikat")}
                  </h3>
                  <p className="text-sm text-[#c5a059]/90 tracking-wide">
                    {messages?.subtitle || (language === "en" ? "Digitally verifiable" : "Digital verifizierbar")}
                  </p>
                </div>
              </div>

              <ul className="space-y-3 text-sm text-white/60 font-light">
                <li className="flex items-center gap-3">
                  <Shield size={14} className="text-[#c5a059] shrink-0" />
                  {messages?.note ||
                    (language === "en"
                      ? "Certificate available after payment is received"
                      : "Zertifikat nach Zahlungseingang verfügbar")}
                </li>
                <li className="flex items-center gap-3">
                  <Shield size={14} className="text-[#c5a059] shrink-0" />
                  {language === "en"
                    ? "Unique certificate number and public verification"
                    : "Eindeutige Zertifikatsnummer und öffentliche Verifizierung"}
                </li>
              </ul>

              {certificateNote && (
                <p className="text-xs text-white/35 italic border-t border-white/[0.06] pt-4">{certificateNote}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl">
            <div>
              <h3 className="text-[10px] tracking-[0.35em] uppercase text-[#c5a059] mb-6">
                {t("product.tabs.shipping_section")}
              </h3>
              <LegalDocumentView documentKey="shipping" className="text-sm" />
            </div>
            <div>
              <h3 className="text-[10px] tracking-[0.35em] uppercase text-[#c5a059] mb-6">
                {t("product.tabs.returns_section")}
              </h3>
              <LegalDocumentView documentKey="withdrawal" className="text-sm" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
