import { useCallback, useEffect, useState } from "react";
import { Scale, Save, AlertTriangle, History, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { auth } from "../../lib/firebase.ts";

const DOC_KEYS = ["impressum", "privacy", "terms", "withdrawal", "withdrawal_form", "shipping", "payment"] as const;
type LegalDocumentKey = (typeof DOC_KEYS)[number];

const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentKey, { de: string; en: string }> = {
  impressum: { de: "Impressum", en: "Legal Notice" },
  privacy: { de: "Datenschutz", en: "Privacy Policy" },
  terms: { de: "AGB", en: "Terms & Conditions" },
  withdrawal: { de: "Widerrufsbelehrung", en: "Withdrawal Policy" },
  withdrawal_form: { de: "Muster-Widerrufsformular", en: "Withdrawal Form" },
  shipping: { de: "Versand & Lieferung", en: "Shipping & Delivery" },
  payment: { de: "Zahlungsarten", en: "Payment Methods" },
};

const COMPANY_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "legalCompanyName", label: "Rechtlicher Firmenname" },
  { key: "shopBrandName", label: "Shop-/Markenname" },
  { key: "legalForm", label: "Rechtsform" },
  { key: "authorizedRepresentative", label: "Vertretungsberechtigte Person" },
  { key: "contactAddress", label: "Adresse", multiline: true },
  { key: "contactEmail", label: "E-Mail" },
  { key: "contactPhone", label: "Telefon" },
  { key: "vatId", label: "USt-IdNr." },
  { key: "taxNumber", label: "Steuernummer" },
  { key: "tradeRegisterCourt", label: "Registergericht" },
  { key: "tradeRegisterNumber", label: "Registernummer" },
  { key: "economicId", label: "Wirtschafts-ID" },
  { key: "supervisoryAuthority", label: "Aufsichtsbehörde" },
  { key: "contentResponsible", label: "Verantwortlich für Inhalt (§ 18 MStV)" },
  { key: "bankAccountHolder", label: "Kontoinhaber" },
  { key: "bankName", label: "Bank" },
  { key: "bankIban", label: "IBAN" },
  { key: "bankBic", label: "BIC" },
  { key: "paymentInstructionsDe", label: "Zahlungshinweise (DE)", multiline: true },
  { key: "paymentInstructionsEn", label: "Zahlungshinweise (EN)", multiline: true },
];

