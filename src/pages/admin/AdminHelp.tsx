import { Link } from "react-router-dom";
import { Package, BrainCircuit, ShoppingCart, Settings, ExternalLink, Database, Shield } from "lucide-react";

export default function AdminHelp() {
  const steps = [
    { icon: Database, title: "1. Datenbank verbinden", desc: "DATABASE_URL in .env (Neon) eintragen, dann: npm run db:migrate" },
    { icon: Package, title: "2. Produkte hinzufügen", desc: "Manuell unter 'Neues Produkt' oder per AI Import von ts-t.jp URLs", link: "/admin/products/new" },
    { icon: BrainCircuit, title: "3. AI Import nutzen", desc: "Produkt-URL einfügen → KI analysiert → Preis & Zoll berechnen → Veröffentlichen", link: "/admin/ai-import" },
    { icon: ShoppingCart, title: "4. Bestellungen prüfen", desc: "Kundenbestellungen und Zahlungsstatus verwalten", link: "/admin/orders" },
    { icon: Settings, title: "5. Shop-Einstellungen", desc: "Bankverbindung, Kontakt-E-Mail und Shop-Name anpassen", link: "/admin/settings" },
    { icon: Shield, title: "6. Admin-Zugang", desc: "Nur mit Admin-Google-Konto. URL: /admin — nach Login über Profil-Icon erreichbar" },
  ];

  const quickLinks = [
    { label: "Shop ansehen", path: "/shop", external: false },
    { label: "Neues Produkt", path: "/admin/products/new", external: false },
    { label: "AI Import", path: "/admin/ai-import", external: false },
    { label: "Anfragen", path: "/admin/inquiries", external: false },
    { label: "GitHub Repo", path: "https://github.com/bellanovaantonio1-commits/Antonio-Bellanova-Luxury", external: true },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-xl font-serif text-gray-900 mb-2">Admin-Anleitung</h3>
        <p className="text-sm text-gray-500">So verwaltest du deinen Luxury Shop Schritt für Schritt.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {steps.map((step, i) => (
          <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <step.icon size={18} className="text-[#D4AF37]" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{step.title}</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
            {step.link && (
              <Link to={step.link} className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-[#D4AF37] hover:underline">
                Öffnen <ExternalLink size={10} />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#0A0A0A] text-white rounded-xl p-8 space-y-4">
        <h4 className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#D4AF37]">Admin-URL</h4>
        <code className="block bg-white/10 px-4 py-3 rounded-lg text-sm font-mono">http://localhost:3000/admin</code>
        <p className="text-white/50 text-xs">Online: https://deine-app.onrender.com/admin</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {quickLinks.map(link => (
          link.external ? (
            <a key={link.path} href={link.path} target="_blank" rel="noopener noreferrer"
              className="px-5 py-3 bg-gray-100 hover:bg-[#D4AF37] hover:text-white rounded-full text-[10px] tracking-widest uppercase font-bold transition-all">
              {link.label}
            </a>
          ) : (
            <Link key={link.path} to={link.path}
              className="px-5 py-3 bg-gray-100 hover:bg-[#D4AF37] hover:text-white rounded-full text-[10px] tracking-widest uppercase font-bold transition-all">
              {link.label}
            </Link>
          )
        ))}
      </div>
    </div>
  );
}
