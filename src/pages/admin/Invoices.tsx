import { useState, useEffect } from "react";
import { FileText, Download, AlertTriangle } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface InvoiceRow {
  id: number;
  invoiceNumber: string;
  invoiceType: string;
  invoiceStatus: string;
  orderId: number;
  orderNumber: string;
  customerEmail?: string;
  customerName?: string;
  totalGross: string;
  paymentStatus: string;
  issuedAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  orderStatus: string;
  originalInvoiceNumber?: string | null;
  creditNoteNumber?: string | null;
  creditNoteId?: number | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
  CANCELLED: "Storniert",
};

const STATUS_LABELS: Record<string, string> = {
  ISSUED: "Ausgestellt",
  CANCELLED: "Storniert",
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsStatus, setSettingsStatus] = useState<{
    missingRequired: string[];
    missingRecommended: string[];
    emailConfigured: boolean;
  } | null>(null);

  const load = async () => {
    const token = await auth.currentUser?.getIdToken();
    const [invRes, statusRes] = await Promise.all([
      fetch("/api/admin/invoices", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/invoices/settings-status", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (invRes.ok) setInvoices(await invRes.json());
    if (statusRes.ok) setSettingsStatus(await statusRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const downloadPdf = async (id: number, invoiceNumber: string) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/admin/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return alert("PDF konnte nicht geladen werden.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fieldLabels: Record<string, string> = {
    legalCompanyName: "Rechtlicher Firmenname",
    contactAddress: "Unternehmensadresse",
    contactEmail: "Kontakt-E-Mail",
    bankName: "Bank",
    bankIban: "IBAN",
    bankBic: "BIC",
    bankAccountHolder: "Kontoinhaber",
    vatId: "USt-IdNr.",
    taxNumber: "Steuernummer",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <FileText size={32} className="text-gray-400" />
        <div>
          <h3 className="text-xl font-serif text-gray-900">Rechnungen</h3>
          <p className="text-sm text-gray-500">
            Rechnungsnummern werden erst bei Ausstellung vergeben. Stornierte Rechnungen bleiben erhalten.
          </p>
        </div>
      </div>

      {settingsStatus && (settingsStatus.missingRequired.length > 0 || !settingsStatus.emailConfigured) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle size={18} /> Rechnungs-Konfiguration unvollständig
          </div>
          {settingsStatus.missingRequired.length > 0 && (
            <p className="text-sm text-amber-900">
              Fehlende Pflichtangaben in Einstellungen:{" "}
              {settingsStatus.missingRequired.map((k) => fieldLabels[k] || k).join(", ")}
            </p>
          )}
          {settingsStatus.missingRecommended.length > 0 && (
            <p className="text-sm text-amber-800">
              Empfohlen (mind. eines): {settingsStatus.missingRecommended.map((k) => fieldLabels[k] || k).join(" oder ")}
            </p>
          )}
          {!settingsStatus.emailConfigured && (
            <p className="text-sm text-amber-800">
              E-Mail-Versand nicht konfiguriert — setzen Sie <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> in den Umgebungsvariablen.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 italic text-sm">Rechnungen werden geladen...</p>
      ) : invoices.length === 0 ? (
        <div className="border-2 border-dashed border-gray-100 rounded-xl p-12 text-center text-gray-500">
          Noch keine Rechnungen ausgestellt. Rechnungen werden manuell oder bei Zahlungseingang erzeugt.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[10px] tracking-widest uppercase text-gray-400">
                <th className="pb-4 pr-4">Nummer</th>
                <th className="pb-4 pr-4">Typ</th>
                <th className="pb-4 pr-4">Bestellnr.</th>
                <th className="pb-4 pr-4">Kunde</th>
                <th className="pb-4 pr-4">Ausgestellt</th>
                <th className="pb-4 pr-4">Storniert</th>
                <th className="pb-4 pr-4">Bezug</th>
                <th className="pb-4 pr-4">Betrag</th>
                <th className="pb-4 pr-4">Status</th>
                <th className="pb-4">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-4 pr-4 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="py-4 pr-4 text-xs">
                    {inv.invoiceType === "CREDIT_NOTE" ? "Storno" : "Rechnung"}
                  </td>
                  <td className="py-4 pr-4 font-mono text-xs">{inv.orderNumber}</td>
                  <td className="py-4 pr-4">
                    <p>{inv.customerName || inv.customerEmail || "—"}</p>
                    {inv.customerEmail && inv.customerName && (
                      <p className="text-xs text-gray-400">{inv.customerEmail}</p>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-xs whitespace-nowrap">
                    {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="py-4 pr-4 text-xs whitespace-nowrap">
                    {inv.cancelledAt ? new Date(inv.cancelledAt).toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="py-4 pr-4 text-xs font-mono">
                    {inv.originalInvoiceNumber || inv.creditNoteNumber || "—"}
                  </td>
                  <td className="py-4 pr-4 font-serif whitespace-nowrap">
                    {parseFloat(inv.totalGross).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      inv.invoiceStatus === "CANCELLED" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                    }`}>
                      {STATUS_LABELS[inv.invoiceStatus] || inv.invoiceStatus}
                    </span>
                  </td>
                  <td className="py-4">
                    <button
                      onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                      className="flex items-center gap-1 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg"
                    >
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
