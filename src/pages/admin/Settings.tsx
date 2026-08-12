import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { auth } from "../../lib/firebase.ts";
import { useReloadShopSettings } from "../../contexts/ShopSettingsContext.tsx";

export default function Settings() {
  const reloadShopSettings = useReloadShopSettings();
  const [settings, setSettings] = useState<Record<string, string>>({
    shopName: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    bankName: "",
    bankIban: "",
    bankBic: "",
    bankAccountHolder: "",
    paymentInstructionsDe: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({
            ...prev,
            ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")])),
          }));
        }
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
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "shopName", label: "Shop Name" },
    { key: "contactEmail", label: "Kontakt E-Mail" },
    { key: "contactPhone", label: "Telefon" },
    { key: "contactAddress", label: "Adresse (Footer & Kontakt)", multiline: true },
    { key: "bankAccountHolder", label: "Kontoinhaber" },
    { key: "bankName", label: "Bank" },
    { key: "bankIban", label: "IBAN" },
    { key: "bankBic", label: "BIC" },
    { key: "paymentInstructionsDe", label: "Zahlungshinweise (DE)", multiline: true },
  ];

  if (loading) return <p className="text-gray-400 italic text-sm">Einstellungen werden geladen...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 text-gray-400">
        <SettingsIcon size={32} />
        <div>
          <h3 className="text-xl font-serif text-gray-900">Einstellungen</h3>
          <p className="text-sm text-gray-500">Diese Daten erscheinen im Footer, auf der Kontaktseite und beim Checkout.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        {fields.map(field => (
          <div key={field.key} className="space-y-2">
            <label className="block text-[10px] tracking-widest uppercase font-bold text-gray-400">{field.label}</label>
            {field.multiline ? (
              <textarea
                rows={3}
                value={settings[field.key] || ""}
                onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37] resize-none"
              />
            ) : (
              <input
                value={settings[field.key] || ""}
                onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            )}
          </div>
        ))}
      </div>

      <div className="pt-4 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#D4AF37] text-white px-8 py-3 rounded-full text-[10px] tracking-widest uppercase font-bold hover:bg-[#C19B2E] transition-all disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Speichern..." : "Änderungen speichern"}
        </button>
        {saved && <span className="text-green-600 text-sm">Gespeichert!</span>}
      </div>
    </div>
  );
}
