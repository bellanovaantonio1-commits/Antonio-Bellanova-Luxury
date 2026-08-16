import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { useCookieConsent } from "../../contexts/CookieConsentContext.tsx";

export default function CookieBanner() {
  const { language } = useLanguage();
  const { bannerVisible, acceptCookies } = useCookieConsent();

  if (!bannerVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[70] p-4 md:p-6 safe-area-pb">
      <div className="max-w-4xl mx-auto bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <p className="text-sm text-white/60 font-light leading-relaxed flex-1">
          {language === "en" ? (
            <>
              We use technically necessary storage (e.g. login, cart, language). No third-party analytics cookies are currently used. Details in our{" "}
              <Link to="/privacy" className="text-[#c5a059] hover:underline">Privacy Policy</Link>.
            </>
          ) : (
            <>
              Wir verwenden technisch notwendige Speicher (z.&nbsp;B. Anmeldung, Warenkorb, Sprache). Derzeit setzen wir keine Analyse-Cookies Dritter ein. Details in unserer{" "}
              <Link to="/privacy" className="text-[#c5a059] hover:underline">Datenschutzerklärung</Link>.
            </>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => acceptCookies("essential")}
            className="min-h-11 px-6 py-3 text-[10px] tracking-widest uppercase font-bold border border-white/20 rounded-full hover:bg-white/5 transition-all"
          >
            {language === "en" ? "Necessary only" : "Nur Notwendige"}
          </button>
          <button
            type="button"
            onClick={() => acceptCookies("all")}
            className="min-h-11 px-6 py-3 text-[10px] tracking-widest uppercase font-bold bg-[#c5a059] text-black rounded-full hover:bg-[#d4af37] transition-all"
          >
            {language === "en" ? "Accept" : "Akzeptieren"}
          </button>
        </div>
      </div>
    </div>
  );
}
