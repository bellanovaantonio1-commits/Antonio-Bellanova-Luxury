import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CreditCard,
  Wallet,
  CircleDollarSign,
  Layers,
  RefreshCw,
  History,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { auth } from "../../lib/firebase.ts";
import { useReloadShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import {
  calculateShopPriceFromBase,
  parsePaymentMethodsJson,
  parseShopPricingConfig,
  PRICING_MODEL_LABELS,
  ROUNDING_MODE_LABELS,
  serializePaymentMethods,
  VALID_ROUNDING_STEPS,
  type PaymentMethodConfig,
  type RoundingMode,
} from "../../lib/shopPricing.ts";

type TabId =
  | "calculation"
  | "stripe"
  | "payments"
  | "rounding"
  | "models"
  | "recalculate"
  | "audit";

interface PricingSettingsForm {
  stripeFeePercent: string;
  stripeFeeFixed: string;
  premiumCardFeePercent: string;
  premiumCardFeeFixed: string;
  internationalCardFeePercent: string;
  internationalCardFeeFixed: string;
  stripeCurrency: string;
  roundingStep: string;
  roundingMode: string;
  defaultPricingModel: string;
  stripeEnabled: string;
  bankTransferEnabled: string;
  prepaymentEnabled: string;
  paymentMethodsJson: string;
}

interface AuditEntry {
  id: number;
  changedAt: string;
  adminName: string | null;
  adminEmail: string | null;
  settingLabel: string | null;
  oldValue: string | null;
  newValue: string | null;
}

interface RecalcPreview {
  count: number;
  changes: {
    id: number;
    name: string;
    sku: string;
    oldPrice: number;
    newPrice: number;
    oldDiscount: number;
    newDiscount: number;
  }[];
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "calculation", label: "Preisberechnung", icon: <Calculator size={16} /> },
  { id: "stripe", label: "Stripe", icon: <CreditCard size={16} /> },
  { id: "payments", label: "Zahlungsarten", icon: <Wallet size={16} /> },
  { id: "rounding", label: "Rundung", icon: <CircleDollarSign size={16} /> },
  { id: "models", label: "Preismodelle", icon: <Layers size={16} /> },
  { id: "recalculate", label: "Preis-Neuberechnung", icon: <RefreshCw size={16} /> },
  { id: "audit", label: "Änderungsverlauf", icon: <History size={16} /> },
];

