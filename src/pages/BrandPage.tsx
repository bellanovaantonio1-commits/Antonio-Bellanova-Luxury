import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import MetaTags from "../components/common/MetaTags.tsx";
import { Product } from "../types.ts";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../lib/priceOnRequest.ts";
import { useShopSettings } from "../contexts/ShopSettingsContext.tsx";

interface Brand {
  id: number;
  name: string;
  slug: string;
  descriptionDe?: string;
  descriptionEn?: string;
  logoUrl?: string;
}

export default function BrandPage() {
  const { slug = "" } = useParams();
  const { language, t } = useLanguage();
  const shopSettings = useShopSettings();
  const threshold = parsePriceOnRequestThreshold(shopSettings);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [brandRes, prodRes] = await Promise.all([
          fetch(`/api/brands/${slug}`),
          fetch(`/api/products?brand=${slug}`),
        ]);
        if (brandRes.ok) setBrand(await brandRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) return <div className="pt-48 pb-24 text-center text-[10px] tracking-widest uppercase">{t("common.loading")}</div>;
  if (!brand) return <div className="pt-48 pb-24 text-center">{t("common.back")}</div>;

  const description = language === "en" && brand.descriptionEn ? brand.descriptionEn : (brand.descriptionDe || "");

  return (
    <div className="page-pt page-pb page-x bg-[#050505]">
      <MetaTags title={brand.name} description={description || `${brand.name} — Antonio Bellanova Luxury`} />
      <div className="max-w-7xl mx-auto">
        <nav className="text-[10px] tracking-widest uppercase text-white/30 mb-8 flex gap-2">
          <Link to="/" className="hover:text-[#c5a059]">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#c5a059]">{t("nav.shop")}</Link>
          <span>/</span>
          <span className="text-white/80">{brand.name}</span>
        </nav>

        <header className="border-b border-white/10 pb-12 mb-16 flex flex-col md:flex-row md:items-end gap-8">
          {brand.logoUrl && (
            <img src={brand.logoUrl} alt={brand.name} className="h-16 object-contain opacity-80" loading="lazy" decoding="async" />
          )}
          <div>
            <h1 className="text-4xl md:text-5xl font-serif italic font-light">{brand.name}</h1>
            {description && <p className="text-white/50 mt-4 max-w-2xl leading-relaxed">{description}</p>}
            <p className="text-white/30 text-sm mt-4">{products.length} {language === "en" ? "pieces" : "Stücke"}</p>
          </div>
        </header>

        {products.length === 0 ? (
          <p className="text-white/30 italic">{t("shop.no_products")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {products.map((product) => (
              <Link key={product.id} to={`/product/${product.slug}`} className="group space-y-4">
                <div className="aspect-[4/5] bg-[#0a0a0a] overflow-hidden">
                  <img
                    src={product.images?.[0] || ""}
                    alt={product.name}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-serif italic group-hover:text-[#c5a059] transition-colors">
                    {language === "en" && product.titleEn ? product.titleEn : (product.titleDe || product.name)}
                  </h3>
                  <p className="text-sm text-white/50 mt-1">
                    {isPriceOnRequest(product.price, threshold)
                      ? t("product.price_on_request")
                      : new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(product.price))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
