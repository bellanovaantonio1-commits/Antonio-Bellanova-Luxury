import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, User, Menu, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useCart } from "../../contexts/CartContext.tsx";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { MAIN_NAV } from "../../config/navigation.ts";
import { useIsAdmin } from "../../hooks/useIsAdmin.ts";
import { useIsDesktopLayout } from "../../hooks/useMediaQuery.ts";
import SearchOverlay from "./SearchOverlay.tsx";
import BrandMark from "./BrandMark.tsx";
import MobileMenuPanel from "./MobileMenuPanel.tsx";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isDesktop = useIsDesktopLayout();
  const { user, signIn, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const { count } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  useEffect(() => {
    if (isDesktop) {
      setIsMenuOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (!isMenuOpen || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMenuOpen, isDesktop]);

  const handleAccountClick = () => {
    if (user) {
      navigate("/account");
      return;
    }
    signIn();
  };

  return (
    <nav
      className={`w-full transition-all duration-700 border-b ${
        isScrolled
          ? "bg-[#050505]/95 backdrop-blur-xl py-3 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          : isDesktop
            ? "bg-transparent py-7 lg:py-8 border-transparent"
            : "bg-[#050505]/95 backdrop-blur-xl py-3 border-white/[0.06]"
      }`}
    >
      <div className="max-w-7xl mx-auto page-x">
        {isDesktop ? (
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-8 text-[11px] tracking-[0.2em] font-light uppercase shrink-0">
              {MAIN_NAV.map((item) => (
                <Link key={item.path} to={item.path} className="hover:text-[#c5a059] transition-colors whitespace-nowrap">
                  {item.path === "/shop"
                    ? t("nav.shop")
                    : item.path === "/brands"
                      ? t("nav.brands")
                      : item.path === "/sell"
                        ? t("nav.sell")
                        : item.path === "/service"
                          ? t("nav.service")
                          : item.label}
                </Link>
              ))}
            </div>

            <BrandMark variant="navbar" asLink className="group hover:opacity-95 transition-opacity shrink-0" />

            <div className="flex items-center justify-end gap-6 shrink-0">
              <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] font-light">
                <button
                  type="button"
                  onClick={() => setLanguage("de")}
                  className={`hover:text-[#c5a059] transition-colors ${language === "de" ? "text-[#c5a059] font-bold" : "opacity-70"}`}
                >
                  DE
                </button>
                <span className="opacity-30">|</span>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`hover:text-[#c5a059] transition-colors ${language === "en" ? "text-[#c5a059] font-bold" : "opacity-70"}`}
                >
                  EN
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="hover:text-[#c5a059] transition-colors opacity-90"
                aria-label={language === "en" ? "Search" : "Suche"}
              >
                <Search size={18} strokeWidth={1.5} />
              </button>

              <Link
                to="/wishlist"
                className="hover:text-[#c5a059] transition-colors opacity-90"
                aria-label={language === "en" ? "Wishlist" : "Wunschliste"}
              >
                <Heart size={18} strokeWidth={1.5} />
              </Link>

              <div className="relative group">
                {user && isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 bg-[#c5a059]/20 text-[#c5a059] px-3 py-1.5 rounded-full text-[9px] tracking-widest uppercase font-bold hover:bg-[#c5a059]/30 transition-all mr-1"
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleAccountClick}
                  className="hover:text-[#c5a059] transition-colors flex items-center gap-2 opacity-90 hover:opacity-100"
                >
                  <User size={18} strokeWidth={1.5} />
                  {user && <span className="text-[10px] tracking-widest uppercase">{t("nav.account")}</span>}
                </button>
                {user && (
                  <div className="absolute right-0 top-full mt-4 w-48 bg-[#0a0a0a] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 py-2 border border-white/10">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="block px-4 py-3 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/account"
                      className="block px-4 py-3 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors"
                    >
                      {t("nav.profile")}
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full text-left px-4 py-3 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors text-red-400"
                    >
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>

              <Link
                to="/cart"
                className="hover:text-[#c5a059] transition-colors relative opacity-90 hover:opacity-100"
                aria-label={language === "en" ? "Cart" : "Warenkorb"}
              >
                <ShoppingBag size={18} strokeWidth={1.5} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#c5a059] text-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="touch-target text-[#F4F4F4]"
                onClick={() => setIsMenuOpen(true)}
                aria-label={language === "en" ? "Open menu" : "Menü öffnen"}
              >
                <Menu size={22} />
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="touch-target text-[#F4F4F4] hover:text-[#c5a059] transition-colors"
                aria-label={language === "en" ? "Search" : "Suche"}
              >
                <Search size={20} strokeWidth={1.5} />
              </button>
            </div>

            <BrandMark variant="navbar" asLink className="justify-self-center group hover:opacity-95 transition-opacity" />

            <div className="flex items-center justify-end gap-2">
              <Link
                to="/wishlist"
                className="touch-target hover:text-[#c5a059] transition-colors opacity-90"
                aria-label={language === "en" ? "Wishlist" : "Wunschliste"}
              >
                <Heart size={18} strokeWidth={1.5} />
              </Link>
              <button
                type="button"
                onClick={handleAccountClick}
                className="touch-target hover:text-[#c5a059] transition-colors opacity-90"
                aria-label={language === "en" ? "Account" : "Konto"}
              >
                <User size={18} strokeWidth={1.5} />
              </button>
              <Link
                to="/cart"
                className="touch-target hover:text-[#c5a059] transition-colors relative opacity-90"
                aria-label={language === "en" ? "Cart" : "Warenkorb"}
              >
                <ShoppingBag size={18} strokeWidth={1.5} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#c5a059] text-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}
      </div>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <AnimatePresence>
        {!isDesktop && isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <MobileMenuPanel
              language={language}
              t={t}
              setLanguage={setLanguage}
              onClose={() => setIsMenuOpen(false)}
              onOpenSearch={() => {
                setIsMenuOpen(false);
                setIsSearchOpen(true);
              }}
              user={user}
              onSignIn={signIn}
            />
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
