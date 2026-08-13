import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.tsx";
import { useShopSettings } from "../../contexts/ShopSettingsContext.tsx";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../../lib/priceOnRequest.ts";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();
  const threshold = parsePriceOnRequestThreshold(shopSettings);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setActiveIndex(data.length > 0 ? 0 : -1);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const formatPrice = (product: { price: string }) =>
    isPriceOnRequest(product.price, threshold)
      ? t("product.price_on_request")
      : new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(product.price));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        window.location.href = `/product/${results[activeIndex].slug}`;
        onClose();
      }
    },
    [results, activeIndex, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-black/98 z-[70] p-6 md:p-10 flex flex-col overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          <div className="flex justify-end mb-10">
            <button onClick={onClose} className="text-white hover:text-[#c5a059] transition-colors">
              <X size={32} strokeWidth={1} />
            </button>
          </div>

          <div className="max-w-4xl mx-auto w-full space-y-12">
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={language === "en" ? "Search…" : "Suche…"}
                className="w-full bg-transparent border-b border-white/20 py-6 text-3xl md:text-5xl font-serif italic outline-none focus:border-[#c5a059] transition-colors placeholder:text-white/10"
              />
              <Search size={32} className="absolute right-0 top-6 text-white/20" strokeWidth={1} />
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-8">
                <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">
                  {language === "en" ? "Results" : "Ergebnisse"} ({results.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {results.map((product, idx) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug}`}
                      onClick={onClose}
                      className={`flex gap-6 group bg-white/5 p-4 rounded-xl border transition-all ${
                        idx === activeIndex ? "border-[#c5a059]/50 bg-white/10" : "border-white/5 hover:border-[#c5a059]/30"
                      }`}
                    >
                      <div className="w-24 h-24 bg-black rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={product.images?.[0] || "https://images.unsplash.com/photo-1547996160-81dfa63595aa"}
                          alt={product.name}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-[10px] tracking-widest uppercase text-[#c5a059] mb-1">{product.brand}</p>
                        <h5 className="text-lg font-serif italic">{product.titleDe || product.name}</h5>
                        <p className="text-sm font-light text-white/40 mt-1">{formatPrice(product)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : query && !loading ? (
              <div className="text-center py-20">
                <p className="text-white/20 italic font-serif text-xl">
                  {language === "en" ? `No results for "${query}".` : `Keine Ergebnisse für „${query}".`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">
                    {language === "en" ? "Top brands" : "Top Marken"}
                  </h4>
                  <div className="flex flex-col gap-4 text-sm font-light text-white/40">
                    {brands.slice(0, 6).map((b) => (
                      <Link key={b.id} to={`/brands/${b.slug}`} onClick={onClose} className="text-left hover:text-white transition-colors">
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">
                    {language === "en" ? "Collections" : "Kollektionen"}
                  </h4>
                  <div className="flex flex-col gap-4 text-sm font-light text-white/40">
                    <Link to="/shop?collection=sport" onClick={onClose} className="hover:text-white transition-colors">{t("shop.collections.sport")}</Link>
                    <Link to="/shop?collection=vintage" onClick={onClose} className="hover:text-white transition-colors">{t("shop.collections.vintage")}</Link>
                    <Link to="/shop?collection=under-5000" onClick={onClose} className="hover:text-white transition-colors">{t("shop.collections.affordable")}</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
