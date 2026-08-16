import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, User, X } from "lucide-react";
import { motion } from "motion/react";
import BrandMark from "./BrandMark.tsx";
import { MAIN_NAV, FOOTER_NAV } from "../../config/navigation.ts";

interface MobileMenuPanelProps {
  language: "de" | "en";
  t: (key: string) => string;
  setLanguage: (lang: "de" | "en") => void;
  onClose: () => void;
  onOpenSearch: () => void;
  user: { uid: string } | null;
  onSignIn: () => void;
}

export default function MobileMenuPanel({
  language,
  t,
  setLanguage,
  onClose,
  onOpenSearch,
  user,
  onSignIn,
}: MobileMenuPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  const discoverLinks = FOOTER_NAV.discover.filter(
    (item) => !MAIN_NAV.some((nav) => nav.path === item.path)
  );

  const navLabel = (item: (typeof MAIN_NAV)[number]) => {
    if (language === "en" && item.labelEn) return item.labelEn;
    return item.label;
  };

  return (
    <motion.aside
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="fixed top-0 left-0 bottom-0 z-[60] w-[min(340px,88vw)] bg-[#050505] border-r border-white/[0.08] flex flex-col overflow-hidden lg:hidden"
      aria-label={language === "en" ? "Navigation menu" : "Navigationsmenü"}
    >
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#c5a059]/25 to-transparent pointer-events-none" />

      <div className="flex items-center justify-end px-6 pt-6 pb-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-white/60 hover:text-[#c5a059] transition-colors p-1"
          aria-label={language === "en" ? "Close menu" : "Menü schließen"}
        >
          <X size={22} strokeWidth={1.5} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45 }}
          className="pt-4 pb-10"
        >
          <BrandMark variant="menu" asLink onClick={onClose} />
        </motion.div>

        <div className="mx-auto w-12 h-px bg-gradient-to-r from-transparent via-[#c5a059]/50 to-transparent mb-10" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          className="mb-8 flex flex-col gap-3"
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="w-full flex items-center gap-3 py-4 px-4 border border-white/10 rounded-xl text-left hover:border-[#c5a059]/40 transition-colors"
          >
            <Search size={18} className="text-[#c5a059]" />
            <span className="text-[11px] tracking-[0.2em] uppercase text-white/70">
              {language === "en" ? "Search products" : "Produkte suchen"}
            </span>
          </button>
          {user ? (
            <Link
              to="/account"
              onClick={onClose}
              className="w-full flex items-center gap-3 py-4 px-4 border border-white/10 rounded-xl hover:border-[#c5a059]/40 transition-colors"
            >
              <User size={18} className="text-[#c5a059]" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-white/70">{t("nav.account")}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignIn();
              }}
              className="w-full flex items-center gap-3 py-4 px-4 border border-[#c5a059]/30 rounded-xl text-left"
            >
              <User size={18} className="text-[#c5a059]" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-[#c5a059]">{t("nav.account")}</span>
            </button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4 }}
        >
          <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059] mb-8">
            {t("footer.discover")}
          </p>

          <nav className="flex flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="group py-4 border-b border-white/[0.05] flex items-center justify-between"
              >
                <span className="text-[13px] font-light tracking-[0.22em] uppercase text-[#F4F4F4] group-hover:text-[#c5a059] transition-colors">
                  {navLabel(item)}
                </span>
                <span className="text-[9px] tracking-[0.25em] uppercase text-white/20 group-hover:text-[#c5a059]/70 transition-colors">
                  {language === "en" ? "Explore" : "Entdecken"}
                </span>
              </Link>
            ))}

            {discoverLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="group py-4 border-b border-white/[0.05] flex items-center justify-between"
              >
                <span className="text-[13px] font-light tracking-[0.18em] uppercase text-white/75 group-hover:text-[#c5a059] transition-colors">
                  {language === "en" && item.labelEn ? item.labelEn : item.label}
                </span>
              </Link>
            ))}

            <Link
              to="/brands"
              onClick={onClose}
              className="group py-4 border-b border-white/[0.05] text-[13px] font-light tracking-[0.18em] uppercase text-white/75 hover:text-[#c5a059] transition-colors"
            >
              {t("nav.brands")}
            </Link>

            <Link
              to="/contact"
              onClick={onClose}
              className="group py-4 border-b border-white/[0.05] text-[13px] font-light tracking-[0.18em] uppercase text-white/75 hover:text-[#c5a059] transition-colors"
            >
              {language === "en" ? "Contact" : "Kontakt"}
            </Link>
          </nav>
        </motion.div>
      </div>

      <div className="shrink-0 px-8 py-8 border-t border-white/[0.06] space-y-6 bg-[#050505]">
        <Link
          to="/sell"
          onClick={onClose}
          className="block text-[10px] tracking-[0.3em] uppercase text-[#c5a059] font-semibold hover:opacity-80 transition-opacity"
        >
          {language === "en" ? "Sell & Trade-In" : "Ankauf & Service"}
        </Link>

        <div className="flex items-center gap-4 text-[10px] tracking-[0.25em] font-light uppercase">
          <button
            type="button"
            onClick={() => setLanguage("de")}
            className={`transition-colors ${language === "de" ? "text-[#c5a059] font-bold" : "text-white/45 hover:text-white/70"}`}
          >
            DE
          </button>
          <span className="text-white/20">|</span>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`transition-colors ${language === "en" ? "text-[#c5a059] font-bold" : "text-white/45 hover:text-white/70"}`}
          >
            EN
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
