import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Shield, Clock, Award, Package, MessageSquare, ChevronRight, Share2, Heart, CheckCircle2, X, Loader2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types.ts";
import { useCart } from "../contexts/CartContext.tsx";
import { useWishlist } from "../contexts/WishlistContext.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useShopSettings, normalizePhoneForLink } from "../contexts/ShopSettingsContext.tsx";
import MetaTags from "../components/common/MetaTags.tsx";
import ImageLightbox from "../components/shop/ImageLightbox.tsx";
import RecentlyViewed from "../components/shop/RecentlyViewed.tsx";
import { useRecentlyViewed } from "../contexts/RecentlyViewedContext.tsx";
import { stockUrgencyKey } from "../lib/stockUrgency.ts";
import { mergeSpecRows, parseSpecificationsText, splitDescriptionAndDetails } from "../lib/productDisplay.ts";
import { buildProductJsonLd } from "../lib/productJsonLd.ts";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../lib/priceOnRequest.ts";

export default function ProductDetails() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveForm, setReserveForm] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "" });
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();
  const { addItem: addRecentlyViewed } = useRecentlyViewed();
  
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
          const relRes = await fetch(`/api/products/${slug}/related`);
          if (relRes.ok) setRelated(await relRes.json());
          else {
            const cat = data.type === "JEWELRY" ? "jewelry" : "watches";
            const fallback = await fetch(`/api/products?cat=${cat}&limit=4&exclude=${slug}`);
            if (fallback.ok) setRelated(await fallback.json());
          }
        }
      } catch (e) {
        console.error("Failed to fetch product", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    const title = language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name || "");
    addRecentlyViewed({
      slug: product.slug,
      title,
      image: product.images?.[0] || "",
      price: product.price,
      brand: product.brand?.name,
    });
  }, [product?.slug, language, addRecentlyViewed]);

  useEffect(() => {
    if (!product) return;
    const baseUrl = window.location.origin;
    const title = language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name || "");
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        buildProductJsonLd(product as any, baseUrl, language),
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
            { "@type": "ListItem", position: 2, name: language === "en" ? "Collection" : "Kollektion", item: `${baseUrl}/shop` },
            { "@type": "ListItem", position: 3, name: title, item: `${baseUrl}/product/${product.slug}` },
          ],
        },
      ],
    };
    const scriptId = "product-jsonld";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => {
      script?.remove();
    };
  }, [product, language]);

  if (loading) return <div className="pt-48 pb-24 text-center text-[10px] tracking-widest uppercase">{t("common.loading")}</div>;
  if (!product) return <div className="pt-48 pb-24 text-center">{t("common.back")}</div>;

  const displayTitle = language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name || "");
  const displayDescription = language === "en" && product.descriptionEn ? product.descriptionEn : (product.descriptionDe || "");
  const displayCondition = language === "en" && product.conditionEn ? product.conditionEn : (product.conditionDe || product.condition || "Hervorragend");
  const displayScope = language === "en" && product.scopeOfDeliveryEn ? product.scopeOfDeliveryEn : (product.scopeOfDeliveryDe || "Originalbox & Papiere");
  const displaySpecs = language === "en" && product.specificationsEn ? product.specificationsEn : (product.specificationsDe || "");

  const { paragraphs: descriptionParagraphs, details: embeddedDetails } = splitDescriptionAndDetails(displayDescription);
  const specRows = mergeSpecRows(
    [
      { label: language === "en" ? "Brand" : "Marke", value: product.brand?.name || "" },
      { label: language === "en" ? "Model" : "Modell", value: product.model || "" },
      { label: language === "en" ? "Reference" : "Referenz", value: product.sku || "" },
      { label: language === "en" ? "Year" : "Jahr", value: product.year || "" },
      { label: "Material", value: product.material || "" },
      { label: language === "en" ? "Case size" : "Gehäusegröße", value: product.diameter || "" },
      { label: language === "en" ? "Movement" : "Werk", value: product.movement || "" },
      { label: language === "en" ? "Condition" : "Zustand", value: displayCondition },
      { label: language === "en" ? "Scope of delivery" : "Lieferumfang", value: displayScope },
      {
        label: "Box",
        value:
          product.box === "true" || product.box === "Ja"
            ? language === "en"
              ? "Yes"
              : "Ja"
            : product.box === "false" || product.box === "Nein"
              ? language === "en"
                ? "No"
                : "Nein"
              : product.box || "",
      },
      {
        label: language === "en" ? "Papers" : "Papiere",
        value:
          product.papers === "true" || product.papers === "Ja"
            ? language === "en"
              ? "Yes"
              : "Ja"
            : product.papers === "false" || product.papers === "Nein"
              ? language === "en"
                ? "No"
                : "Nein"
              : product.papers || "",
      },
    ].filter((row) => row.value && row.value !== "-" && row.value !== "N/A"),
    embeddedDetails,
    parseSpecificationsText(displaySpecs)
  );

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

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !reserveForm.email.trim()) return;
    setReserveLoading(true);
    setReserveError(null);
    try {
      const res = await fetch(`/api/products/${slug}/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reserveForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("product.reserve.error"));
      setReserveSuccess(true);
    } catch (err: unknown) {
      setReserveError(err instanceof Error ? err.message : t("product.reserve.error"));
    } finally {
      setReserveLoading(false);
    }
  };

  const isFavorited = product.id ? isInWishlist(String(product.id)) : false;
  const priceOnRequestThreshold = parsePriceOnRequestThreshold(shopSettings);
  const priceOnRequest = isPriceOnRequest(product.price, priceOnRequestThreshold);
  const authenticityNote = language === "en" ? shopSettings.authenticityNoteEn : shopSettings.authenticityNoteDe;
  const marginTaxNote = language === "en" ? shopSettings.marginTaxNoteEn : shopSettings.marginTaxNoteDe;
  const seoDescription =
    language === "en"
      ? product.seoDescriptionEn || product.shortDescriptionEn || displayTitle
      : product.seoDescriptionDe || product.shortDescriptionDe || displayTitle;

  const stockKey = stockUrgencyKey(product.stock);
  const whatsappPhone = normalizePhoneForLink(shopSettings.whatsappNumber || shopSettings.contactPhone || "491637607805");
  const whatsappText = encodeURIComponent(
    language === "en"
      ? `Hello, I'm interested in: ${displayTitle}${product.sku ? ` (Ref. ${product.sku})` : ""} — ${window.location.href}`
      : `Guten Tag, ich interessiere mich für: ${displayTitle}${product.sku ? ` (Ref. ${product.sku})` : ""} — ${window.location.href}`
  );
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappText}`;

  return (
    <div className="pt-32 pb-32 md:pb-24 px-10 bg-[#050505]">
      <MetaTags
        title={displayTitle}
        description={seoDescription}
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
            <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden relative group border border-white/5 cursor-zoom-in" onClick={() => setShowLightbox(true)}>
              <motion.img 
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={product.images[activeImage] || "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200"} 
                className="w-full h-full object-cover opacity-80"
                alt={displayTitle}
              />
              {stockKey && (
                <span className="absolute top-4 left-4 bg-red-900/80 text-white text-[8px] tracking-[0.2em] uppercase px-3 py-1 font-bold">
                  {t(stockKey)}
                </span>
              )}
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
                  {priceOnRequest
                    ? t("product.price_on_request")
                    : new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(product.price))}
                </span>
                {!priceOnRequest && (
                  <span className="text-[10px] tracking-widest text-white/30 uppercase italic font-light">{marginTaxNote}</span>
                )}
              </div>
            </div>

            <div className="mb-10 p-6 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
              <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("product.trust.title")}</p>
              <p className="text-sm text-white/70 leading-relaxed">{authenticityNote}</p>
              {(language === "en" ? shopSettings.certificateNoteEn : shopSettings.certificateNoteDe) && (
                <p className="text-xs text-white/40 mt-3 italic">
                  {language === "en" ? shopSettings.certificateNoteEn : shopSettings.certificateNoteDe}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-[11px] text-white/60">
                <div><span className="text-white/40 uppercase tracking-widest text-[9px] block mb-1">{t("product.condition")}</span>{displayCondition}</div>
                <div><span className="text-white/40 uppercase tracking-widest text-[9px] block mb-1">{t("product.scope")}</span>{displayScope}</div>
                <div><span className="text-white/40 uppercase tracking-widest text-[9px] block mb-1">Referenz</span>{product.sku || "—"}</div>
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
                {!priceOnRequest && (
                  <button 
                    onClick={handleAddToCart}
                    className="w-full bg-white text-black py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all hover:bg-[#c5a059] hover:text-white"
                  >
                    {t("product.add_to_cart")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowReserveModal(true);
                    setReserveSuccess(false);
                    setReserveError(null);
                  }}
                  className={`w-full border border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059] hover:text-black py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all flex items-center justify-center gap-3 ${priceOnRequest ? "bg-[#c5a059]/10" : ""}`}
                >
                  <MessageSquare size={16} strokeWidth={1.5} /> {t("product.reserve.button")}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full border border-green-600/40 text-green-500 hover:bg-green-600 hover:text-white py-6 text-[11px] tracking-[0.3em] uppercase font-bold transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle size={16} strokeWidth={1.5} /> {t("product.whatsapp")}
                </a>
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
              <div className="prose prose-invert prose-sm max-w-none font-light text-white/70 leading-relaxed text-[13px] space-y-6">
                {descriptionParagraphs.length > 0 ? (
                  descriptionParagraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))
                ) : (
                  <p>{language === "en" ? "No description available." : "Keine Beschreibung verfügbar."}</p>
                )}
              </div>
            </div>
            
            {/* Specifications */}
            <div className="space-y-8">
              <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#c5a059] border-b border-white/5 pb-4 mb-8">
                {t("product.specifications")}
              </h3>
              
              <div className="grid grid-cols-1 gap-1">
                {specRows.map((item, idx) => {
                  const isLongValue = item.value.length > 40;
                  return (
                    <div
                      key={`${item.label}-${idx}`}
                      className={`flex ${isLongValue ? "flex-col gap-2" : "justify-between items-baseline"} py-5 border-b border-white/5 group hover:bg-white/[0.02] px-4 transition-colors`}
                    >
                      <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black group-hover:text-white/60 transition-colors whitespace-nowrap mr-6">
                        {item.label}
                      </span>
                      <span
                        className={`${isLongValue ? "text-[12px] leading-relaxed text-white/80" : "text-[13px] text-right text-white/90"} font-light group-hover:text-white transition-colors`}
                      >
                        {item.value}
                      </span>
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
                    <p className="text-sm text-white/50 mt-1">
                      {isPriceOnRequest(r.price, priceOnRequestThreshold)
                        ? t("product.price_on_request")
                        : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(r.price))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <RecentlyViewed excludeSlug={product.slug} />
      </div>

      <ImageLightbox
        images={product.images?.length ? product.images : ["https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200"]}
        activeIndex={activeImage}
        alt={displayTitle}
        open={showLightbox}
        onClose={() => setShowLightbox(false)}
        onChange={setActiveImage}
      />

      {/* Mobile sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-white/40 truncate">{product.brand?.name}</p>
          <p className="text-sm font-serif text-[#c5a059] truncate">
            {priceOnRequest
              ? t("product.price_on_request")
              : new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(product.price))}
          </p>
        </div>
        {!priceOnRequest && (
          <button
            onClick={handleAddToCart}
            className="px-4 py-3 bg-white text-black text-[9px] tracking-widest uppercase font-bold shrink-0"
          >
            {t("product.add_to_cart")}
          </button>
        )}
        <button
          onClick={() => { setShowReserveModal(true); setReserveSuccess(false); setReserveError(null); }}
          className="px-4 py-3 border border-[#c5a059] text-[#c5a059] text-[9px] tracking-widest uppercase font-bold shrink-0"
        >
          {t("product.reserve.button").split(" / ")[0]}
        </button>
      </div>

      <AnimatePresence>
        {showReserveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => !reserveLoading && setShowReserveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 space-y-6 relative"
            >
              <button
                type="button"
                onClick={() => setShowReserveModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
                aria-label={t("common.cancel")}
              >
                <X size={20} />
              </button>

              {reserveSuccess ? (
                <div className="text-center space-y-4 py-8">
                  <CheckCircle2 size={48} className="text-[#c5a059] mx-auto" />
                  <p className="text-lg font-serif italic">{t("product.reserve.success")}</p>
                  <button
                    type="button"
                    onClick={() => setShowReserveModal(false)}
                    className="text-[10px] tracking-widest uppercase text-[#c5a059] font-bold"
                  >
                    {t("common.back")}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-serif italic text-[#c5a059]">{t("product.reserve.title")}</h3>
                    <p className="text-sm text-white/50 mt-2">{t("product.reserve.desc")}</p>
                    <p className="text-xs text-white/30 mt-2 italic">{displayTitle}</p>
                  </div>

                  {reserveError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm">{reserveError}</div>
                  )}

                  <form onSubmit={handleReserveSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("contact.form.firstname")}</label>
                        <input
                          required
                          value={reserveForm.firstName}
                          onChange={(e) => setReserveForm((f) => ({ ...f, firstName: e.target.value }))}
                          className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("contact.form.lastname")}</label>
                        <input
                          required
                          value={reserveForm.lastName}
                          onChange={(e) => setReserveForm((f) => ({ ...f, lastName: e.target.value }))}
                          className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("contact.form.email")}</label>
                      <input
                        type="email"
                        required
                        value={reserveForm.email}
                        onChange={(e) => setReserveForm((f) => ({ ...f, email: e.target.value }))}
                        className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("contact.phone.title")}</label>
                      <input
                        value={reserveForm.phone}
                        onChange={(e) => setReserveForm((f) => ({ ...f, phone: e.target.value }))}
                        className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("product.reserve.message")}</label>
                      <textarea
                        rows={3}
                        value={reserveForm.message}
                        onChange={(e) => setReserveForm((f) => ({ ...f, message: e.target.value }))}
                        className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={reserveLoading}
                      className="w-full bg-[#c5a059] text-black py-4 text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-[#d4af37] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {reserveLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      {t("product.reserve.submit")}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
