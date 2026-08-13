import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight, ShieldCheck, Gem, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Product } from "../types.ts";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useShopSettings } from "../contexts/ShopSettingsContext.tsx";
import RecentlyViewed from "../components/shop/RecentlyViewed.tsx";

export default function Home() {
  const [highlights, setHighlights] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();

  useEffect(() => {
    async function fetchHighlights() {
      try {
        const response = await fetch('/api/products?limit=4');
        if (response.ok) {
          const data = await response.json();
          setHighlights(data.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to fetch highlights", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHighlights();
  }, []);

  const featured = highlights[0];
  const heroImage = featured?.mainImage || featured?.images?.[0] || "https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=2574&auto=format&fit=crop";
  const heroName = featured ? (language === "en" && featured.titleEn ? featured.titleEn : (featured.titleDe || featured.name)) : "Patek Philippe Nautilus 5711/1A";
  const heroPrice = featured ? parseFloat(featured.price) : 158400;
  const heroSlug = featured?.slug || "/shop";

  return (
    <div className="overflow-hidden bg-[#050505]">
      {/* Hero Section */}
      <section className="relative h-screen flex overflow-hidden border-b border-white/10">
        {/* Left Hero: Featured Masterpiece */}
        <div className="w-full lg:w-3/5 border-r border-white/10 relative p-12 flex flex-col justify-end">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
          
          {/* Cinematic Background */}
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url('${heroImage}')` }} />

          {/* Stylized Background Graphic Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="w-80 h-[500px] border border-white/20 rounded-full flex items-center justify-center">
              <div className="w-60 h-60 border border-[#c5a059]/40 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="relative z-20">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#c5a059] text-[10px] tracking-[0.4em] mb-4 uppercase font-bold"
            >
              {t("home.hero.subtitle")}
            </motion.p>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white text-5xl md:text-7xl font-serif leading-[0.9] mb-10 font-light"
            >
              {heroName.split(" ").slice(0, 2).join(" ")}<br/><span className="italic">{heroName.split(" ").slice(2).join(" ") || heroName}</span>
            </motion.h2>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-10"
            >
              <div>
                <p className="text-[10px] opacity-40 tracking-widest uppercase mb-1">{t("product.condition")}</p>
                <p className="text-sm tracking-wide">Excellent (Vintage 2014)</p>
              </div>
              <div>
                <p className="text-[10px] opacity-40 tracking-widest uppercase mb-1">Preis</p>
                <p className="text-sm tracking-wide font-serif italic underline underline-offset-8 decoration-white/20">
                   {new Intl.NumberFormat(language === "en" ? 'en-US' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(heroPrice)}
                </p>
              </div>
              <Link 
                to={featured ? `/product/${heroSlug}` : "/shop"} 
                className="ml-auto h-14 px-10 border border-white/20 text-[10px] tracking-[0.3em] hover:bg-white hover:text-black transition-all uppercase flex items-center justify-center font-bold"
              >
                {t("home.hero.view_details")}
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Right: Collections & Quick Access */}
        <div className="hidden lg:flex lg:w-2/5 flex-col">
          <div className="flex-1 border-b border-white/10 p-12">
            <p className="text-[10px] tracking-[0.3em] opacity-40 uppercase mb-10">{t("home.categories.title")}</p>
            <ul className="space-y-8">
              {[
                { name: t("home.categories.watches"), slug: "watches" },
                { name: t("home.categories.jewelry"), slug: "jewelry" },
              ].map((item) => (
                <li key={item.slug} className="group flex items-center justify-between cursor-pointer border-b border-transparent hover:border-[#c5a059]/50 pb-4 transition-all">
                  <Link to={`/shop?cat=${item.slug}`} className="text-3xl font-serif italic group-hover:pl-4 transition-all block w-full">
                    {item.name}
                  </Link>
                  <span className="text-[10px] opacity-30 group-hover:opacity-100 transition-all tracking-widest uppercase">{t("home.categories.explore")}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Highlight */}
          <div className="h-56 bg-[#0a0a0a] p-12 flex flex-col justify-center relative">
            <div className="absolute right-0 top-0 h-full w-1 bg-[#c5a059]" />
            <p className="text-[10px] tracking-[0.3em] text-[#c5a059] uppercase mb-3 font-bold">{t("home.service.title")}</p>
            <p className="text-sm leading-relaxed opacity-70 mb-6 font-light">
              {t("home.service.description")}
            </p>
            <div className="flex gap-8">
              <Link to="/termin" className="text-[11px] tracking-widest border-b border-[#c5a059] pb-0.5 hover:opacity-60 transition-opacity uppercase font-bold">{t("home.service.book")}</Link>
              {shopSettings.googleMapsUrl ? (
                <a href={shopSettings.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] tracking-widest border-b border-white/20 pb-0.5 hover:opacity-60 transition-opacity uppercase font-light">{t("home.service.directions")}</a>
              ) : (
                <span className="text-[11px] tracking-widest border-b border-white/20 pb-0.5 uppercase font-light opacity-50">{t("home.service.directions")}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection Grid */}
      <section className="py-32 px-10 bg-[#050505]">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[#c5a059] text-[10px] tracking-[0.4em] uppercase font-bold mb-4 block">{t("home.highlights.subtitle")}</span>
              <h2 className="text-5xl font-serif tracking-tight">{t("home.highlights.title")}</h2>
            </div>
            <Link to="/shop" className="text-[10px] tracking-[0.3em] uppercase border-b border-white/20 pb-1 hover:text-[#c5a059] hover:border-[#c5a059] transition-all mb-2">
              {t("home.highlights.view_all")}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {loading ? (
               [1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-8">
                  <div className="aspect-[4/5] bg-[#0a0a0a]" />
                  <div className="h-6 bg-[#0a0a0a] w-3/4" />
                </div>
              ))
            ) : highlights.length > 0 ? (
              highlights.map((product) => (
                <motion.div 
                  key={product.id}
                  whileHover={{ y: -10 }}
                  className="group space-y-8"
                >
                  <Link to={`/product/${product.slug}`} className="block">
                    <div className="aspect-[4/5] bg-[#0a0a0a] relative overflow-hidden">
                      <img 
                        src={product.images[0] || "https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=800"}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                        alt={language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name)}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-8 left-8">
                         <span className="text-[9px] tracking-[0.3em] uppercase text-[#c5a059] font-bold">Ref. {product.sku || "N/A"}</span>
                      </div>
                    </div>
                  </Link>
                  <div className="space-y-3">
                    <Link to={`/product/${product.slug}`}>
                      <h3 className="text-2xl font-serif italic tracking-tight group-hover:text-[#c5a059] transition-colors">
                        {language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name)}
                      </h3>
                    </Link>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">
                      {product.brand?.name || "Antonio Bellanova"}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 border border-dashed border-white/10">
                <p className="text-white/30 text-sm italic font-light">Keine aktuellen Highlights verfügbar.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Curated Collections */}
      <section className="py-24 px-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">{t("home.collections.title")}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { slug: "sport", label: t("shop.collections.sport"), image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800" },
              { slug: "vintage", label: t("shop.collections.vintage"), image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=800" },
              { slug: "under-5000", label: t("shop.collections.affordable"), image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=800" },
            ].map((col) => (
              <Link key={col.slug} to={`/shop?collection=${col.slug}`} className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10">
                <img src={col.image} alt={col.label} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-8 left-8">
                  <h3 className="text-2xl font-serif italic group-hover:text-[#c5a059] transition-colors">{col.label}</h3>
                  <span className="text-[10px] tracking-widest uppercase text-white/40 mt-2 inline-flex items-center gap-2">
                    {t("home.categories.explore")} <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-10">
        <div className="max-w-7xl mx-auto">
          <RecentlyViewed />
        </div>
      </section>

      {(shopSettings.testimonial1De || shopSettings.testimonial1En) && (
        <section className="py-24 px-10 bg-[#0a0a0a] border-y border-white/5">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">{t("home.testimonials.title")}</h4>
            <blockquote className="text-2xl md:text-3xl font-serif italic font-light leading-relaxed text-white/80">
              {language === "en" && shopSettings.testimonial1En ? shopSettings.testimonial1En : shopSettings.testimonial1De}
            </blockquote>
            {shopSettings.testimonial1Author && (
              <p className="text-[10px] tracking-widest uppercase text-white/30">{shopSettings.testimonial1Author}</p>
            )}
          </div>
        </section>
      )}

      {/* Trust & Heritage Bar */}
      <section className="bg-[#0a0a0a] border-y border-white/5 py-24 px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="flex flex-col items-center text-center space-y-6">
            <ShieldCheck size={32} strokeWidth={1} className="text-[#c5a059]" />
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-3">{t("home.trust.certified.title")}</h4>
              <p className="text-white/40 text-[12px] font-light leading-relaxed">{t("home.trust.certified.desc")}</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center space-y-6">
            <Gem size={32} strokeWidth={1} className="text-[#c5a059]" />
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-3">{t("home.trust.value.title")}</h4>
              <p className="text-white/40 text-[12px] font-light leading-relaxed">{t("home.trust.value.desc")}</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center space-y-6">
            <Clock size={32} strokeWidth={1} className="text-[#c5a059]" />
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-3">{t("home.trust.tradition.title")}</h4>
              <p className="text-white/40 text-[12px] font-light leading-relaxed">{t("home.trust.tradition.desc")}</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center space-y-6">
            <Star size={32} strokeWidth={1} className="text-[#c5a059]" />
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-3">{t("home.trust.service.title")}</h4>
              <p className="text-white/40 text-[12px] font-light leading-relaxed">{t("home.trust.service.desc")}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
