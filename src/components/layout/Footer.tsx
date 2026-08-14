import { Link } from "react-router-dom";
import { Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { FOOTER_NAV } from "../../config/navigation.ts";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { formatAddressLines, useShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import NewsletterForm from "../common/NewsletterForm.tsx";
import BrandMark from "./BrandMark.tsx";

export default function Footer() {
  const { t, language } = useLanguage();
  const settings = useShopSettings();
  const addressLines = formatAddressLines(settings.contactAddress);
  const [brands, setBrands] = useState<{ name: string; slug: string }[]>([]);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  return (
    <footer className="bg-[#050505] text-[#F4F4F4] pt-24 pb-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 border-b border-white/10 pb-16">
        {/* Brand */}
        <div className="space-y-6">
          <BrandMark variant="footer" asLink />
          <p className="text-white/70 text-[12px] leading-relaxed max-w-[280px] font-light">
            {t("footer.brand.desc")}
          </p>
          <div className="flex gap-6">
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-[#c5a059] transition-colors"><Instagram size={18} strokeWidth={1.5} /></a>
            )}
            {settings.facebookUrl && (
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-[#c5a059] transition-colors"><Facebook size={18} strokeWidth={1.5} /></a>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-6">
          <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("footer.discover")}</h4>
          <ul className="space-y-4 text-[12px] text-white/75 font-light">
            {FOOTER_NAV.discover.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="hover:text-[#c5a059] transition-colors">
                  {language === "en" && item.labelEn ? item.labelEn : item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div className="space-y-6">
          <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("footer.service")}</h4>
          <ul className="space-y-4 text-[12px] text-white/75 font-light">
            {FOOTER_NAV.service.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="hover:text-[#c5a059] transition-colors">
                  {language === "en" && item.labelEn ? item.labelEn : item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Brands */}
        {brands.length > 0 && (
          <div className="space-y-6">
            <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("home.brands.title")}</h4>
            <ul className="space-y-4 text-[12px] text-white/75 font-light">
              {brands.slice(0, 6).map((b) => (
                <li key={b.slug}>
                  <Link to={`/brands/${b.slug}`} className="hover:text-[#c5a059] transition-colors">{b.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contact — from Admin → Einstellungen */}
        <div className="space-y-6">
          <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("footer.atelier")}</h4>
          <ul className="space-y-4 text-[12px] text-white/75 font-light">
            {addressLines.length > 0 && (
              <li className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 text-[#c5a059] shrink-0" strokeWidth={1.5} />
                {settings.googleMapsUrl ? (
                  <a href={settings.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#c5a059] transition-colors">
                    {addressLines.map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < addressLines.length - 1 && <br />}
                      </span>
                    ))}
                  </a>
                ) : (
                  <span>
                    {addressLines.map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < addressLines.length - 1 && <br />}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            )}
            {settings.contactPhone && (
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-[#c5a059] shrink-0" strokeWidth={1.5} />
                <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:text-[#c5a059] transition-colors">
                  {settings.contactPhone}
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-[#c5a059] shrink-0" strokeWidth={1.5} />
                <a href={`mailto:${settings.contactEmail}`} className="break-all hover:text-[#c5a059] transition-colors">
                  {settings.contactEmail}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Newsletter */}
      <div className="max-w-7xl mx-auto px-10 py-12 border-b border-white/10">
        <div className="max-w-md space-y-4">
          <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">Newsletter</h4>
          <p className="text-[12px] text-white/70 font-light">Neuheiten und exklusive Angebote — direkt in Ihr Postfach.</p>
          <div className="relative">
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-10 pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] tracking-[0.3em] text-white/50 uppercase font-light">
        <p>© {new Date().getFullYear()} {settings.shopName}. {t("footer.rights")}</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 max-w-3xl">
          {FOOTER_NAV.legal.map((item) => (
            <Link key={item.path} to={item.path} className="hover:text-[#c5a059] transition-colors">
              {language === "en" && item.labelEn ? item.labelEn : item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
