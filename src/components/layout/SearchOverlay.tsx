import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, ArrowRight } from "lucide-react";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-black/98 z-[70] p-6 md:p-10 flex flex-col overflow-y-auto"
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
                placeholder="Suche..." 
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
                <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">Ergebnisse ({results.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {results.map((product) => (
                    <Link 
                      key={product.id} 
                      to={`/product/${product.slug}`}
                      onClick={onClose}
                      className="flex gap-6 group bg-white/5 p-4 rounded-xl border border-white/5 hover:border-[#c5a059]/30 transition-all"
                    >
                      <div className="w-24 h-24 bg-black rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={product.images?.[0] || "https://images.unsplash.com/photo-1547996160-81dfa63595aa"} 
                          alt={product.name}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-[10px] tracking-widest uppercase text-[#c5a059] mb-1">{product.brand}</p>
                        <h5 className="text-lg font-serif italic">{product.name}</h5>
                        <p className="text-sm font-light text-white/40 mt-1">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: product.currency || 'EUR' }).format(product.price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : query && !loading ? (
              <div className="text-center py-20">
                <p className="text-white/20 italic font-serif text-xl">Keine Ergebnisse für "{query}" gefunden.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">Top Marken</h4>
                  <div className="flex flex-col gap-4 text-sm font-light text-white/40">
                    <button onClick={() => setQuery("Patek Philippe")} className="text-left hover:text-white transition-colors">Patek Philippe</button>
                    <button onClick={() => setQuery("Rolex")} className="text-left hover:text-white transition-colors">Rolex</button>
                    <button onClick={() => setQuery("Audemars Piguet")} className="text-left hover:text-white transition-colors">Audemars Piguet</button>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">Kategorien</h4>
                  <div className="flex flex-col gap-4 text-sm font-light text-white/40">
                    <button onClick={() => setQuery("Uhren")} className="text-left hover:text-white transition-colors">Uhren</button>
                    <button onClick={() => setQuery("Schmuck")} className="text-left hover:text-white transition-colors">Schmuck</button>
                    <button onClick={() => setQuery("Chronograph")} className="text-left hover:text-white transition-colors">Chronograph</button>
                    <button onClick={() => setQuery("Sportuhren")} className="text-left hover:text-white transition-colors">Sportuhren</button>
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
