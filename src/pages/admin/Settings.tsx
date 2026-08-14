import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { auth } from "../../lib/firebase.ts";
import { useReloadShopSettings } from "../../contexts/ShopSettingsContext.tsx";

export default function Settings() {
  const reloadShopSettings = useReloadShopSettings();
  const [settings, setSettings] = useState<Record<string, string>>({
    shopName: "",
    legalCompanyName: "",
    shopBrandName: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    bankName: "",
    bankIban: "",
    bankBic: "",
    bankAccountHolder: "",
    paymentInstructionsDe: "",
    paymentInstructionsEn: "",
    vatId: "",
    taxNumber: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<{
    missingRequired: string[];
    missingRecommended: string[];
    emailConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const [settingsRes, statusRes] = await Promise.all([
          fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/invoices/settings-status", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings((prev) => ({
            ...prev,
            ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")])),
          }));
        }
        if (statusRes.ok) setInvoiceStatus(await statusRes.json());
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      reloadShopSettings();
      const statusRes = await fetch("/api/admin/invoices/settings-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statusRes.ok) setInvoiceStatus(await statusRes.json());
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
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

  const sections = [
    {
      title: "Rechnungswesen (Pflichtangaben)",
      desc: "Diese Angaben erscheinen auf rechtsgültigen Rechnungen unter dem eingetragenen Unternehmensnamen.",
      fields: [
        { key: "legalCompanyName", label: "Rechtlicher Firmenname (Impressum/Rechnung)" },
        { key: "shopBrandName", label: "Shop-/Markenname (optional, z.B. Antonio Bellanova Luxury)" },
        { key: "contactAddress", label: "Unternehmensadresse (mehrzeilig)", multiline: true },
        { key: "contactEmail", label: "Kontakt E-Mail (Rechnung)" },
        { key: "contactPhone", label: "Telefon" },
        { key: "vatId", label: "USt-IdNr." },
        { key: "taxNumber", label: "Steuernummer (falls keine USt-IdNr.)" },
        { key: "bankAccountHolder", label: "Kontoinhaber" },
        { key: "bankName", label: "Bank" },
        { key: "bankIban", label: "IBAN" },
        { key: "bankBic", label: "BIC" },
        { key: "paymentInstructionsDe", label: "Zahlungshinweise Rechnung (DE)", multiline: true },
        { key: "paymentInstructionsEn", label: "Zahlungshinweise Rechnung (EN)", multiline: true },
      ],
    },
    {
      title: "Shop & Kontakt",
      desc: "Erscheint im Footer, auf der Kontaktseite und im Marketing.",
      fields: [
        { key: "shopName", label: "Shop Name (Anzeige)" },
        { key: "instagramUrl", label: "Instagram URL" },
        { key: "facebookUrl", label: "Facebook URL" },
        { key: "whatsappNumber", label: "WhatsApp (nur Ziffern, z.B. 491637607805)" },
        { key: "googleMapsUrl", label: "Google Maps Link (Anfahrt)" },
      ],
    },
    {
      title: "Produktdetailseite (Vertrauen)",
      desc: "Texte für Echtheits-Hinweis und MwSt./§25a auf der Produktseite.",
      fields: [
        { key: "authenticityNoteDe", label: "Echtheits-Hinweis (DE)", multiline: true },
        { key: "authenticityNoteEn", label: "Echtheits-Hinweis (EN)", multiline: true },
        { key: "marginTaxNoteDe", label: "MwSt./§25a Hinweis (DE)", multiline: true },
        { key: "marginTaxNoteEn", label: "MwSt./§25a Hinweis (EN)", multiline: true },
      ],
    },
    {
      title: "Versandzonen",
      desc: "Versandkosten im Warenkorb (EUR). Ab „Versand frei ab“ wird Versand kostenlos.",
      fields: [
        { key: "shippingCostDe", label: "Versand Deutschland (EUR)" },
        { key: "shippingCostEu", label: "Versand EU (EUR)" },
        { key: "shippingCostWorld", label: "Versand International (EUR)" },
        { key: "shippingExpressCostDe", label: "Express Deutschland (EUR)" },
        { key: "shippingExpressCostEu", label: "Express EU (EUR)" },
        { key: "shippingExpressCostWorld", label: "Express International (EUR)" },
        { key: "shippingFreeFrom", label: "Versand frei ab Bestellwert (EUR)" },
        { key: "pickupNoteDe", label: "Abhol-Hinweis (DE)", multiline: true },
        { key: "pickupNoteEn", label: "Abhol-Hinweis (EN)", multiline: true },
      ],
    },
    {
      title: "Vertrauen & Home",
      desc: "Testimonials auf der Startseite und Zertifikat-Hinweis auf der Produktseite.",
      fields: [
        { key: "certificateNoteDe", label: "Zertifikat-Hinweis (DE)", multiline: true },
        { key: "certificateNoteEn", label: "Zertifikat-Hinweis (EN)", multiline: true },
        { key: "testimonial1De", label: "Testimonial 1 (DE)", multiline: true },
        { key: "testimonial1En", label: "Testimonial 1 (EN)", multiline: true },
        { key: "testimonial1Author", label: "Testimonial Autor" },
      ],
    },
    {
      title: "Preis auf Anfrage",
      desc: "Produkte ab diesem Preis (EUR) zeigen „Preis auf Anfrage“ statt Warenkorb-Button.",
      fields: [{ key: "priceOnRequestFrom", label: "Schwellenwert Preis auf Anfrage (EUR)" }],
    },
  ];

  if (loading) return <p className="text-gray-400 italic text-sm">Einstellungen werden geladen...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 text-gray-400">
        <SettingsIcon size={32} />
        <div>
          <h3 className="text-xl font-serif text-gray-900">Einstellungen</h3>
          <p className="text-sm text-gray-500">Unternehmens-, Rechnungs- und Shopdaten zentral verwalten.</p>
        </div>
      </div>

      {invoiceStatus && (invoiceStatus.missingRequired.length > 0 || invoiceStatus.missingRecommended.length > 0 || !invoiceStatus.emailConfigured) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle size={18} /> Rechnungs-Konfiguration unvollständig
          </div>
          {invoiceStatus.missingRequired.length > 0 && (
            <p className="text-sm text-amber-900">
              Fehlende Pflichtangaben: {invoiceStatus.missingRequired.map((k) => fieldLabels[k] || k).join(", ")}
            </p>
          )}
          {invoiceStatus.missingRecommended.length > 0 && (
            <p className="text-sm text-amber-800">
              Empfohlen (mindestens eines): {invoiceStatus.missingRecommended.map((k) => fieldLabels[k] || k).join(" oder ")}
            </p>
          )}
          {!invoiceStatus.emailConfigured && (
            <p className="text-sm text-amber-800">
              E-Mail-Versand nicht konfiguriert — setzen Sie <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> und <code className="bg-amber-100 px-1 rounded">EMAIL_FROM</code> in den Umgebungsvariablen.
            </p>
          )}
        </div>
      )}

      <div className="max-w-2xl rounded-2xl border border-[#D4AF37]/20 bg-[#faf8f3] p-6">
        <h4 className="text-sm font-serif text-gray-900">Preise & Zahlungen</h4>
        <p className="text-xs text-gray-500 mt-2">
          Stripe-Gebühren, Rundung, Zahlungsarten und Preis-Neuberechnung werden im eigenen Admin-Bereich verwaltet.
        </p>
        <Link
          to="/admin/pricing"
          className="inline-block mt-4 text-[10px] uppercase tracking-widest font-bold text-[#9a7b2e] hover:text-[#D4AF37]"
        >
          → Preise & Zahlungen öffnen
        </Link>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-6 max-w-2xl">
          <div>
            <h4 className="text-sm font-serif text-gray-900">{section.title}</h4>
            <p className="text-xs text-gray-500 mt-1">{section.desc}</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-[10px] tracking-widest uppercase font-bold text-gray-400">{field.label}</label>
                {field.multiline ? (
                  <textarea
                    rows={3}
                    value={settings[field.key] || ""}
                    onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37] resize-none"
                  />
                ) : (
                  <input
                    value={settings[field.key] || ""}
                    onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-4 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#D4AF37] text-white px-8 py-3 rounded-xl text-[10px] tracking-widest uppercase font-bold hover:bg-[#c5a059] transition-colors disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Speichern..." : "Speichern"}
        </button>
        {saved && <span className="text-green-600 text-sm">Gespeichert!</span>}
      </div>
    </div>
  );
}
