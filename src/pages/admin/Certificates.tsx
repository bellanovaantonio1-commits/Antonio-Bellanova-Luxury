import { useCallback, useEffect, useState } from "react";
import { Shield, Search, Download, ExternalLink, RefreshCw } from "lucide-react";
import { auth } from "../../lib/firebase.ts";
import { Link } from "react-router-dom";

interface CertRow {
  id: number;
  certificateNumber: string;
  status: string;
  issuedAt: string | null;
  productName: string | null;
  orderNumber: string | null;
  paymentStatus: string | null;
  customerEmail: string | null;
  customerName: string | null;
  snapshotData: { brand: string; model: string; referenceNumber: string };
}

const STATUS_OPTIONS = ["ALL", "DRAFT", "ACTIVE", "CANCELLED", "REPLACED"];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Ausstehend",
  ACTIVE: "Aktiv",
  CANCELLED: "Widerrufen",
  REPLACED: "Ersetzt",
};

export default function Certificates() {
  const [rows, setRows] = useState<CertRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const params = new URLSearchParams({ q, status, limit: "100" });
      const res = await fetch(`/api/admin/certificates?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(data.certificates || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const setCertStatus = async (id: number, newStatus: string) => {
    const token = await auth.currentUser?.getIdToken();
    await fetch(`/api/admin/certificates/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  };

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

  const refreshAllSnapshots = async () => {
    setRefreshingAll(true);
    setRefreshMessage(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/certificates/refresh-all-snapshots", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aktualisierung fehlgeschlagen.");
      setRefreshMessage(
        data.errors?.length
          ? `${data.updated} aktualisiert, ${data.errors.length} Fehler.`
          : `${data.updated} Zertifikats-Snapshots aktualisiert.`
      );
      load();
    } catch (err) {
      setRefreshMessage(err instanceof Error ? err.message : "Fehler");
    } finally {
      setRefreshingAll(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="text-[#D4AF37]" size={28} />
          <div>
            <h3 className="text-xl font-serif text-gray-900">Echtheitszertifikate</h3>
            <p className="text-sm text-gray-500">Alle ausgestellten und geplanten Zertifikate verwalten.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshAllSnapshots}
          disabled={refreshingAll}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 bg-gray-900 text-white rounded-lg text-[10px] tracking-widest uppercase font-bold disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshingAll ? "animate-spin" : ""} />
          Alle Snapshots aktualisieren
        </button>
      </div>

      {refreshMessage && (
        <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">{refreshMessage}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche: Nummer, Produkt, Marke, Referenz, Bestellung…"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "Alle Status" : s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs text-left min-w-[900px]">
          <thead className="bg-gray-50 text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="p-3">Zertifikatsnr.</th>
              <th className="p-3">Produkt</th>
              <th className="p-3">Marke / Modell</th>
              <th className="p-3">Referenz</th>
              <th className="p-3">Bestellung</th>
              <th className="p-3">Zahlung</th>
              <th className="p-3">Kunde</th>
              <th className="p-3">Ausgestellt</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-400 italic">
                  Laden…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400">
                  Keine Zertifikate gefunden.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="p-3 font-mono">{c.certificateNumber}</td>
                  <td className="p-3">{c.productName || "—"}</td>
                  <td className="p-3">
                    {c.snapshotData?.brand} · {c.snapshotData?.model}
                  </td>
                  <td className="p-3">{c.snapshotData?.referenceNumber}</td>
                  <td className="p-3">{c.orderNumber || "—"}</td>
                  <td className="p-3">{c.paymentStatus || "—"}</td>
                  <td className="p-3 text-gray-600">
                    {c.customerName || c.customerEmail || "—"}
                  </td>
                  <td className="p-3">
                    {c.issuedAt
                      ? new Intl.DateTimeFormat("de-DE").format(new Date(c.issuedAt))
                      : "—"}
                  </td>
                  <td className="p-3">
                    <select
                      value={c.status}
                      onChange={(e) => setCertStatus(c.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      {STATUS_OPTIONS.filter((s) => s !== "ALL").map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s] || s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => downloadPdf(c.id, c.certificateNumber)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="PDF"
                      >
                        <Download size={14} />
                      </button>
                      <Link
                        to={`/verify/certificate/${encodeURIComponent(c.certificateNumber)}`}
                        target="_blank"
                        className="p-1.5 hover:bg-gray-100 rounded inline-flex"
                        title="Verifizieren"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
