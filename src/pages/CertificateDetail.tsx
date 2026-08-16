import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Shield, Download, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import MetaTags from "../components/common/MetaTags.tsx";
import { downloadCertificatePdf } from "../lib/certificatePdf.ts";
import { getCertificateDisplayImages } from "../lib/certificateImages.ts";

interface CertificateDetailData {
  id: number;
  certificateNumber: string;
  verificationCode: string;
  status: string;
  statusLabelDe: string;
  statusLabelEn: string;
  issuedAt: string | null;
  orderNumber: string | null;
  verifyUrl: string;
  qrUrl: string;
  snapshot: {
    productName: string;
    brand: string;
    model: string;
    referenceNumber: string;
    serialNumber: string;
    movement: string;
    caseMaterial: string;
    caseSize: string;
    dial: string;
    bracelet: string;
    year: string;
    conditionPublicDe: string;
    conditionPublicEn: string;
    scopeOfDeliveryDe: string;
    scopeOfDeliveryEn: string;
    mainImage: string;
    images?: string[];
    orderNumber?: string;
    purchaseDate?: string;
    location?: string;
  };
}

function isSpecified(value?: string | null): value is string {
  if (!value?.trim()) return false;
  const v = value.trim();
  return v !== "Nicht angegeben" && v !== "Not specified" && v !== "—";
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!isSpecified(value)) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-2 py-4 border-b border-white/[0.06]">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/35">{label}</span>
      <span className="text-sm text-white/85 font-light sm:text-right max-w-md">{value}</span>
    </div>
  );
}

