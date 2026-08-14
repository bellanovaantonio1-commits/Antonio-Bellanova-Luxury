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
    <div
      className={`legal-document space-y-8 [&_.legal-missing]:text-amber-400/90 [&_.legal-missing]:not-italic ${className}`}
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}

export { LegalDocumentView };
