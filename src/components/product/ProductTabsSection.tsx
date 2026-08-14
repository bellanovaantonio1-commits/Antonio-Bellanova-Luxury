import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import LegalDocumentView from "../legal/LegalDocumentView.tsx";
import type { SpecRow } from "../../lib/productDisplay.ts";
import type { PublicProductCertificate } from "../../lib/productPage.ts";

type TabId = "description" | "specifications" | "certificate" | "shipping";

interface ProductTabsSectionProps {
  descriptionParagraphs: string[];
  specRows: SpecRow[];
  certificate: PublicProductCertificate | null;
  certificateNote?: string;
}

export default function ProductTabsSection({
  descriptionParagraphs,
  specRows,
  certificate,
  certificateNote,
}: ProductTabsSectionProps) {
  const { language, t } = useLanguage();
  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: t("product.tabs.description") },
    { id: "specifications", label: t("product.tabs.specifications") },
    { id: "certificate", label: t("product.tabs.certificate") },
    { id: "shipping", label: t("product.tabs.shipping") },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("description");

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

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

        {activeTab === "certificate" && (
          <div className="max-w-3xl">
            {certificate ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
                  {[
                    [t("product.certificate.number"), certificate.certificateNumber],
                    ["Marke / Brand", certificate.brand],
                    ["Modell / Model", certificate.model],
                    [t("product.certificate.reference"), certificate.referenceNumber],
                    certificate.serialNumber ? [t("product.certificate.serial"), certificate.serialNumber] : null,
                    [
                      t("product.certificate.status"),
                      language === "en" ? certificate.statusLabelEn : certificate.statusLabelDe,
                    ],
                    [t("product.certificate.issued"), formatDate(certificate.issuedAt)],
                    certificate.verificationCode
                      ? [t("product.certificate.signature"), certificate.verificationCode]
                      : null,
                  ]
                    .filter(Boolean)
                    .map((entry) => {
                      const [label, value] = entry as [string, string];
                      return (
                        <div key={label} className="space-y-1">
                          <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">{label}</p>
                          <p className="text-sm text-white/85 font-light break-all">{value}</p>
                        </div>
                      );
                    })}
                </div>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link
                    to={certificate.verifyUrl}
                    className="inline-flex items-center px-6 py-3 border border-[#c5a059]/40 text-[#c5a059] text-[10px] tracking-[0.3em] uppercase hover:bg-[#c5a059] hover:text-black transition-colors"
                  >
                    {t("product.certificate.view")}
                  </Link>
                  <a
                    href={certificate.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 border border-white/15 text-white/70 text-[10px] tracking-[0.3em] uppercase hover:border-white/30 transition-colors"
                  >
                    {t("product.certificate.download")}
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white/50 font-light leading-relaxed">{t("product.certificate.none")}</p>
                {certificateNote && <p className="text-xs text-white/35 italic">{certificateNote}</p>}
              </div>
            )}
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
