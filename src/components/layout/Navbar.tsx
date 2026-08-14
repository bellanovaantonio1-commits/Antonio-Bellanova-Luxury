import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Search, User, Menu, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useCart } from "../../contexts/CartContext.tsx";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { MAIN_NAV } from "../../config/navigation.ts";
import { useIsAdmin } from "../../hooks/useIsAdmin.ts";
import SearchOverlay from "./SearchOverlay.tsx";
import BrandMark from "./BrandMark.tsx";
import MobileMenuPanel from "./MobileMenuPanel.tsx";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, signIn, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const { count } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close search and menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-700 border-b ${
        isScrolled
          ? "bg-[#050505]/95 backdrop-blur-xl py-4 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          : "bg-transparent py-7 md:py-8 border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-10 flex items-center justify-between">
        {/* Mobile Menu Toggle */}
        <button className="lg:hidden text-[#F4F4F4]" onClick={() => setIsMenuOpen(true)}>
          <Menu size={24} />
        </button>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 text-[11px] tracking-[0.2em] font-light uppercase">
          {MAIN_NAV.map((item) => (
            <Link key={item.path} to={item.path} className="hover:text-[#c5a059] transition-colors">
              {item.path === "/shop" ? t("nav.shop") : 
               item.path === "/brands" ? t("nav.brands") :
               item.path === "/sell" ? t("nav.sell") :
               item.path === "/service" ? t("nav.service") : item.label}
            </Link>
          ))}
        </div>

        {/* Logo */}
        <BrandMark variant="navbar" asLink className="group hover:opacity-95 transition-opacity" />

        {/* Actions */}
        <div className="flex items-center gap-4 md:gap-8">
          {/* Language Switcher */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-[10px] tracking-[0.2em] font-light">
            <button 
              onClick={() => setLanguage("de")}
              className={`hover:text-[#c5a059] transition-colors ${language === "de" ? "text-[#c5a059] font-bold" : "opacity-70"}`}
            >
              DE
            </button>
            <span className="opacity-30">|</span>
            <button 
              onClick={() => setLanguage("en")}
              className={`hover:text-[#c5a059] transition-colors ${language === "en" ? "text-[#c5a059] font-bold" : "opacity-70"}`}
            >
              EN
            </button>
          </div>

          <button 
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:block hover:text-[#c5a059] transition-colors opacity-90"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
          
          <Link to="/wishlist" className="hover:text-[#c5a059] transition-colors opacity-90">
            <Heart size={18} strokeWidth={1.5} />
          </Link>
          
          <div className="relative group">
            {user && isAdmin && (
              <Link to="/admin" className="hidden md:flex items-center gap-1.5 bg-[#c5a059]/20 text-[#c5a059] px-3 py-1.5 rounded-full text-[9px] tracking-widest uppercase font-bold hover:bg-[#c5a059]/30 transition-all mr-2">
                Admin
              </Link>
            )}
            <button 
              onClick={() => !user && signIn()}
              className="hover:text-[#c5a059] transition-colors flex items-center gap-2 opacity-90 hover:opacity-100"
            >
              <User size={18} strokeWidth={1.5} />
              {user && <span className="hidden md:block text-[10px] tracking-widest uppercase">{t("nav.account")}</span>}
            </button>
            {user && (
              <div className="absolute right-0 top-full mt-4 w-48 bg-[#0a0a0a] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 py-2 border border-white/10">
                {isAdmin && (
                  <Link to="/admin" className="block px-4 py-3 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors">Admin Panel</Link>
                )}
                <Link to="/account" className="block px-4 py-3 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors">{t("nav.profile")}</Link>
                <button onClick={logout} className="w-full text-left px-4 py-3 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors text-red-400">{t("nav.logout")}</button>
              </div>
            )}
          </div>

          <Link to="/cart" className="hover:text-[#c5a059] transition-colors relative opacity-90 hover:opacity-100">
            <ShoppingBag size={18} strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#c5a059] text-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 lg:hidden"
            />
            <MobileMenuPanel
              language={language}
              t={t}
              setLanguage={setLanguage}
              onClose={() => setIsMenuOpen(false)}
            />
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
