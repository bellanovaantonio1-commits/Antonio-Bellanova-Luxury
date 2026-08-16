import { Download } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";

interface ProductDatasheetButtonProps {
  slug: string;
}

export default function ProductDatasheetButton({ slug }: ProductDatasheetButtonProps) {
  const { language, t } = useLanguage();
  const href = `/api/products/${encodeURIComponent(slug)}/datasheet.pdf?lang=${language}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full min-h-11 border border-white/15 text-white/70 hover:border-[#c5a059]/40 hover:text-[#c5a059] py-4 text-[10px] tracking-[0.25em] uppercase font-bold transition-all duration-300 flex items-center justify-center gap-2"
    >
      <Download size={14} strokeWidth={1.5} />
      {t("product.datasheet")}
    </a>
  );
}
