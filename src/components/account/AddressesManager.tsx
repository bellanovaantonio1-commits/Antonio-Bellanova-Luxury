import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useLanguage } from "../../contexts/LanguageContext.tsx";

interface Address {
  id: number;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  isDefault: string;
}

const emptyForm = () => ({
  name: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
});

export default function AddressesManager() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/account/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAddresses(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.street.trim() || !form.postalCode.trim() || !form.city.trim()) {
      setError(t("cart.address.required"));
      return;
    }
    setError(null);
    const token = await user.getIdToken();
    const url = editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Speichern fehlgeschlagen.");
      return;
    }
    resetForm();
    await load();
  };

  const handleEdit = (addr: Address) => {
    setForm({
      name: addr.name,
      street: addr.street,
      postalCode: addr.postalCode,
      city: addr.city,
      country: addr.country,
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!user || !confirm(t("account.addresses.deleteConfirm"))) return;
    const token = await user.getIdToken();
    await fetch(`/api/account/addresses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  const setDefault = async (id: number) => {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/account/addresses/${id}/default`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  if (loading) {
    return <p className="text-white/30 italic text-sm">{t("common.loading")}</p>;
  }

  return (
    <section className="p-10 bg-white/5 rounded-2xl border border-white/10 space-y-8">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-sm uppercase tracking-widest text-[#c5a059]">{t("account.addresses.title")}</h3>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}
            className="text-[10px] tracking-widest uppercase font-bold text-[#c5a059] border-b border-[#c5a059]/30 pb-1 hover:border-[#c5a059] transition-colors"
          >
            {t("account.addresses.add")}
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {showForm && (
        <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-white/5">
          {(["name", "street", "postalCode", "city", "country"] as const).map((field) => (
            <div key={field}>
              <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">
                {t(`cart.address.${field === "postalCode" ? "postal" : field}`)}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
              />
            </div>
          ))}
          <div className="flex gap-4 pt-2">
            <button onClick={handleSave} className="bg-[#c5a059] text-black px-6 py-3 rounded-full text-[10px] tracking-widest uppercase font-bold">
              {t("account.addresses.save")}
            </button>
            <button onClick={resetForm} className="text-white/40 text-[10px] tracking-widest uppercase">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <p className="text-white/30 italic">{t("account.addresses.empty")}</p>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="p-6 bg-black/20 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {addr.isDefault === "true" && (
                  <span className="text-[9px] uppercase tracking-widest text-[#c5a059] font-bold block mb-2">
                    {t("account.addresses.default")}
                  </span>
                )}
                <p className="font-light">{addr.name}</p>
                <p className="text-sm text-white/50">{addr.street}</p>
                <p className="text-sm text-white/50">{addr.postalCode} {addr.city}, {addr.country}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {addr.isDefault !== "true" && (
                  <button onClick={() => setDefault(addr.id)} className="text-[10px] tracking-widest uppercase text-[#c5a059]">
                    {t("account.addresses.setDefault")}
                  </button>
                )}
                <button onClick={() => handleEdit(addr)} className="text-[10px] tracking-widest uppercase text-white/40 hover:text-white">
                  {t("account.addresses.edit")}
                </button>
                <button onClick={() => handleDelete(addr.id)} className="text-[10px] tracking-widest uppercase text-red-400/60 hover:text-red-400">
                  {t("account.addresses.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
