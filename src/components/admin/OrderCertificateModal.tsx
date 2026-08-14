import { useCallback, useEffect, useState } from "react";
import { X, Shield, Download, ExternalLink, Eye } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface OrderCertificate {
  id: number;
  certificateNumber: string;
  status: string;
  issuedAt: string | null;
  createdAt: string;
  productName?: string | null;
  snapshotData: { brand: string; model: string; referenceNumber: string };
}

interface OrderCertificateModalProps {
  orderId: number;
  orderNumber: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  CANCELLED: "Storniert",
  REPLACED: "Ersetzt",
};

export default function OrderCertificateModal({ orderId, orderNumber, onClose }: OrderCertificateModalProps) {
  const [certs, setCerts] = useState<OrderCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/orders/${orderId}/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCerts(data.certificates || []);
    } catch {
      setCerts([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadPdf = async (id: number, num: string) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/admin/certificates/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${num}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewPdf = async (id: number) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/admin/certificates/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className="text-[#D4AF37]" size={20} />
            <div>
              <h3 className="font-serif text-lg text-gray-900">Echtheitszertifikat</h3>
              <p className="text-xs text-gray-400 font-mono">{orderNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-gray-400 italic">Laden…</p>
          ) : certs.length === 0 ? (
            <p className="text-sm text-gray-500">Kein Zertifikat mit dieser Bestellung verknüpft.</p>
          ) : (
            certs.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <div className="text-xs space-y-1">
                  <p>
                    <span className="text-gray-400">Zertifikatsnr.:</span>{" "}
                    <span className="font-mono font-medium">{c.certificateNumber}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Produkt:</span>{" "}
                    {c.productName || `${c.snapshotData?.brand} ${c.snapshotData?.model}`}
                  </p>
                  <p>
                    <span className="text-gray-400">Status:</span> {STATUS_LABELS[c.status] || c.status}
                  </p>
                  <p>
                    <span className="text-gray-400">Erstellt:</span>{" "}
                    {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(c.issuedAt || c.createdAt)
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status !== "DRAFT" && (
                    <>
                      <button
                        type="button"
                        onClick={() => viewPdf(c.id)}
                        className="px-3 py-2 bg-gray-900 text-white text-[10px] uppercase tracking-widest font-bold rounded-lg flex items-center gap-1"
                      >
                        <Eye size={12} /> Öffnen
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPdf(c.id, c.certificateNumber)}
                        className="px-3 py-2 border border-gray-200 text-[10px] uppercase tracking-widest font-bold rounded-lg flex items-center gap-1"
                      >
                        <Download size={12} /> PDF
                      </button>
                    </>
                  )}
                  <a
                    href={`/certificate/${encodeURIComponent(c.certificateNumber)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-gray-200 text-[10px] uppercase tracking-widest font-bold rounded-lg flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Verifizieren
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
