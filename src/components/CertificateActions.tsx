import { useState } from "react";
import { Download, ExternalLink, Eye, Shield } from "lucide-react";
import { downloadCertificatePdf, openCertificateVerify, viewCertificatePdf } from "../lib/certificatePdf.ts";

interface CertificateActionsProps {
  certificateId: number;
  certificateNumber: string;
  getToken: () => Promise<string>;
  variant?: "dark" | "light";
  className?: string;
}

export default function CertificateActions({
  certificateId,
  certificateNumber,
  getToken,
  variant = "dark",
  className = "",
}: CertificateActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDark = variant === "dark";
  const btn =
    "w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-[10px] tracking-widest uppercase font-bold transition-all disabled:opacity-50 touch-manipulation";
  const gold = isDark
    ? `${btn} bg-[#c5a059] text-black hover:bg-[#d4af37]`
    : `${btn} bg-[#D4AF37] text-white hover:bg-[#c5a059]`;
  const outline = isDark
    ? `${btn} border border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059]/10`
    : `${btn} border border-gray-200 text-gray-800 hover:bg-gray-50`;

  const run = async (action: "view" | "download" | "verify") => {
    setLoading(action);
    setError(null);
    try {
      if (action === "verify") {
        openCertificateVerify(certificateNumber);
      } else {
        const token = await getToken();
        if (action === "view") await viewCertificatePdf(certificateId, token);
        else await downloadCertificatePdf(certificateId, token, certificateNumber);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <p className={`flex items-center gap-2 text-[10px] uppercase tracking-widest ${isDark ? "text-[#c5a059]" : "text-[#9a7b2e]"}`}>
        <Shield size={12} /> {certificateNumber}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" className={gold} disabled={!!loading} onClick={() => run("view")}>
          <Eye size={14} /> {loading === "view" ? "…" : "Ansehen"}
        </button>
        <button type="button" className={outline} disabled={!!loading} onClick={() => run("download")}>
          <Download size={14} /> PDF
        </button>
        <button type="button" className={outline} disabled={!!loading} onClick={() => run("verify")}>
          <ExternalLink size={14} /> Prüfen
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
