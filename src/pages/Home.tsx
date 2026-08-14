import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Gem, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Product } from "../types.ts";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useShopSettings } from "../contexts/ShopSettingsContext.tsx";
import RecentlyViewed from "../components/shop/RecentlyViewed.tsx";
import CuratedCollections from "../components/shop/CuratedCollections.tsx";
import HomeHeroSection from "../components/home/HomeHeroSection.tsx";
import { getProductImageUrl } from "../lib/productImage.ts";

export default function Home() {
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [highlights, setHighlights] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const [heroResponse, allResponse] = await Promise.all([
          fetch("/api/products?hero=true&limit=30"),
          fetch("/api/products?limit=30"),
        ]);

        if (allResponse.ok) {
          const allData: Product[] = await allResponse.json();
          setHighlights(allData.slice(0, 3));

          if (heroResponse.ok) {
            const heroData: Product[] = await heroResponse.json();
            setHeroProducts(heroData.length > 0 ? heroData : allData);
          } else {
            setHeroProducts(allData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="overflow-hidden bg-[#050505]">
      <HomeHeroSection products={heroProducts} loading={loading} />

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
                        src={getProductImageUrl(product) || "/collections/vintage.webp"}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                        alt={language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name)}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={1000}
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

      <CuratedCollections />

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
