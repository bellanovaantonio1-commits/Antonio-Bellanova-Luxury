import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";

interface LegalDocumentViewProps {
  documentKey: string;
  fallbackTitle?: string;
  className?: string;
}

export default function LegalDocumentView({ documentKey, fallbackTitle, className = "" }: LegalDocumentViewProps) {
  const { language } = useLanguage();
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState(fallbackTitle || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/legal/${encodeURIComponent(documentKey)}?lang=${language}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(language === "en" ? "Could not load content." : "Inhalt konnte nicht geladen werden.");
        return r.json();
      })
      .then((data) => {
        setHtml(data.html);
        if (data.title) setTitle(data.title);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [documentKey, language]);

  if (loading) {
    return <p className="text-white/40 italic animate-pulse">{language === "en" ? "Loading…" : "Wird geladen…"}</p>;
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }

  return (
    <div className={className}>
      {documentKey === "withdrawal_form" && (
        <p className="mb-6">
          <a
            href={`/api/legal/withdrawal-form/pdf?lang=${language}`}
            download
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#c5a059] border border-[#c5a059]/30 px-4 py-2 hover:bg-[#c5a059]/10 transition-colors"
          >
            {language === "en" ? "Download withdrawal form (PDF)" : "Widerrufsformular als PDF"}
          </a>
        </p>
      )}
      <div
        className="legal-document space-y-8 [&_.legal-missing]:text-amber-400/90 [&_.legal-missing]:not-italic"
        dangerouslySetInnerHTML={{ __html: html || "" }}
      />
    </div>
  );
}

export { LegalDocumentView };
