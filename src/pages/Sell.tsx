import React, { useState } from "react";
import { motion } from "motion/react";
import { Camera, CheckCircle2 } from "lucide-react";

export default function Sell() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productType: "watch", brand: "", model: "", condition: "new",
    priceExpectation: "", description: "", firstName: "", lastName: "", email: "", phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Senden");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen page-pt page-pb page-x flex items-center justify-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md space-y-6">
          <CheckCircle2 size={64} className="mx-auto text-[#c5a059]" strokeWidth={1} />
          <h1 className="text-3xl font-serif italic tracking-wider">Vielen Dank</h1>
          <p className="text-[#F4F4F4]/60 font-light leading-relaxed">
            Ihre Anfrage für den Ankauf wurde erfolgreich übermittelt. Einer unserer Experten wird sich in Kürze mit Ihnen in Verbindung setzen.
          </p>
          <button onClick={() => setSubmitted(false)}
            className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059] border-b border-[#c5a059] pb-1 hover:opacity-70 transition-opacity">
            Weitere Anfrage senden
          </button>
        </motion.div>
      </div>
    );
  }

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen page-pt page-pb page-x">
      <div className="max-w-4xl mx-auto space-y-20">
        <header className="text-center space-y-6">
          <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">Service</h4>
          <h1 className="text-4xl md:text-5xl font-serif italic tracking-wider">Ankauf & Inzahlungnahme</h1>
          <p className="text-[#F4F4F4]/50 max-w-2xl mx-auto font-light leading-relaxed">
            Wir bieten Ihnen marktgerechte Konditionen für Ihre hochwertigen Zeitmesser und Schmuckstücke.
          </p>
        </header>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-sm tracking-[0.2em] uppercase font-semibold border-b border-white/10 pb-4">Produktdetails</h3>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Produktart</label>
              <select value={form.productType} onChange={set("productType")} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors appearance-none">
                <option value="watch">Uhr</option>
                <option value="jewelry">Schmuck</option>
              </select>
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Marke / Hersteller</label>
              <input type="text" required value={form.brand} onChange={set("brand")} placeholder="z.B. Rolex, Patek Philippe"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors" />
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Modell / Referenz</label>
              <input type="text" required value={form.model} onChange={set("model")} placeholder="z.B. Submariner 126610LN"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Zustand</label>
                <select value={form.condition} onChange={set("condition")} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors appearance-none">
                  <option value="new">Neu / Ungetragen</option>
                  <option value="excellent">Sehr gut</option>
                  <option value="good">Gut</option>
                  <option value="worn">Gebrauchsspuren</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Preisvorstellung (€)</label>
                <input type="number" value={form.priceExpectation} onChange={set("priceExpectation")} placeholder="z.B. 15000"
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Beschreibung / Mängel</label>
              <textarea rows={4} value={form.description} onChange={set("description")} placeholder="Details zum Lieferumfang..."
                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors resize-none" />
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-sm tracking-[0.2em] uppercase font-semibold border-b border-white/10 pb-4">Persönliche Daten</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Vorname</label>
                <input type="text" required value={form.firstName} onChange={set("firstName")} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors" />
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Nachname</label>
                <input type="text" required value={form.lastName} onChange={set("lastName")} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">E-Mail</label>
              <input type="email" required value={form.email} onChange={set("email")} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors" />
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Telefon</label>
              <input type="tel" value={form.phone} onChange={set("phone")} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[12px] font-light outline-none focus:border-[#c5a059] transition-colors" />
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">Bilder hochladen</label>
              <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center space-y-4 hover:border-[#c5a059] transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:bg-[#c5a059]/10 transition-colors">
                  <Camera size={20} className="text-[#F4F4F4]/40 group-hover:text-[#c5a059]" />
                </div>
                <p className="text-[10px] tracking-widest text-[#F4F4F4]/40 uppercase font-bold">Per E-Mail nachreichen möglich</p>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#c5a059] text-black text-[11px] tracking-[0.3em] uppercase font-bold py-5 rounded-full hover:bg-[#d4af37] transition-all shadow-xl disabled:opacity-50">
              {loading ? "Wird gesendet..." : "Anfrage jetzt absenden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
