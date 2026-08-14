import InfoPage from "../../pages/InfoPage.tsx";
import LegalDocumentView from "./LegalDocumentView.tsx";
import { useLanguage } from "../../contexts/LanguageContext.tsx";

interface LegalPageProps {
  documentKey: string;
  titleDe: string;
  titleEn: string;
  subtitleDe?: string;
  subtitleEn?: string;
}

export default function LegalPage({
  documentKey,
  titleDe,
  titleEn,
  subtitleDe = "Rechtliches",
  subtitleEn = "Legal",
}: LegalPageProps) {
  const { language } = useLanguage();
  return (
    <InfoPage
      title={language === "en" ? titleEn : titleDe}
      subtitle={language === "en" ? subtitleEn : subtitleDe}
      content={<LegalDocumentView documentKey={documentKey} />}
    />
  );
}