export default function LegalCompliance() {
  const [tab, setTab] = useState<"company" | "documents">("company");
  const [company, setCompany] = useState<Record<string, string>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [docKey, setDocKey] = useState<LegalDocumentKey>("terms");
  const [docLang, setDocLang] = useState<"de" | "en">("de");
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [versions, setVersions] = useState<{ id: number; version: number; isActive: boolean; createdAt: string; changeNote: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/admin/legal/overview", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    setCompany(
      Object.fromEntries(
        COMPANY_FIELDS.map((f) => [f.key, String(data.settings?.[f.key] ?? "")])
      )
    );
    setMissingFields(data.missingFields || []);
  }, []);

  const loadDocument = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/admin/legal/documents/${docKey}?lang=${docLang}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setTitle(data.active?.title || LEGAL_DOCUMENT_LABELS[docKey][docLang]);
    setContentHtml(data.active?.contentHtml || "");
    setVersions(data.versions || []);
  }, [docKey, docLang]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (tab === "documents") loadDocument();
  }, [tab, loadDocument]);

  const saveCompany = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/legal/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(company),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen.");
      setMessage("Unternehmensdaten gespeichert.");
      await loadOverview();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/legal/documents/${docKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: docLang, title, contentHtml, changeNote, activate: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Speichern fehlgeschlagen.");
      }
      setMessage(`Neue Version gespeichert (${LEGAL_DOCUMENT_LABELS[docKey][docLang]}).`);
      setChangeNote("");
      await loadDocument();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  };

  const activateVersion = async (id: number) => {
    const token = await auth.currentUser?.getIdToken();
    await fetch(`/api/admin/legal/documents/version/${id}/activate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadDocument();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Scale className="text-[#D4AF37]" size={28} />
        <div>
          <h3 className="text-xl font-serif text-gray-900">Rechtliches & Unternehmen</h3>
          <p className="text-sm text-gray-500">Zentrale Verwaltung von Unternehmensdaten und Rechtstexten mit Versionierung.</p>
        </div>
      </div>

      {missingFields.length > 0 && (
        <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Angaben erforderlich / rechtlich zu prüfen</p>
            <p className="mt-1">Fehlende Felder: {missingFields.join(", ")}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-100 pb-2">
        <button type="button" onClick={() => setTab("company")} className={`px-4 py-2 text-xs uppercase tracking-widest font-bold rounded-lg ${tab === "company" ? "bg-gray-900 text-white" : "text-gray-500"}`}>
          Unternehmen
        </button>
        <button type="button" onClick={() => setTab("documents")} className={`px-4 py-2 text-xs uppercase tracking-widest font-bold rounded-lg ${tab === "documents" ? "bg-gray-900 text-white" : "text-gray-500"}`}>
          Rechtstexte
        </button>
      </div>

      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2">{message}</p>}

      {tab === "company" && (
        <div className="grid gap-4 md:grid-cols-2">
          {COMPANY_FIELDS.map((field) => (
            <div key={field.key} className={field.multiline ? "md:col-span-2" : ""}>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{field.label}</label>
              {field.multiline ? (
                <textarea
                  value={company[field.key] || ""}
                  onChange={(e) => setCompany((p) => ({ ...p, [field.key]: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm"
                />
              ) : (
                <input
                  value={company[field.key] || ""}
                  onChange={(e) => setCompany((p) => ({ ...p, [field.key]: e.target.value }))}
                  className="mt-1 w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm"
                  placeholder={!company[field.key] ? "Angabe erforderlich" : ""}
                />
              )}
            </div>
          ))}
          <div className="md:col-span-2">
            <button type="button" onClick={saveCompany} disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-white text-xs uppercase tracking-widest font-bold rounded-lg disabled:opacity-50">
              <Save size={14} /> Speichern
            </button>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <select value={docKey} onChange={(e) => setDocKey(e.target.value as LegalDocumentKey)} className="px-4 py-2 border border-gray-100 rounded-lg text-sm">
              {DOC_KEYS.map((k) => (
                <option key={k} value={k}>{LEGAL_DOCUMENT_LABELS[k].de}</option>
              ))}
            </select>
            <select value={docLang} onChange={(e) => setDocLang(e.target.value as "de" | "en")} className="px-4 py-2 border border-gray-100 rounded-lg text-sm">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
            <Link to={`/${docKey === "impressum" ? "legal" : docKey === "terms" ? "terms" : docKey === "privacy" ? "privacy" : docKey === "withdrawal" ? "withdrawal" : docKey === "withdrawal_form" ? "withdrawal-form" : docKey === "shipping" ? "shipping" : "payment-info"}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-[#9a7b2e] underline">
              <ExternalLink size={12} /> Vorschau
            </Link>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Titel</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Inhalt (HTML, Platzhalter z.&nbsp;B. {"{{contactEmail}}"})</label>
            <textarea value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} rows={18} className="mt-1 w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm font-mono" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Änderungsnotiz (neue Version)</label>
            <input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} className="mt-1 w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm" placeholder="z. B. Stripe-Hinweis ergänzt" />
          </div>
          <button type="button" onClick={saveDocument} disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-xs uppercase tracking-widest font-bold rounded-lg disabled:opacity-50">
            <Save size={14} /> Neue Version veröffentlichen
          </button>

          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 font-bold">
              <History size={14} /> Versionen
            </div>
            <div className="divide-y divide-gray-100">
              {versions.map((v) => (
                <div key={v.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono">v{v.version}</span>
                    {v.isActive && <span className="ml-2 text-[10px] uppercase bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Aktiv</span>}
                    <p className="text-xs text-gray-400 mt-1">{v.changeNote || "—"} · {new Date(v.createdAt).toLocaleString("de-DE")}</p>
                  </div>
                  {!v.isActive && (
                    <button type="button" onClick={() => activateVersion(v.id)} className="text-xs text-[#9a7b2e] font-bold uppercase tracking-widest">
                      Aktivieren
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400">Hinweis: Rechtstexte ersetzen keine individuelle anwaltliche Prüfung.</p>
        </div>
      )}
    </div>
  );
}
