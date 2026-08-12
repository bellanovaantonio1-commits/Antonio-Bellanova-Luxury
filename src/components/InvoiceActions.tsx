import { useState } from "react";
import { Eye, Download, Share2, FileText } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { performInvoicePdfAction, invoiceShareSupported } from "../lib/invoicePdf.ts";

interface InvoiceActionsProps {
  orderId: number;
  invoiceNumber: string;
  invoiceStatus?: string | null;
  getToken: () => Promise<string>;
  variant?: "dark" | "light";
  className?: string;
}

export default function InvoiceActions({
  orderId,
  invoiceNumber,
  invoiceStatus,
  getToken,
  variant = "dark",
  className = "",
}: InvoiceActionsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<"view" | "download" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shareOk = invoiceShareSupported();
  const isCancelled = invoiceStatus === "CANCELLED";

  const run = async (action: "view" | "download" | "share") => {
    setLoading(action);
    setError(null);
    try {
      const token = await getToken();
      await performInvoicePdfAction({ orderId, token, invoiceNumber, action });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("invoice.error"));
    } finally {
      setLoading(null);
    }
  };

  const isDark = variant === "dark";
  const primary =
    "w-full min-h-[52px] flex items-center justify-center gap-3 rounded-full text-[11px] tracking-[0.25em] uppercase font-bold transition-all disabled:opacity-50 touch-manipulation";
  const goldBtn = `${primary} bg-[#c5a059] text-black hover:bg-[#d4af37] active:scale-[0.98]`;
  const outlineBtn = `${primary} border border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059]/10 active:scale-[0.98]`;
  const lightGold = `${primary} bg-[#D4AF37] text-white hover:bg-[#c5a059]`;
  const lightOutline = `${primary} border border-gray-200 text-gray-800 hover:bg-gray-50`;

  const viewClass = isDark ? goldBtn : lightGold;
  const dlClass = isDark ? outlineBtn : lightOutline;
  const shareClass = isDark ? outlineBtn : lightOutline;

  return (
    <div className={`space-y-3 ${className}`}>
      {isCancelled && (
        <p className={`text-[10px] tracking-widest uppercase font-bold text-center ${isDark ? "text-red-400" : "text-red-600"}`}>
          {t("invoice.cancelled")}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={!!loading}
          onClick={() => run("view")}
          className={viewClass}
        >
          <Eye size={18} strokeWidth={1.5} />
          {loading === "view" ? t("invoice.loading") : t("invoice.view")}
        </button>
        <button
          type="button"
          disabled={!!loading}
          onClick={() => run("download")}
          className={dlClass}
        >
          <Download size={18} strokeWidth={1.5} />
          {loading === "download" ? t("invoice.loading") : t("invoice.download")}
        </button>
      </div>

      {shareOk && (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => run("share")}
          className={shareClass}
        >
          <Share2 size={18} strokeWidth={1.5} />
          {loading === "share" ? t("invoice.loading") : t("invoice.share")}
        </button>
      )}

      <p className={`text-[9px] text-center tracking-widest uppercase ${isDark ? "text-white/30" : "text-gray-400"}`}>
        <FileText size={10} className="inline mr-1 -mt-0.5" />
        {invoiceNumber} · PDF · A4
      </p>

      {error && (
        <p className={`text-xs text-center ${isDark ? "text-red-400" : "text-red-600"}`}>{error}</p>
      )}
    </div>
  );
}
