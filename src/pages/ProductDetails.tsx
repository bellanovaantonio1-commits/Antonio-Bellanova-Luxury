import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Shield, Clock, Award, Package, MessageSquare, ChevronRight, Share2, Heart, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types.ts";
import { useCart } from "../contexts/CartContext.tsx";
import { useWishlist } from "../contexts/WishlistContext.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import MetaTags from "../components/common/MetaTags.tsx";

export default function ProductDetails() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const { language, t } = useLanguage();
  
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        const response = await fetch(`/api/products/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data);
          const cat = data.type === "JEWELRY" ? "jewelry" : "watches";
          const relRes = await fetch(`/api/products?cat=${cat}&limit=4&exclude=${slug}`);
          if (relRes.ok) setRelated(await relRes.json());
        }
      } catch (e) {
        console.error("Failed to fetch product", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const displayTitle = language === "en" && product?.titleEn ? product.titleEn : (product?.titleDe || product?.name || "");
  const displayDescription = language === "en" && product?.descriptionEn ? product.descriptionEn : (product?.descriptionDe || "");
  const displayCondition = language === "en" && product?.conditionEn ? product.conditionEn : (product?.conditionDe || product?.condition || "Hervorragend");
  const displayScope = language === "en" && product?.scopeOfDeliveryEn ? product.scopeOfDeliveryEn : (product?.scopeOfDeliveryDe || "Originalbox & Papiere");
  const displaySpecs = language === "en" && product?.specificationsEn ? product.specificationsEn : (product?.specificationsDe || "");

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: String(product.id),
      name: displayTitle,
      price: parseFloat(product.price),
      image: product.images[0],
      quantity: 1,
      brand: product.brand?.name || "Antonio Bellanova"
    });
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 3000);
  };

  const handleWishlist = () => {
    if (!product) return;
    toggleItem({
      id: String(product.id),
      name: displayTitle,
      price: parseFloat(product.price),
      image: product.images?.[0] || "",
      slug: product.slug
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: displayTitle, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link kopiert!");
    }
  };

  if (loading) return <div className="pt-48 pb-24 text-center text-[10px] tracking-widest uppercase">{t("common.loading")}</div>;
  if (!product) return <div className="pt-48 pb-24 text-center">{t("common.back")}</div>;

  const isFavorited = product.id ? isInWishlist(String(product.id)) : false;

  return (
    <div className="pt-32 pb-24 px-10 bg-[#050505]">
      <MetaTags
        title={displayTitle}
        description={product.seoDescriptionDe || product.shortDescriptionDe || displayTitle}
        image={product.images?.[0]}
      />
      <AnimatePresence>
        {showAddedToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-8 py-4 rounded-full flex items-center gap-4 shadow-2xl border border-[#c5a059]"
          >
            <CheckCircle2 size={20} className="text-[#c5a059]" />
            <span className="text-[11px] tracking-widest uppercase font-bold">{t("product.add_to_cart")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="text-[10px] tracking-widest uppercase text-white/30 mb-12 flex items-center gap-2 font-light">
          <Link to="/" className="hover:text-[#c5a059]">Home</Link>
          <ChevronRight size={10} />
          <Link to="/shop" className="hover:text-[#c5a059]">{t("nav.shop")}</Link>
          <ChevronRight size={10} />
          <span className="text-[#F4F4F4] truncate">{displayTitle}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Image Gallery */}
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden relative group border border-white/5">
              <motion.img 
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={product.images[activeImage] || "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200"} 
                className="w-full h-full object-cover opacity-80"
                alt={displayTitle}
              />
              <div className="absolute top-6 right-6 flex gap-3">
                <button 
                  onClick={handleWishlist}
                  className={`p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 transition-colors ${isFavorited ? "text-[#c5a059]" : "hover:text-[#c5a059]"}`}
                >
                  <Heart size={18} strokeWidth={1.5} fill={isFavorited ? "currentColor" : "none"} />
                </button>
                <button onClick={handleShare} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:text-[#c5a059] transition-colors">
                  <Share2 size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-[4/5] bg-[#0a0a0a] overflow-hidden border transition-all ${activeImage === idx ? "border-[#c5a059]" : "border-white/5"}`}
                >
                  <img src={img} className="w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity" alt={`${displayTitle} ${idx}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="border-b border-white/10 pb-10 mb-10">
              <span className="text-[#c5a059] text-[11px] tracking-[0.4em] uppercase font-bold mb-4 block">
                {product.brand?.name || "Antonio Bellanova"}
              </span>
              <h1 className="text-4xl md:text-5xl font-serif tracking-tight leading-tight mb-8 italic font-light">
                {displayTitle}
              </h1>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-serif italic text-[#c5a059]">
                  {new Intl.NumberFormat(language === "en" ? 'en-US' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(parseFloat(product.price))}
                </span>
                <span className="text-[10px] tracking-widest text-white/30 uppercase italic font-light">Inkl. MwSt. / §25a</span>
              </div>
            </div>

            <div className="space-y-10 mb-12">
              <div className="grid grid-cols-2 gap-y-6 text-[14px] tracking-wide">
                <div className="text-white/50 uppercase tracking-[0.2em] text-[10px] font-bold">Referenz</div>
                <div className="font-light text-white/90">{product.sku || "N/A"}</div>
                <div className="text-white/50 uppercase tracking-[0.2em] text-[10px] font-bold">{t("product.condition")}</div>
                <div className="font-light text-white/90">{displayCondition}</div>
                <div className="text-white/50 uppercase tracking-[0.2em] text-[10px] font-bold">{t("product.scope")}</div>
                <div className="font-light text-white/90">
                  {displayScope}
                </div>
                <div className="text-white/50 uppercase tracking-[0.2em] text-[10px] font-bold">Standort</div>
                <div className="font-light italic text-white/90">Atelier Köln</div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleAddToCart}
                  className="w-full bg-white text-black py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all hover:bg-[#c5a059] hover:text-white"
                >
                  {t("product.add_to_cart")}
                </button>
                <Link 
                  to="/contact"
                  className="w-full border border-white/20 hover:border-[#c5a059] py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all flex items-center justify-center gap-3"
                >
                  <MessageSquare size={16} strokeWidth={1.5} /> {t("shop.send_request")}
                </Link>
              </div>
            </div>

            {/* Icons / USP */}
            <div className="grid grid-cols-2 gap-6 pt-10 border-t border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0a0a0a] flex items-center justify-center text-[#c5a059] border border-white/5">
                  <Shield size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[9px] tracking-widest uppercase font-bold opacity-60">100% Original</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0a0a0a] flex items-center justify-center text-[#c5a059] border border-white/5">
                  <Award size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[9px] tracking-widest uppercase font-bold opacity-60">Zertifiziert</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0a0a0a] flex items-center justify-center text-[#c5a059] border border-white/5">
                  <Clock size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[9px] tracking-widest uppercase font-bold opacity-60">24h Express</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0a0a0a] flex items-center justify-center text-[#c5a059] border border-white/5">
                  <Package size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[9px] tracking-widest uppercase font-bold opacity-60">Wertversand</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Specs */}
        <div className="mt-32 border-t border-white/10 pt-20">
          <h2 className="text-3xl font-serif mb-16 italic font-light text-[#c5a059]">{t("product.specifications")} & {t("product.description")}</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Description */}
            <div className="space-y-8">
              <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/40 border-b border-white/5 pb-4 mb-8">
                {t("product.description")}
              </h3>
              <div className="prose prose-invert prose-sm max-w-none font-light text-white/70 leading-relaxed text-[13px]">
                <div dangerouslySetInnerHTML={{ __html: displayDescription || "Keine Beschreibung verfügbar." }} />
              </div>
            </div>
            
            {/* Specifications */}
            <div className="space-y-8">
              <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#c5a059] border-b border-white/5 pb-4 mb-8">
                {t("product.specifications")}
              </h3>
              
              <div className="grid grid-cols-1 gap-1">
                {/* Fixed attributes first */}
                {[
                  { label: "Marke", value: product.brand?.name },
                  { label: "Modell", value: product.type },
                  { label: "Referenz", value: product.sku },
                  { label: "Jahr", value: product.year },
                  { label: "Material", value: product.material },
                  { label: "Durchmesser", value: product.diameter },
                  { label: "Uhrwerk", value: product.movement },
                  { label: "Zustand", value: displayCondition },
                  { label: "Lieferumfang", value: displayScope },
                  { label: "Box", value: product.box === "true" || product.box === "Ja" ? "Ja" : product.box === "false" || product.box === "Nein" ? "Nein" : product.box },
                  { label: "Papiere", value: product.papers === "true" || product.papers === "Ja" ? "Ja" : product.papers === "false" || product.papers === "Nein" ? "Nein" : product.papers },
                ].filter(item => item.value && item.value !== "-" && item.value !== "N/A").map((item, idx) => {
                  const isLongValue = item.value && item.value.length > 40;
                  return (
                    <div key={idx} className={`flex ${isLongValue ? "flex-col gap-2" : "justify-between items-baseline"} py-5 border-b border-white/5 group hover:bg-white/[0.02] px-4 transition-colors`}>
                      <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black group-hover:text-white/60 transition-colors whitespace-nowrap mr-6">{item.label}</span>
                      <span className={`${isLongValue ? "text-[12px] leading-relaxed text-white/80" : "text-[13px] text-right text-white/90"} font-light group-hover:text-white transition-colors`}>
                        {item.value}
                      </span>
                    </div>
                  );
                })}

                {/* Parse additional specs from string if they exist and aren't already covered */}
                {displaySpecs && displaySpecs.split('\n').map(line => line.trim()).filter(line => line).map((line, idx) => {
                  // Remove bullets and parse Key: Value
                  const cleanLine = line.replace(/^[•\-\*]\s*/, '');
                  
                  // Special handling for Gehäuse/Technical string with pipes
                  if (cleanLine.includes('|') && !cleanLine.includes(':')) {
                    const parts = cleanLine.split('|').map(p => p.trim()).filter(p => p);
                    return parts.map((part, pIdx) => (
                      <div key={`part-${idx}-${pIdx}`} className="flex flex-col gap-2 py-5 border-b border-white/5 group hover:bg-white/[0.02] px-4 transition-colors">
                        <span className="text-[12px] font-light text-white/80 group-hover:text-white transition-colors">
                          {part}
                        </span>
                      </div>
                    ));
                  }

                  const colonIndex = cleanLine.indexOf(':');
                  
                  if (colonIndex > -1) {
                    const label = cleanLine.substring(0, colonIndex).trim();
                    const value = cleanLine.substring(colonIndex + 1).trim();
                    
                    // Skip if already in fixed attributes
                    const isDuplicate = ["Marke", "Modell", "Referenz", "Jahr", "Material", "Durchmesser", "Uhrwerk", "Box", "Papiere", "Zustand", "Lieferumfang"].some(
                      attr => label.toLowerCase().includes(attr.toLowerCase())
                    );
                    
                    if (isDuplicate) return null;

                    const isLongVal = value.length > 40;

                    return (
                      <div key={`extra-${idx}`} className={`flex ${isLongVal ? "flex-col gap-2" : "justify-between items-baseline"} py-5 border-b border-white/5 group hover:bg-white/[0.02] px-4 transition-colors`}>
                        <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black group-hover:text-white/60 transition-colors whitespace-nowrap mr-6">{label}</span>
                        <span className={`${isLongVal ? "text-[12px] leading-relaxed text-white/80" : "text-[13px] text-right text-white/90"} font-light group-hover:text-white transition-colors`}>
                          {value}
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={`text-${idx}`} className="py-5 text-[12px] font-light text-white/60 italic px-4 border-b border-white/5 bg-white/[0.01]">
                      {cleanLine}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-32 border-t border-white/10 pt-20">
            <h2 className="text-3xl font-serif mb-12 italic font-light text-[#c5a059]">Ähnliche Stücke</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {related.map(r => (
                <Link key={r.id} to={`/product/${r.slug}`} className="group space-y-4">
                  <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden">
                    <img src={r.images?.[0] || ""} alt={r.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" loading="lazy" />
                  </div>
                  <div>
                    <p className="text-[9px] tracking-widest uppercase text-[#c5a059] font-bold">{r.brand?.name}</p>
                    <h3 className="text-lg font-serif italic group-hover:text-[#c5a059] transition-colors">{r.titleDe || r.name}</h3>
                    <p className="text-sm text-white/50 mt-1">{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(r.price))}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