function formatEur(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer">
      <span className="text-sm text-gray-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-[#D4AF37]" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] tracking-widest uppercase font-bold text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 outline-none focus:ring-1 focus:ring-[#D4AF37]"
      />
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

export default function PricingPayments() {
  const reloadShopSettings = useReloadShopSettings();
  const [tab, setTab] = useState<TabId>("calculation");
  const [form, setForm] = useState<PricingSettingsForm | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [stripeEnvConfigured, setStripeEnvConfigured] = useState(false);
  const [stripeAvailable, setStripeAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoBasePrice, setDemoBasePrice] = useState("1000");
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [recalcPreview, setRecalcPreview] = useState<RecalcPreview | null>(null);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const patchForm = useCallback((patch: Partial<PricingSettingsForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const [pricingRes, auditRes] = await Promise.all([
        fetch("/api/admin/pricing-payments", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/pricing-payments/audit-log", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!pricingRes.ok) throw new Error("Einstellungen konnten nicht geladen werden.");
      const data = await pricingRes.json();
      setForm(data.settings);
      setPaymentMethods(parsePaymentMethodsJson(data.settings.paymentMethodsJson));
      setStripeEnvConfigured(Boolean(data.stripeEnvConfigured));
      setStripeAvailable(Boolean(data.stripeAvailable));
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLog(auditData.entries || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pricingConfig = useMemo(() => {
    if (!form) return null;
    return parseShopPricingConfig(form as unknown as Record<string, string>);
  }, [form]);

  const demoBreakdown = useMemo(() => {
    if (!pricingConfig) return null;
    const base = parseFloat(demoBasePrice);
    if (!Number.isFinite(base) || base <= 0) return null;
    try {
      return calculateShopPriceFromBase(base, pricingConfig);
    } catch {
      return null;
    }
  }, [demoBasePrice, pricingConfig]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const payload = {
        ...form,
        paymentMethodsJson: serializePaymentMethods(paymentMethods),
      };
      const res = await fetch("/api/admin/pricing-payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen.");
      setForm(data.settings);
      setPaymentMethods(parsePaymentMethodsJson(data.settings.paymentMethodsJson));
      setStripeEnvConfigured(Boolean(data.stripeEnvConfigured));
      setStripeAvailable(Boolean(data.stripeAvailable));
      reloadShopSettings();
      const auditRes = await fetch("/api/admin/pricing-payments/audit-log", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLog(auditData.entries || []);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const updatePaymentMethod = (index: number, patch: Partial<PaymentMethodConfig>) => {
    setPaymentMethods((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const handleRecalcPreview = async () => {
    setRecalcLoading(true);
    setRecalcPreview(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/products/recalculate-prices/preview", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vorschau fehlgeschlagen");
      setRecalcPreview(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Vorschau fehlgeschlagen");
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleRecalcApply = async () => {
    if (
      !confirm(
        "Möchten Sie die Preise wirklich neu berechnen? Die aktuellen Preisregeln werden auf alle Produkte mit dem Preismodell ‚Automatischer Vorkasse-Rabatt‘ angewendet."
      )
    ) {
      return;
    }
    setRecalcLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/products/recalculate-prices/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Neuberechnung fehlgeschlagen");
      alert(data.message || "Preise aktualisiert.");
      setRecalcPreview(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Neuberechnung fehlgeschlagen");
    } finally {
      setRecalcLoading(false);
    }
  };

  if (loading || !form) {
    return <p className="text-gray-400 italic text-sm">Preise & Zahlungen werden geladen…</p>;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h3 className="text-xl font-serif text-gray-900">Preise & Zahlungen</h3>
        <p className="text-sm text-gray-500 mt-1">
          Zentrale Steuerzentrale für Preisregeln, Stripe-Gebühren, Rundung und Zahlungsarten.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!stripeEnvConfigured && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Stripe-Umgebungsvariable fehlt</p>
            <p className="mt-1 text-amber-800">
              Setzen Sie <code className="bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> in den Umgebungsvariablen.
              Der Admin-Schalter allein reicht nicht für Live-Zahlungen.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-[#D4AF37] text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "calculation" && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-100 p-6 bg-gray-50/30 space-y-4">
            <h4 className="text-sm font-serif text-gray-900">Live-Preisberechnung (Vorkasse-Modell)</h4>
            <p className="text-xs text-gray-500">
              Formel: (Basispreis + Fixgebühr) ÷ (1 − Prozentgebühr), danach Rundung gemäß Einstellungen.
            </p>
            <Field
              label="Basispreis zum Testen (EUR)"
              value={demoBasePrice}
              onChange={setDemoBasePrice}
              type="number"
            />
            {demoBreakdown && (
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {[
                  ["Basispreis", formatEur(demoBreakdown.basePrice)],
                  ["Berechneter Stripe-Preis", formatEur(demoBreakdown.rawStripePrice)],
                  ["Gerundeter Shoppreis", formatEur(demoBreakdown.shopPrice)],
                  ["Vorkasse-Rabatt", formatEur(demoBreakdown.prepaymentDiscount)],
                  ["Geschätzte Stripe-Gebühr", formatEur(demoBreakdown.estimatedStripeFee)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between p-3 rounded-lg bg-white border border-gray-100 text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-mono font-medium text-gray-900">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 space-y-2">
            <p>
              <strong>Standardpreis:</strong> Fester Verkaufspreis — gleich für Stripe und Banküberweisung.
            </p>
            <p>
              <strong>Automatischer Vorkasse-Rabatt:</strong> Basispreis = gewünschter Vorkasse-Erlös; Shop zeigt
              gerundeten Preis, Bank zahlt Basispreis.
            </p>
          </div>
        </section>
      )}

      {tab === "stripe" && (
        <section className="space-y-6">
          <Toggle
            label="Stripe im Shop aktivieren"
            checked={form.stripeEnabled !== "false"}
            onChange={(v) => patchForm({ stripeEnabled: v ? "true" : "false" })}
          />
          <p className="text-xs text-gray-500">
            Status: {stripeAvailable ? "Verfügbar (Schalter + API-Key)" : "Nicht verfügbar"}
          </p>
          <Field label="Währung" value={form.stripeCurrency} onChange={(v) => patchForm({ stripeCurrency: v })} hint="z. B. EUR" />
          <div className="grid sm:grid-cols-2 gap-6">
            <Field
              label="Standardkarte — Prozent (%)"
              value={form.stripeFeePercent}
              onChange={(v) => patchForm({ stripeFeePercent: v })}
              type="number"
            />
            <Field
              label="Standardkarte — Fixgebühr (EUR)"
              value={form.stripeFeeFixed}
              onChange={(v) => patchForm({ stripeFeeFixed: v })}
              type="number"
            />
            <Field
              label="Premiumkarte — Prozent (%)"
              value={form.premiumCardFeePercent}
              onChange={(v) => patchForm({ premiumCardFeePercent: v })}
              type="number"
            />
            <Field
              label="Premiumkarte — Fixgebühr (EUR)"
              value={form.premiumCardFeeFixed}
              onChange={(v) => patchForm({ premiumCardFeeFixed: v })}
              type="number"
            />
            <Field
              label="Internationale Karte — Prozent (%)"
              value={form.internationalCardFeePercent}
              onChange={(v) => patchForm({ internationalCardFeePercent: v })}
              type="number"
            />
            <Field
              label="Internationale Karte — Fixgebühr (EUR)"
              value={form.internationalCardFeeFixed}
              onChange={(v) => patchForm({ internationalCardFeeFixed: v })}
              type="number"
            />
          </div>
          <p className="text-xs text-gray-400">
            Für die Shop-Preisberechnung wird die Standardkarten-Gebühr verwendet. Premium- und internationale
            Gebühren dienen der Planung und können später erweitert werden.
          </p>
        </section>
      )}

      {tab === "payments" && (
        <section className="space-y-6">
          <Toggle
            label="Banküberweisung global aktiv"
            checked={form.bankTransferEnabled !== "false"}
            onChange={(v) => patchForm({ bankTransferEnabled: v ? "true" : "false" })}
          />
          <Toggle
            label="Vorkasse global aktiv"
            checked={form.prepaymentEnabled !== "false"}
            onChange={(v) => patchForm({ prepaymentEnabled: v ? "true" : "false" })}
          />
          <div className="space-y-4">
            {paymentMethods.map((method, idx) => (
              <div key={method.id} className="rounded-2xl border border-gray-100 p-5 space-y-4 bg-gray-50/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#9a7b2e]">
                    {method.id}
                  </span>
                  <Toggle
                    label="Aktiv"
                    checked={method.enabled}
                    onChange={(v) => updatePaymentMethod(idx, { enabled: v })}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Anzeigename"
                    value={method.name}
                    onChange={(v) => updatePaymentMethod(idx, { name: v })}
                  />
                  <Field
                    label="Sortierung"
                    value={String(method.sortOrder)}
                    onChange={(v) => updatePaymentMethod(idx, { sortOrder: parseInt(v, 10) || idx + 1 })}
                    type="number"
                  />
                </div>
                <Field
                  label="Beschreibung"
                  value={method.description}
                  onChange={(v) => updatePaymentMethod(idx, { description: v })}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "rounding" && (
        <section className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] tracking-widest uppercase font-bold text-gray-400">
              Rundungsschritt
            </label>
            <select
              value={form.roundingStep}
              onChange={(e) => patchForm({ roundingStep: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              {VALID_ROUNDING_STEPS.map((s) => (
                <option key={s} value={s}>
                  {s} €
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] tracking-widest uppercase font-bold text-gray-400">
              Rundungsart
            </label>
            <select
              value={form.roundingMode}
              onChange={(e) => patchForm({ roundingMode: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              {(Object.keys(ROUNDING_MODE_LABELS) as RoundingMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {ROUNDING_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {tab === "models" && (
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] tracking-widest uppercase font-bold text-gray-400">
              Standard-Preismodell für neue Produkte
            </label>
            <select
              value={form.defaultPricingModel}
              onChange={(e) => patchForm({ defaultPricingModel: e.target.value })}
              className="w-full max-w-md px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              <option value="STANDARD">{PRICING_MODEL_LABELS.STANDARD}</option>
              <option value="PREPAYMENT_DISCOUNT">{PRICING_MODEL_LABELS.PREPAYMENT_DISCOUNT}</option>
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/30">
              <h5 className="font-serif text-gray-900 mb-2">{PRICING_MODEL_LABELS.STANDARD}</h5>
              <p className="text-xs text-gray-500 leading-relaxed">
                Fester Verkaufspreis pro Produkt. Gleicher Betrag für Stripe und Banküberweisung. Kein automatischer
                Rabatt.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-[#D4AF37]/20 bg-[#faf8f3]">
              <h5 className="font-serif text-gray-900 mb-2">{PRICING_MODEL_LABELS.PREPAYMENT_DISCOUNT}</h5>
              <p className="text-xs text-gray-500 leading-relaxed">
                Basispreis = gewünschter Vorkasse-Erlös. Shop-Preis wird inkl. Stripe-Gebühr berechnet und gerundet.
                Vorkasse-Rabatt wird automatisch abgeleitet.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Das Preismodell wird pro Produkt unter Produkte → Bearbeiten festgelegt.
          </p>
        </section>
      )}

      {tab === "recalculate" && (
        <section className="space-y-4 rounded-2xl border border-gray-100 p-6 bg-gray-50/30">
          <h4 className="text-sm font-serif text-gray-900">Alle Preise neu berechnen</h4>
          <p className="text-xs text-gray-500">
            Nur Produkte mit „Automatischer Vorkasse-Rabatt“ werden angepasst. Standardpreise bleiben unverändert.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRecalcPreview}
              disabled={recalcLoading}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-[10px] uppercase tracking-widest font-bold hover:bg-white disabled:opacity-50"
            >
              Vorschau
            </button>
            {recalcPreview && recalcPreview.count > 0 && (
              <button
                type="button"
                onClick={handleRecalcApply}
                disabled={recalcLoading}
                className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-black disabled:opacity-50"
              >
                {recalcPreview.count} Produkte aktualisieren
              </button>
            )}
          </div>
          {recalcPreview && (
            <div className="overflow-x-auto">
              {recalcPreview.count === 0 ? (
                <p className="text-sm text-gray-500">Keine Änderungen nötig.</p>
              ) : (
                <table className="w-full text-xs text-left min-w-[520px]">
                  <thead>
                    <tr className="text-gray-400 uppercase tracking-widest">
                      <th className="pb-2 pr-4">Produkt</th>
                      <th className="pb-2 pr-4">Alter Preis</th>
                      <th className="pb-2 pr-4">Neuer Preis</th>
                      <th className="pb-2 pr-4">Alter Rabatt</th>
                      <th className="pb-2">Neuer Rabatt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recalcPreview.changes.map((c) => (
                      <tr key={c.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4">{c.oldPrice.toFixed(2)} €</td>
                        <td className="py-2 pr-4 font-bold">{c.newPrice.toFixed(2)} €</td>
                        <td className="py-2 pr-4">{c.oldDiscount.toFixed(2)} €</td>
                        <td className="py-2">{c.newDiscount.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "audit" && (
        <section className="overflow-x-auto">
          {auditLog.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Änderungen protokolliert.</p>
          ) : (
            <table className="w-full text-xs text-left min-w-[640px]">
              <thead>
                <tr className="text-gray-400 uppercase tracking-widest">
                  <th className="pb-3 pr-4">Datum</th>
                  <th className="pb-3 pr-4">Admin</th>
                  <th className="pb-3 pr-4">Einstellung</th>
                  <th className="pb-3 pr-4">Alt</th>
                  <th className="pb-3">Neu</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-100">
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDate(entry.changedAt)}</td>
                    <td className="py-3 pr-4">
                      {entry.adminName || entry.adminEmail || "Admin"}
                    </td>
                    <td className="py-3 pr-4">{entry.settingLabel || entry.settingKey}</td>
                    <td className="py-3 pr-4 text-gray-500">{entry.oldValue}</td>
                    <td className="py-3 font-medium">{entry.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab !== "recalculate" && tab !== "audit" && (
        <div className="pt-4 flex flex-wrap items-center gap-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#D4AF37] text-white px-8 py-3 rounded-xl text-[10px] tracking-widest uppercase font-bold hover:bg-[#c5a059] transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Speichern…" : "Einstellungen speichern"}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle2 size={16} /> Gespeichert
            </span>
          )}
        </div>
      )}
    </div>
  );
}