export default function CertificateDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<CertificateDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    user
      .getIdToken()
      .then((token) =>
        fetch(`/api/account/certificates/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (r) => {
        if (!r.ok) throw new Error(language === "en" ? "Certificate not found." : "Zertifikat nicht gefunden.");
        const json = await r.json();
        setData(json.certificate);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, id, language]);

  const statusLabel = data
    ? language === "en"
      ? data.statusLabelEn
      : data.statusLabelDe
    : "";
  const condition =
    data && language === "en" ? data.snapshot.conditionPublicEn : data?.snapshot.conditionPublicDe;
  const scope =
    data && language === "en" ? data.snapshot.scopeOfDeliveryEn : data?.snapshot.scopeOfDeliveryDe;
  const displayImages = useMemo(
    () => (data ? getCertificateDisplayImages(data.snapshot) : []),
    [data]
  );

  const handleDownload = async () => {
    if (!data || !user) return;
    setDownloading(true);
    try {
      const token = await user.getIdToken();
      await downloadCertificatePdf(data.id, token, data.certificateNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF fehlgeschlagen.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f0e8] page-pt page-pb page-x">
      <MetaTags
        title={
          language === "en"
            ? `Certificate ${data?.certificateNumber || ""}`
            : `Zertifikat ${data?.certificateNumber || ""}`
        }
        description={
          language === "en" ? "Digital certificate of authenticity" : "Digitales Echtheitszertifikat"
        }
      />

      <div className="max-w-4xl mx-auto">
        <Link
          to="/account/certificates"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-[#c5a059] mb-10"
        >
          <ArrowLeft size={14} /> {language === "en" ? "My certificates" : "Meine Zertifikate"}
        </Link>

        {loading && <p className="text-center text-white/30 italic">…</p>}
        {error && (
          <div className="p-8 rounded-2xl border border-red-500/30 bg-red-950/20 text-center text-red-300">
            {error}
          </div>
        )}

        {data && (
          <article className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent" />

            <header className="px-6 md:px-12 pt-10 pb-8 text-center border-b border-white/[0.06]">
              <Shield className="mx-auto text-[#c5a059] mb-5" size={36} strokeWidth={1.2} />
              <p className="text-[10px] tracking-[0.45em] uppercase text-[#c5a059]/80 mb-3">
                Antonio Bellanova Luxury Köln
              </p>
              <h1 className="text-3xl md:text-4xl font-serif italic text-[#f5f0e8] mb-2">
                {language === "en" ? "Certificate of Authenticity" : "Echtheitszertifikat"}
              </h1>
              <p className="font-mono text-sm text-white/50">{data.certificateNumber}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <span
                  className={`text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full ${
                    data.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/15 text-red-400 border border-red-500/20"
                  }`}
                >
                  {statusLabel}
                </span>
                {data.issuedAt && (
                  <span className="text-xs text-white/40">
                    {language === "en" ? "Issued" : "Ausgestellt"}:{" "}
                    {new Intl.DateTimeFormat(language === "en" ? "en-GB" : "de-DE", {
                      dateStyle: "long",
                    }).format(new Date(data.issuedAt))}
                  </span>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-0">
              <div className="px-6 md:px-12 py-10">
                {displayImages.length > 0 && (
                  <div className="mb-10 space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                      {language === "en" ? "Product images" : "Produktbilder"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
                      {displayImages.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className={`rounded-xl overflow-hidden border border-white/10 bg-black/40 ${
                            index === 0 && displayImages.length > 1
                              ? "col-span-2 sm:col-span-3 aspect-[4/3]"
                              : "aspect-square"
                          }`}
                        >
                          <img
                            src={image}
                            alt={
                              index === 0
                                ? data.snapshot.productName
                                : `${language === "en" ? "Product image" : "Produktbild"} ${index + 1}`
                            }
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-xl font-serif text-[#c5a059] mb-6">
                  {data.snapshot.productName || `${data.snapshot.brand} ${data.snapshot.model}`}
                </h2>

                <DetailRow label={language === "en" ? "Brand" : "Marke"} value={data.snapshot.brand} />
                <DetailRow label={language === "en" ? "Model" : "Modell"} value={data.snapshot.model} />
                <DetailRow
                  label={language === "en" ? "Reference" : "Referenznummer"}
                  value={data.snapshot.referenceNumber}
                />
                <DetailRow
                  label={language === "en" ? "Serial number" : "Seriennummer"}
                  value={data.snapshot.serialNumber}
                />
                <DetailRow label={language === "en" ? "Movement" : "Werk / Kaliber"} value={data.snapshot.movement} />
                <DetailRow label={language === "en" ? "Case size" : "Gehäusegröße"} value={data.snapshot.caseSize} />
                <DetailRow label={language === "en" ? "Material" : "Material"} value={data.snapshot.caseMaterial} />
                <DetailRow label={language === "en" ? "Dial" : "Zifferblatt"} value={data.snapshot.dial} />
                <DetailRow label={language === "en" ? "Bracelet" : "Armband"} value={data.snapshot.bracelet} />
                <DetailRow label={language === "en" ? "Year" : "Herstellungsjahr"} value={data.snapshot.year} />
                <DetailRow label={language === "en" ? "Condition" : "Zustand"} value={condition} />
                <DetailRow label={language === "en" ? "Scope of delivery" : "Lieferumfang"} value={scope} />
                <DetailRow
                  label={language === "en" ? "Order number" : "Bestellnummer"}
                  value={data.orderNumber || data.snapshot.orderNumber}
                />
                <DetailRow label={language === "en" ? "Location" : "Standort / Atelier"} value={data.snapshot.location} />
                <DetailRow
                  label={language === "en" ? "Verification ID" : "Verifikations-ID"}
                  value={data.verificationCode}
                />
              </div>

              <aside className="px-6 md:px-8 py-10 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-black/20 flex flex-col items-center text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
                  {language === "en" ? "Verify online" : "Online prüfen"}
                </p>
                <img
                  src={data.qrUrl}
                  alt="QR Code"
                  className="w-40 h-40 rounded-xl bg-white p-2"
                />
                <p className="mt-4 text-[10px] text-white/35 break-all">{data.verifyUrl}</p>
              </aside>
            </div>

            <footer className="px-6 md:px-12 py-8 border-t border-white/[0.06] flex flex-col sm:flex-row gap-3">
              <Link
                to={data.verifyUrl}
                target="_blank"
                className="flex-1 min-h-[48px] flex items-center justify-center gap-2 border border-[#c5a059]/40 text-[#c5a059] text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-[#c5a059]/10 transition-colors"
              >
                {language === "en" ? "Public verification" : "Öffentliche Verifizierung"}
              </Link>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || data.status === "DRAFT"}
                className="flex-1 min-h-[48px] flex items-center justify-center gap-2 bg-[#c5a059] text-black text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-[#d4af37] transition-colors disabled:opacity-50"
              >
                <Download size={14} /> PDF {downloading ? "…" : ""}
              </button>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
