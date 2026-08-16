import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Shield, CheckCircle2, XCircle, ExternalLink, Download } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import MetaTags from "../components/common/MetaTags.tsx";

interface VerificationData {
  valid: boolean;
  certificateNumber: string;
  status: string;
  statusLabelDe: string;
  statusLabelEn: string;
  brand: string;
  model: string;
  referenceNumber: string;
  productName: string;
  mainImage?: string | null;
  images?: string[];
  issuedAt: string | null;
  messageDe: string;
  messageEn: string;
}

export default function CertificateVerify() {
  const { certificateNumber } = useParams();
  const { language } = useLanguage();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!certificateNumber) return;
    fetch(`/api/certificates/verify/${encodeURIComponent(certificateNumber)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(language === "en" ? "Certificate not found." : "Zertifikat nicht gefunden.");
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [certificateNumber, language]);

  const msg = data ? (language === "en" ? data.messageEn : data.messageDe) : "";
  const statusLabel = data ? (language === "en" ? data.statusLabelEn : data.statusLabelDe) : "";

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-20 px-6">
      <MetaTags
        title={language === "en" ? "Certificate Verification" : "Zertifikatsprüfung"}
        description={language === "en" ? "Verify authenticity certificate" : "Echtheitszertifikat prüfen"}
      />
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <Shield className="mx-auto text-[#c5a059] mb-4" size={40} strokeWidth={1.2} />
          <h1 className="text-3xl font-serif italic text-[#c5a059]">
            {language === "en" ? "Certificate Verification" : "Zertifikatsprüfung"}
          </h1>
        </div>

        {loading && <p className="text-center text-white/40 italic">…</p>}
        {error && (
          <div className="p-8 rounded-2xl border border-red-500/30 bg-red-950/20 text-center">
            <XCircle className="mx-auto text-red-400 mb-3" />
            <p>{error}</p>
          </div>
        )}

        {data && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div
              className={`p-6 flex items-center gap-3 ${
                data.valid ? "bg-emerald-950/30 border-b border-emerald-500/20" : "bg-red-950/20 border-b border-red-500/20"
              }`}
            >
              {data.valid ? (
                <CheckCircle2 className="text-emerald-400 shrink-0" size={24} />
              ) : (
                <XCircle className="text-red-400 shrink-0" size={24} />
              )}
              <div>
                <p className="font-bold text-lg">{msg}</p>
                <p className="text-xs text-white/50 uppercase tracking-widest mt-1">{statusLabel}</p>
              </div>
            </div>

            {(data.mainImage || (data.images && data.images.length > 0)) && (
              <div className="px-8 pt-6 border-b border-white/5 space-y-4">
                {data.mainImage && (
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-[4/3] max-w-sm mx-auto">
                    <img
                      src={data.mainImage}
                      alt={data.productName || `${data.brand} ${data.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {data.images && data.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                    {data.images.map((image) => (
                      <div key={image} className="rounded-lg overflow-hidden border border-white/10 bg-black/40 aspect-square">
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-8 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-white/40 uppercase text-[10px] tracking-widest">
                  {language === "en" ? "Product" : "Produkt"}
                </span>
                <span className="text-right">{data.productName || `${data.brand} ${data.model}`}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-white/40 uppercase text-[10px] tracking-widest">
                  {language === "en" ? "Certificate No." : "Zertifikatsnr."}
                </span>
                <span className="font-mono">{data.certificateNumber}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-white/40 uppercase text-[10px] tracking-widest">
                  {language === "en" ? "Brand" : "Marke"}
                </span>
                <span>{data.brand}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-white/40 uppercase text-[10px] tracking-widest">
                  {language === "en" ? "Model" : "Modell"}
                </span>
                <span>{data.model}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-white/40 uppercase text-[10px] tracking-widest">
                  {language === "en" ? "Reference" : "Referenz"}
                </span>
                <span>{data.referenceNumber}</span>
              </div>
              {data.issuedAt && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/40 uppercase text-[10px] tracking-widest">
                    {language === "en" ? "Issued" : "Ausgestellt"}
                  </span>
                  <span>
                    {new Intl.DateTimeFormat(language === "en" ? "en-GB" : "de-DE", {
                      dateStyle: "long",
                    }).format(new Date(data.issuedAt))}
                  </span>
                </div>
              )}
            </div>

            <div className="px-8 pb-8 flex flex-col items-center border-t border-white/5 pt-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
                {language === "en" ? "Scan to verify" : "Zum Prüfen scannen"}
              </p>
              {certificateNumber && (
                <img
                  src={`/api/certificates/verify/${encodeURIComponent(certificateNumber)}/qr`}
                  alt="QR Code"
                  className="w-36 h-36 rounded-xl bg-white p-2"
                />
              )}
            </div>

            {data.valid && (
              <div className="p-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                <a
                  href={`/api/certificates/verify/${encodeURIComponent(data.certificateNumber)}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#c5a059] text-black text-[10px] uppercase tracking-widest font-bold"
                >
                  <Download size={14} /> PDF
                </a>
                <Link
                  to="/shop"
                  className="flex-1 flex items-center justify-center gap-2 py-4 border border-white/20 text-[10px] uppercase tracking-widest"
                >
                  <ExternalLink size={14} /> Shop
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
