import { useState } from "react";
import { motion } from "motion/react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useShopSettings, formatAddressLines } from "../contexts/ShopSettingsContext.tsx";

export default function BookAppointment() {
  const settings = useShopSettings();
  const addressLines = formatAddressLines(settings.contactAddress);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Buchung fehlgeschlagen");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-40 pb-20 px-10 flex items-center justify-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md space-y-6">
          <CheckCircle2 size={64} className="mx-auto text-[#c5a059]" strokeWidth={1} />
          <h1 className="text-3xl font-serif italic">Terminanfrage gesendet</h1>
          <p className="text-white/70 font-light leading-relaxed">
            Wir bestätigen Ihren Besuch im Atelier per E-Mail oder Telefon.
          </p>
          <Link to="/" className="inline-block text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059] border-b border-[#c5a059] pb-1">
            Zur Startseite
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-40 pb-20 px-10">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4 text-center">
          <Calendar size={32} className="mx-auto text-[#c5a059]" strokeWidth={1.5} />
          <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">Concierge Service</h4>
          <h1 className="text-4xl md:text-5xl font-serif italic tracking-wider">Termin im Atelier</h1>
          <p className="text-white/70 font-light max-w-lg mx-auto">
            Persönliche Beratung in Köln — Uhren, Schmuck und Ankauf. Mo–Fr 10:00–18:00 Uhr.
          </p>
          {addressLines.length > 0 && (
            <p className="text-white/50 text-sm">{addressLines.join(" · ")}</p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 p-10 rounded-2xl space-y-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg p-3 text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-white/50">Vorname *</label>
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c5a059]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-white/50">Nachname *</label>
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c5a059]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-white/50">E-Mail *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c5a059]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-white/50">Telefon</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c5a059]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-white/50">Wunschdatum *</label>
              <input type="date" required value={form.preferredDate} min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c5a059]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-white/50">Uhrzeit *</label>
              <select required value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c5a059]">
                <option value="">Bitte wählen</option>
                {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((t) => (
                  <option key={t} value={t}>{t} Uhr</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] tracking-widest uppercase text-white/50">Anliegen / Wunschstück</label>
            <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="z.B. Beratung Rolex Submariner, Schmuck-Ankauf..."
              className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c5a059] resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#c5a059] text-black py-4 rounded-full text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-[#d4af37] transition-all disabled:opacity-50">
            {loading ? "Wird gesendet..." : "Termin anfragen"}
          </button>
        </form>
      </div>
    </div>
  );
}
