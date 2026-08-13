import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, LayoutGrid, List, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types.ts";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import MetaTags from "../components/common/MetaTags.tsx";
import { useShopSettings } from "../contexts/ShopSettingsContext.tsx";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../lib/priceOnRequest.ts";
import { stockUrgencyKey } from "../lib/stockUrgency.ts";
import { collection, query, where, onSnapshot, gt } from "firebase/firestore";
import { db as firestoreDb } from "../lib/firebase.ts";

type SortOption = "newest" | "price-asc" | "price-desc" | "name";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("cat");
  const collection = searchParams.get("collection");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortOption>((searchParams.get("sort") as SortOption) || "newest");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("brand") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [conditionFilter, setConditionFilter] = useState(searchParams.get("conditionGroup") || "");
  const [boxFilter, setBoxFilter] = useState(searchParams.get("box") || "");
  const [papersFilter, setPapersFilter] = useState(searchParams.get("papers") || "");
  const [materialFilter, setMaterialFilter] = useState(searchParams.get("material") || "");
  const [movementFilter, setMovementFilter] = useState(searchParams.get("movement") || "");
  const [diameterFilter, setDiameterFilter] = useState(searchParams.get("diameter") || "");
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();
  const priceOnRequestThreshold = parsePriceOnRequestThreshold(shopSettings);

  useEffect(() => {
    fetch("/api/brands").then(r => r.ok ? r.json() : []).then(data =>
      setBrandOptions(data.map((b: { slug: string; name: string }) => [b.slug, b.name] as [string, string]))
    ).catch(() => {});
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (cat) params.set("cat", cat);
        if (sort !== "newest") params.set("sort", sort);
        if (brandFilter) params.set("brand", brandFilter);
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (conditionFilter) params.set("conditionGroup", conditionFilter);
        if (boxFilter) params.set("box", boxFilter);
        if (papersFilter) params.set("papers", papersFilter);
        if (materialFilter) params.set("material", materialFilter);
        if (movementFilter) params.set("movement", movementFilter);
        if (diameterFilter) params.set("diameter", diameterFilter);
        if (collection) params.set("collection", collection);
        const response = await fetch(`/api/products?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setProducts(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load products", err);
      }

      // Firestore fallback wenn DB leer/offline
      let q = query(
        collection(firestoreDb, "products"),
        where("status", "==", "ACTIVE"),
        where("stock", ">", 0)
      );
      if (cat === "watches") q = query(collection(firestoreDb, "products"), where("status", "==", "ACTIVE"), where("stock", ">", 0), where("type", "==", "WATCH"));
      else if (cat === "jewelry") q = query(collection(firestoreDb, "products"), where("status", "==", "ACTIVE"), where("stock", ">", 0), where("type", "==", "JEWELRY"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        if (list.length > 0) setProducts(list);
        setLoading(false);
      }, () => setLoading(false));

      return () => unsubscribe();
    };
    loadProducts();
  }, [cat, collection, sort, brandFilter, minPrice, maxPrice, conditionFilter, boxFilter, papersFilter, materialFilter, movementFilter, diameterFilter]);

  const [brandOptions, setBrandOptions] = useState<[string, string][]>([]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    if (sort !== "newest") params.set("sort", sort);
    if (brandFilter) params.set("brand", brandFilter);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (conditionFilter) params.set("conditionGroup", conditionFilter);
    if (boxFilter) params.set("box", boxFilter);
    if (papersFilter) params.set("papers", papersFilter);
    if (materialFilter) params.set("material", materialFilter);
    if (movementFilter) params.set("movement", movementFilter);
    if (diameterFilter) params.set("diameter", diameterFilter);
    setSearchParams(params);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setBrandFilter("");
    setMinPrice("");
    setMaxPrice("");
    setConditionFilter("");
    setBoxFilter("");
    setPapersFilter("");
    setMaterialFilter("");
    setMovementFilter("");
    setDiameterFilter("");
    setSort("newest");
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    setSearchParams(params);
  };

  const pageTitle =
    collection === "sport" ? (language === "en" ? "Sports watches" : "Sportuhren")
    : collection === "vintage" ? "Vintage"
    : collection === "under-5000" ? (language === "en" ? "Under €5,000" : "Unter 5.000 €")
    : cat === "watches" ? t("shop.title")
    : cat === "jewelry" ? t("home.categories.jewelry")
    : cat === "new" ? "Neuheiten"
    : t("nav.shop");

  const filterPanel = (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
      <div>
        <label className="text-[9px] tracking-widest uppercase text-white/40 font-bold block mb-2">Marke</label>
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#c5a059] rounded-lg">
          <option value="">Alle Marken</option>
          {brandOptions.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[9px] tracking-widest uppercase text-white/40 font-bold block mb-2">Zustand</label>
        <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#c5a059] rounded-lg">
          <option value="">Alle</option>
          <option value="NEW">Neu</option>
          <option value="UNUSED">Ungetragen</option>
          <option value="PRE_OWNED">Gebraucht</option>
          <option value="VINTAGE">Vintage</option>
        </select>
      </div>
      <div>
        <label className="text-[9px] tracking-widest uppercase text-white/40 font-bold block mb-2">Material</label>
        <input value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} placeholder="z.B. Edelstahl"
          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#c5a059] rounded-lg" />
      </div>
      <div>
        <label className="text-[9px] tracking-widest uppercase text-white/40 font-bold block mb-2">Werk</label>
        <input value={movementFilter} onChange={e => setMovementFilter(e.target.value)} placeholder="z.B. Automatik"
          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#c5a059] rounded-lg" />
      </div>
      <div>
        <label className="text-[9px] tracking-widest uppercase text-white/40 font-bold block mb-2">Gehäusegröße</label>
        <input value={diameterFilter} onChange={e => setDiameterFilter(e.target.value)} placeholder="z.B. 41"
          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#c5a059] rounded-lg" />
      </div>
      <div>
        <label className="text-[9px] tracking-widest uppercase text-white/40 font-bold block mb-2">Min. Preis (€)</label>
        <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0"
          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#c5a059] rounded-lg" />
      </div>
      <div>
        <label className="text-[9px] tracking-widest uppercase text-white/40 font-bold block mb-2">Max. Preis (€)</label>
        <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="50000"
          className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#c5a059] rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 justify-end">
        <label className="flex items-center gap-3 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={boxFilter === "yes"} onChange={e => setBoxFilter(e.target.checked ? "yes" : "")} className="accent-[#c5a059]" />
          Mit Originalbox
        </label>
        <label className="flex items-center gap-3 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={papersFilter === "yes"} onChange={e => setPapersFilter(e.target.checked ? "yes" : "")} className="accent-[#c5a059]" />
          Mit Papieren
        </label>
      </div>
      <div className="flex items-end gap-3 md:col-span-2 xl:col-span-1">
        <button onClick={applyFilters} className="flex-1 bg-[#c5a059] text-black py-3 rounded-lg text-[10px] tracking-widest uppercase font-bold">{t("shop.filter.apply")}</button>
        <button onClick={clearFilters} className="p-3 border border-white/10 rounded-lg hover:text-[#c5a059]" aria-label="Filter zurücksetzen"><X size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className="pt-32 pb-28 md:pb-24 px-10 bg-[#050505]">
      <MetaTags title={pageTitle} description="Entdecken Sie unsere kuratierte Kollektion exklusiver Luxusuhren und Schmuckstücke." />
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 border-b border-white/10 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <nav className="text-[10px] tracking-widest uppercase text-white/30 mb-4 flex gap-2 font-light">
                <Link to="/" className="hover:text-[#c5a059]">Home</Link>
                <span>/</span>
                <span className="text-[#F4F4F4]">{t("nav.shop")}</span>
              </nav>
              <h1 className="text-4xl md:text-5xl font-serif tracking-tight capitalize italic font-light">{pageTitle}</h1>
              {!loading && <p className="text-white/30 text-sm mt-2">{products.length} Produkte</p>}
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
                className="bg-transparent border border-white/10 px-4 py-2 text-[10px] tracking-widest uppercase font-bold outline-none focus:border-[#c5a059] rounded-lg">
                <option value="newest" className="bg-[#0a0a0a]">Neueste</option>
                <option value="price-asc" className="bg-[#0a0a0a]">Preis ↑</option>
                <option value="price-desc" className="bg-[#0a0a0a]">Preis ↓</option>
                <option value="name" className="bg-[#0a0a0a]">Name A–Z</option>
              </select>

              <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "text-[#c5a059]" : "text-white/30 hover:text-[#F4F4F4]"}`}>
                  <LayoutGrid size={18} strokeWidth={1.5} />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "text-[#c5a059]" : "text-white/30 hover:text-[#F4F4F4]"}`}>
                  <List size={18} strokeWidth={1.5} />
                </button>
              </div>
              
              <button onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-bold hover:text-[#c5a059] transition-colors">
                <Filter size={16} strokeWidth={1.5} /> {t("shop.filter")}
                <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="hidden md:block mt-8">{filterPanel}</div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse space-y-6">
                <div className="aspect-[4/5] bg-[#0a0a0a]" />
                <div className="space-y-3"><div className="h-4 bg-[#0a0a0a] w-1/2" /><div className="h-6 bg-[#0a0a0a] w-3/4" /></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10">
            <p className="text-white/30 text-sm italic font-light">{t("shop.no_products")}</p>
            <button onClick={clearFilters} className="inline-block mt-4 text-[10px] tracking-widest uppercase text-[#c5a059]">Filter zurücksetzen</button>
            <Link to="/contact" className="block mt-4 text-[10px] tracking-widest uppercase border-b border-white/20 pb-1 hover:text-[#c5a059] hover:border-[#c5a059] font-bold">{t("shop.send_request")}</Link>
          </div>
        ) : (
          <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-x-16 gap-y-24`}>
            {products.map(product => (
              <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={product.id}
                className={`group ${viewMode === "list" ? "flex gap-16 items-center" : ""}`}>
                <Link to={`/product/${product.slug}`} className={`block overflow-hidden bg-[#0a0a0a] ${viewMode === "list" ? "w-1/3" : "w-full"}`}>
                  <div className="aspect-[4/5] relative">
                    <img src={product.images?.[0] || "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=800"}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 transition-all duration-1000 group-hover:scale-105 group-hover:opacity-100"
                      alt={language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name)} loading="lazy" decoding="async" />
                    {product.status === "RESERVED" && (
                      <span className="absolute top-4 right-4 bg-[#c5a059] text-black text-[8px] tracking-[0.2em] uppercase px-3 py-1 font-bold">Reserviert</span>
                    )}
                    {stockUrgencyKey(product.stock) && product.status !== "RESERVED" && (
                      <span className="absolute top-4 left-4 bg-red-900/80 text-white text-[8px] tracking-[0.2em] uppercase px-3 py-1 font-bold">
                        {t(stockUrgencyKey(product.stock)!)}
                      </span>
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
                      {isPriceOnRequest(product.price, priceOnRequestThreshold)
                        ? t("product.price_on_request")
                        : new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(product.price))}
                    </span>
                    <Link to={`/product/${product.slug}`} className="text-[10px] tracking-[0.2em] uppercase font-bold border-b border-white/20 pb-1 hover:text-[#c5a059] hover:border-[#c5a059] transition-all">Details</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile filter bottom sheet */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[80] bg-black/70"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#0a0a0a] border-t border-white/10 p-4 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[11px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("shop.mobile.filter")}</h3>
                <button onClick={() => setShowFilters(false)} className="text-white/40"><X size={20} /></button>
              </div>
              {filterPanel}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setShowFilters(true)}
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-[#c5a059] text-black px-6 py-3 rounded-full text-[10px] tracking-widest uppercase font-bold shadow-2xl"
      >
        <Filter size={14} /> {t("shop.mobile.filter")}
      </button>
    </div>
  );
}
