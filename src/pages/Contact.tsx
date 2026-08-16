import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { formatAddressLines, useShopSettings } from "../contexts/ShopSettingsContext.tsx";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", subject: "general", message: "" });
  const { t } = useLanguage();
  const settings = useShopSettings();
  const addressLines = formatAddressLines(settings.contactAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
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
          <h1 className="text-3xl font-serif italic tracking-wider">{t("contact.form.success.title")}</h1>
          <p className="text-[#F4F4F4]/60 font-light leading-relaxed">{t("contact.form.success.desc")}</p>
          <button onClick={() => { setSubmitted(false); setForm({ firstName: "", lastName: "", email: "", subject: "general", message: "" }); }}
            className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059] border-b border-[#c5a059] pb-1 hover:opacity-70 transition-opacity">
            {t("contact.form.success.new")}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-pt page-pb page-x">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24">
        <div className="space-y-16">
          <header className="space-y-6">
            <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">Service</h4>
            <h1 className="text-5xl md:text-6xl font-serif italic tracking-wider">{t("contact.title")}</h1>
            <p className="text-[#F4F4F4]/50 font-light leading-relaxed max-w-lg">{t("contact.subtitle")}</p>
          </header>
          <div className="space-y-12">
            <div className="flex items-start gap-8 group">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#c5a059]/10 transition-colors">
                <MapPin size={20} className="text-[#c5a059]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-2">{t("contact.atelier.title")}</h3>
                <p className="text-white/75 text-sm font-light leading-relaxed">
                  {addressLines.map((line, i) => (
                    <span key={i}>{line}{i < addressLines.length - 1 && <br />}</span>
                  ))}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-8 group">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#c5a059]/10 transition-colors">
                <Phone size={20} className="text-[#c5a059]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-2">{t("contact.phone.title")}</h3>
                <p className="text-white/75 text-sm font-light leading-relaxed">
                  <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:text-[#c5a059] transition-colors">
                    {settings.contactPhone}
                  </a>
                  <br />Mo - Fr: 10:00 - 18:00 Uhr
                </p>
              </div>
            </div>
            <div className="flex items-start gap-8 group">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-[#c5a059]/10 transition-colors">
                <Mail size={20} className="text-[#c5a059]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-2">{t("contact.email.title")}</h3>
                <p className="text-white/75 text-sm font-light leading-relaxed">
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-[#c5a059] transition-colors">
                    {settings.contactEmail}
                  </a>
                  <br />{t("contact.email.desc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-12 rounded-2xl shadow-2xl relative overflow-hidden">
          <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">{t("contact.form.firstname")}</label>
                <input type="text" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 px-4 py-4 text-[13px] font-light outline-none focus:border-[#c5a059] transition-colors rounded-lg" />
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">{t("contact.form.lastname")}</label>
                <input type="text" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 px-4 py-4 text-[13px] font-light outline-none focus:border-[#c5a059] transition-colors rounded-lg" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">{t("contact.form.email")}</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-black/20 border border-white/10 px-4 py-4 text-[13px] font-light outline-none focus:border-[#c5a059] transition-colors rounded-lg" />
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">{t("contact.form.subject")}</label>
              <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full bg-black/20 border border-white/10 px-4 py-4 text-[13px] font-light outline-none focus:border-[#c5a059] transition-colors rounded-lg appearance-none">
                <option value="general">{t("contact.subject.general")}</option>
                <option value="product">{t("contact.subject.product")}</option>
                <option value="appointment">{t("contact.subject.appointment")}</option>
                <option value="service">{t("contact.subject.service")}</option>
              </select>
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-[#F4F4F4]/40">{t("contact.form.message")}</label>
              <textarea rows={6} required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full bg-black/20 border border-white/10 px-4 py-4 text-[13px] font-light outline-none focus:border-[#c5a059] transition-colors rounded-lg resize-none"
                placeholder={t("contact.form.message_placeholder")} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#c5a059] text-black text-[11px] tracking-[0.3em] uppercase font-bold py-5 rounded-full hover:bg-[#d4af37] transition-all flex items-center justify-center gap-3 shadow-xl group disabled:opacity-50">
              <span>{loading ? "Wird gesendet..." : t("contact.form.submit")}</span>
              <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
