import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, ChevronDown, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types.ts";
import { collection, query, where, getDocs, onSnapshot, or, and } from "firebase/firestore";
import { db } from "../lib/firebase.ts";
import { useLanguage } from "../contexts/LanguageContext.tsx";

export default function Shop() {
  const [searchParams] = useSearchParams();
  const cat = searchParams.get("cat");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { language, t } = useLanguage();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const url = cat ? `/api/products?cat=${cat}` : '/api/products';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("Failed to load products from API", err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();

      // Note: Firestore published is string 'true'/'false' in schema, but might be boolean in old Firestore docs
    // We try both or rely on status
    let q = query(
      collection(db, "products"),
      where("status", "==", "ACTIVE"),
      where("stock", ">", 0)
    );
    
    if (cat) {
      const type = cat === "watches" ? "WATCH" : cat === "jewelry" ? "JEWELRY" : null;
      if (type) {
        q = query(
          collection(db, "products"), 
          where("status", "==", "ACTIVE"),
          where("stock", ">", 0),
          where("type", "==", type)
        );
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      if (productList.length > 0) {
        setProducts(productList);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firestore shop restricted:", error.message);
      // Fallback is already handled by loadProducts
    });

    return () => unsubscribe();
  }, [cat]);

  return (
    <div className="pt-32 pb-24 px-10 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 border-b border-white/10 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <nav className="text-[10px] tracking-widest uppercase text-white/30 mb-4 flex gap-2 font-light">
                <Link to="/" className="hover:text-[#c5a059]">Home</Link>
                <span>/</span>
                <span className="text-[#F4F4F4]">{t("nav.shop")}</span>
              </nav>
              <h1 className="text-4xl md:text-5xl font-serif tracking-tight capitalize italic font-light">
                {cat === "watches" ? t("shop.title") : cat === "jewelry" ? t("home.categories.jewelry") : cat === "new" ? "Neuheiten" : t("nav.shop")}
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 border-r border-white/10 pr-6 mr-6">
                <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "text-[#c5a059]" : "text-white/30 hover:text-[#F4F4F4]"}`}>
                  <LayoutGrid size={18} strokeWidth={1.5} />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "text-[#c5a059]" : "text-white/30 hover:text-[#F4F4F4]"}`}>
                  <List size={18} strokeWidth={1.5} />
                </button>
              </div>
              
              <button className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-bold hover:text-[#c5a059] transition-colors">
                <Filter size={16} strokeWidth={1.5} /> {t("shop.filter")}
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse space-y-6">
                <div className="aspect-[4/5] bg-[#0a0a0a]" />
                <div className="space-y-3">
                  <div className="h-4 bg-[#0a0a0a] w-1/2" />
                  <div className="h-6 bg-[#0a0a0a] w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (!Array.isArray(products) || products.length === 0) ? (
          <div className="text-center py-24 border border-dashed border-white/10">
             <p className="text-white/30 text-sm italic font-light">{t("shop.no_products")}</p>
             <Link to="/contact" className="inline-block mt-6 text-[10px] tracking-widest uppercase border-b border-white/20 pb-1 hover:text-[#c5a059] hover:border-[#c5a059] font-bold">{t("shop.send_request")}</Link>
          </div>
        ) : (
          <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-x-16 gap-y-24`}>
            {Array.isArray(products) && products.map((product) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={product.id} 
                className={`group ${viewMode === "list" ? "flex gap-16 items-center" : ""}`}
              >
                <Link to={`/product/${product.slug}`} className={`block overflow-hidden bg-[#0a0a0a] ${viewMode === "list" ? "w-1/3" : "w-full"}`}>
                  <div className="aspect-[4/5] relative">
                    <img 
                      src={product.images && product.images.length > 0 ? product.images[0] : "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=800"} 
                      className="absolute inset-0 w-full h-full object-cover opacity-60 transition-all duration-1000 group-hover:scale-105 group-hover:opacity-100"
                      alt={language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name)}
                    />
                    {product.status === "RESERVED" && (
                      <span className="absolute top-4 right-4 bg-[#c5a059] text-black text-[8px] tracking-[0.2em] uppercase px-3 py-1 font-bold">Reserviert</span>
                    )}
                  </div>
                </Link>
                <div className={`space-y-6 ${viewMode === "list" ? "flex-1" : "mt-8"}`}>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-[#c5a059] font-bold">{product.brand?.name || "Antonio Bellanova"}</span>
                    <Link to={`/product/${product.slug}`}>
                      <h3 className="text-2xl font-serif tracking-tight group-hover:text-[#c5a059] transition-colors italic font-light">
                        {language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name)}
                      </h3>
                    </Link>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-sm font-light tracking-widest opacity-80">
                      {new Intl.NumberFormat(language === "en" ? 'en-US' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(parseFloat(product.price))}
                    </span>
                    <Link to={`/product/${product.slug}`} className="text-[10px] tracking-[0.2em] uppercase font-bold border-b border-white/20 pb-1 hover:text-[#c5a059] hover:border-[#c5a059] transition-all">
                      Details
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
