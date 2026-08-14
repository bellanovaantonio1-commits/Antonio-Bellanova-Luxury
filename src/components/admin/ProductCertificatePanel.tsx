import { useCallback, useEffect, useState } from "react";
import { Shield, Download, ExternalLink, RefreshCw } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface CertificateInfo {
  id: number;
  certificateNumber: string;
  verificationCode: string;
  status: string;
  issuedAt: string | null;
  orderNumber?: string | null;
  snapshotData?: {
    brand: string;
    model: string;
    referenceNumber: string;
    serialNumber?: string;
    productName?: string;
  };
}

interface ProductCertificatePanelProps {
  productId: number;
  refreshKey?: number;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Ausstehend" },
  { value: "ACTIVE", label: "Aktiv" },
  { value: "CANCELLED", label: "Widerrufen" },
  { value: "REPLACED", label: "Ersetzt" },
];

export default function ProductCertificatePanel({
  productId,
  refreshKey = 0,
  className = "",
}: ProductCertificatePanelProps) {
  const [cert, setCert] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/products/${productId}/certificate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const row = data.certificate;
      if (!row) {
        setCert(null);
        return;
      }
      setCert({
        id: row.id,
        certificateNumber: row.certificateNumber,
        verificationCode: row.verificationCode,
        status: row.status,
        issuedAt: row.issuedAt,
        orderNumber: row.orderNumber,
        snapshotData: row.snapshotData,
      });
    } catch {
      setError("Zertifikat konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const createCertificate = async (activate: boolean) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/products/${productId}/certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: "de", activate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erstellung fehlgeschlagen.");
      setCert({
        id: data.id,
        certificateNumber: data.certificateNumber,
        verificationCode: data.verificationCode,
        status: data.status,
        issuedAt: data.issuedAt,
        orderNumber: data.orderNumber,
        snapshotData: data.snapshotData,
      });
      setSuccess("Zertifikat erstellt.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const refreshSnapshot = async () => {
    if (!cert) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/certificates/${cert.id}/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aktualisierung fehlgeschlagen.");
      setCert({
        id: data.id,
        certificateNumber: data.certificateNumber,
        verificationCode: data.verificationCode,
        status: data.status,
        issuedAt: data.issuedAt,
        orderNumber: data.orderNumber,
        snapshotData: data.snapshotData,
      });
      setSuccess("Zertifikatsdaten aus Produktdaten übernommen.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!cert || cert.status === status) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/certificates/${cert.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Statusänderung fehlgeschlagen.");
      setCert((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              issuedAt: data.issuedAt,
            }
          : null
      );
      setSuccess("Status aktualisiert.");
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
      setCert((prev) => (prev ? { ...prev, status: data.status, issuedAt: data.issuedAt } : null));
      setSuccess("Zertifikat ausgestellt.");
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

  const snap = cert?.snapshotData;

  return (
    <section className={`rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[#9a7b2e]">
          <Shield size={16} />
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Echtheitszertifikat</h4>
        </div>
        {cert && (
          <button type="button" onClick={load} disabled={busy} className="p-1.5 text-gray-400 hover:text-gray-700">
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}

      {!cert ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Noch kein Zertifikat für dieses Produkt.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => createCertificate(false)}
              className="px-4 py-2.5 bg-gray-900 text-white text-[10px] uppercase tracking-widest font-bold rounded-lg disabled:opacity-50"
            >
              Entwurf erstellen
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => createCertificate(true)}
              className="px-4 py-2.5 bg-[#D4AF37] text-white text-[10px] uppercase tracking-widest font-bold rounded-lg disabled:opacity-50"
            >
              Erstellen & ausstellen
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="grid gap-2 text-xs">
            <p>
              <span className="text-gray-400">Nummer:</span>{" "}
              <span className="font-mono font-medium">{cert.certificateNumber}</span>
            </p>
            <p>
              <span className="text-gray-400">Verifikation:</span>{" "}
              <span className="font-mono">{cert.verificationCode}</span>
            </p>
            {cert.orderNumber && (
              <p>
                <span className="text-gray-400">Bestellung:</span> {cert.orderNumber}
              </p>
            )}
            {snap && (
              <>
                <p>
                  <span className="text-gray-400">Marke / Modell:</span> {snap.brand} · {snap.model}
                </p>
                <p>
                  <span className="text-gray-400">Referenz:</span> {snap.referenceNumber}
                </p>
                {snap.serialNumber && snap.serialNumber !== "Nicht angegeben" && (
                  <p>
                    <span className="text-gray-400">Seriennummer:</span> {snap.serialNumber}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
            <select
              value={cert.status}
              disabled={busy}
              onChange={(e) => updateStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={refreshSnapshot}
              className="px-3 py-2 bg-gray-900 text-white text-[10px] uppercase tracking-widest font-bold rounded-lg disabled:opacity-50"
            >
              Aus Produktdaten aktualisieren
            </button>
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
              href={`/verify/certificate/${encodeURIComponent(cert.certificateNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 border border-gray-200 text-[10px] uppercase tracking-widest font-bold rounded-lg flex items-center gap-1"
            >
              <ExternalLink size={12} /> Verifizieren
            </a>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            Beim Speichern des Produkts werden Zertifikatsdaten automatisch aus den aktuellen Produktdaten
            übernommen. Mit „Aus Produktdaten aktualisieren“ können Sie das jederzeit manuell auslösen.
          </p>
        </div>
      )}
    </section>
  );
}
