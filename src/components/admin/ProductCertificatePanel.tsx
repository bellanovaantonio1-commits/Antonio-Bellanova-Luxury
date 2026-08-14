import { useCallback, useEffect, useState } from "react";
import { Shield, Download, ExternalLink, RefreshCw } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface CertificateInfo {
  id: number;
  certificateNumber: string;
  verificationCode: string;
  status: string;
  issuedAt: string | null;
}

interface ProductCertificatePanelProps {
  productId: number;
  className?: string;
}

export default function ProductCertificatePanel({ productId, className = "" }: ProductCertificatePanelProps) {
  const [cert, setCert] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/products/${productId}/certificate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCert(data.certificate || null);
    } catch {
      setError("Zertifikat konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const createCertificate = async (activate: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/products/${productId}/certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: "de", activate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erstellung fehlgeschlagen.");
      setCert(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    if (!cert) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/certificates/${cert.id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aktivierung fehlgeschlagen.");
      setCert(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!cert) return;
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/admin/certificates/${cert.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cert.certificateNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-xs text-gray-400 italic">Echtheitszertifikat wird geladen…</p>;
  }

  return (
    <section className={`rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 text-[#9a7b2e]">
        <Shield size={16} />
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Echtheitszertifikat</h4>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!cert ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Noch kein Zertifikat für dieses Produkt.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => createCertificate(false)}
            className="px-4 py-2.5 bg-gray-900 text-white text-[10px] uppercase tracking-widest font-bold rounded-lg disabled:opacity-50"
          >
            Zertifikat erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid gap-1 text-xs">
            <p>
              <span className="text-gray-400">Nummer:</span>{" "}
              <span className="font-mono font-medium">{cert.certificateNumber}</span>
            </p>
            <p>
              <span className="text-gray-400">Status:</span> {cert.status}
            </p>
            <p>
              <span className="text-gray-400">Verifikation:</span> {cert.verificationCode}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cert.status === "DRAFT" && (
              <button
                type="button"
                disabled={busy}
                onClick={activate}
                className="px-3 py-2 bg-[#D4AF37] text-white text-[10px] uppercase tracking-widest font-bold rounded-lg"
              >
                Ausstellen (Aktiv)
              </button>
            )}
            {cert.status !== "DRAFT" && (
              <button
                type="button"
                onClick={downloadPdf}
                className="px-3 py-2 border border-gray-200 text-[10px] uppercase tracking-widest font-bold rounded-lg flex items-center gap-1"
              >
                <Download size={12} /> PDF
              </button>
            )}
            <a
              href={`/certificate/${encodeURIComponent(cert.certificateNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 border border-gray-200 text-[10px] uppercase tracking-widest font-bold rounded-lg flex items-center gap-1"
            >
              <ExternalLink size={12} /> Verifizieren
            </a>
            <button type="button" onClick={load} className="p-2 text-gray-400 hover:text-gray-700">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
