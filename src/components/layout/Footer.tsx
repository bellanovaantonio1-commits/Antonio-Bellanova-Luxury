import { Link } from "react-router-dom";
import { Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";
import { FOOTER_NAV } from "../../config/navigation.ts";
import { useLanguage } from "../../contexts/LanguageContext.tsx";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#050505] text-[#F4F4F4] pt-24 pb-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 border-b border-white/10 pb-16">
        {/* Brand */}
        <div className="space-y-6">
          <Link to="/" className="flex flex-col group">
            <span className="text-xl font-serif tracking-[0.2em] italic group-hover:text-[#c5a059] transition-colors">ANTONIO BELLANOVA</span>
            <span className="text-[9px] tracking-[0.5em] text-[#c5a059] mt-1 uppercase opacity-60">Luxury Köln</span>
          </Link>
          <p className="text-[#F4F4F4]/50 text-[12px] leading-relaxed max-w-[280px] font-light">
            {t("footer.brand.desc")}
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#c5a059] transition-colors opacity-60 hover:opacity-100"><Instagram size={18} strokeWidth={1.5} /></a>
            <a href="#" className="hover:text-[#c5a059] transition-colors opacity-60 hover:opacity-100"><Facebook size={18} strokeWidth={1.5} /></a>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-6">
          <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("footer.discover")}</h4>
          <ul className="space-y-4 text-[12px] text-[#F4F4F4]/50 font-light">
            {FOOTER_NAV.discover.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="hover:text-white transition-colors">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div className="space-y-6">
          <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("footer.service")}</h4>
          <ul className="space-y-4 text-[12px] text-[#F4F4F4]/50 font-light">
            {FOOTER_NAV.service.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="hover:text-white transition-colors">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="space-y-6">
          <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("footer.atelier")}</h4>
          <ul className="space-y-4 text-[12px] text-[#F4F4F4]/50 font-light">
            <li className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 text-[#c5a059]" strokeWidth={1.5} />
              <span>Ahornstraße 8<br />50765 Köln, Deutschland</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={16} className="text-[#c5a059]" strokeWidth={1.5} />
              <span>+49 (0) 221 123 456</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={16} className="text-[#c5a059]" strokeWidth={1.5} />
              <span className="break-all">antonio.bellanova@luxury.com</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-10 pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] tracking-[0.3em] text-[#F4F4F4]/30 uppercase font-light">
        <p>© {new Date().getFullYear()} Antonio Bellanova Luxury. {t("footer.rights")}</p>
        <div className="flex gap-10">
          {FOOTER_NAV.legal.map((item) => (
            <Link key={item.path} to={item.path} className="hover:text-white transition-colors">{item.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
