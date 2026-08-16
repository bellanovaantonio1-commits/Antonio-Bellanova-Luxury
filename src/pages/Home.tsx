import { useState, useEffect } from "react";
import { ShieldCheck, Gem, Clock, Star } from "lucide-react";
import { Product } from "../types.ts";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useShopSettings } from "../contexts/ShopSettingsContext.tsx";
import RecentlyViewed from "../components/shop/RecentlyViewed.tsx";
import CuratedCollections from "../components/shop/CuratedCollections.tsx";
import HomeHeroSection from "../components/home/HomeHeroSection.tsx";
import HomeHighlightsSection from "../components/home/HomeHighlightsSection.tsx";

export default function Home() {
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [highlightProducts, setHighlightProducts] = useState<Product[]>([]);
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
          const unique = Array.from(new Map(allData.map((p) => [String(p.id), p])).values());
          setHighlightProducts(unique);

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
      <HomeHighlightsSection products={highlightProducts} loading={loading} />

      <CuratedCollections />

      <section className="py-16 sm:py-24 page-x">
        <div className="max-w-7xl mx-auto">
          <RecentlyViewed />
        </div>
      </section>

      {(shopSettings.testimonial1De || shopSettings.testimonial1En) && (
        <section className="py-16 sm:py-24 page-x bg-[#0a0a0a] border-y border-white/5">
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
      <section className="bg-[#0a0a0a] border-y border-white/5 py-16 sm:py-24 page-x">
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
