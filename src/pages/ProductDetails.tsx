import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { Product } from "../types.ts";
import { useCart } from "../contexts/CartContext.tsx";
import { useWishlist } from "../contexts/WishlistContext.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useShopSettings, normalizePhoneForLink } from "../contexts/ShopSettingsContext.tsx";
import MetaTags from "../components/common/MetaTags.tsx";
import ImageLightbox from "../components/shop/ImageLightbox.tsx";
import RecentlyViewed from "../components/shop/RecentlyViewed.tsx";
import { useRecentlyViewed } from "../contexts/RecentlyViewedContext.tsx";
import ProductBreadcrumbs from "../components/product/ProductBreadcrumbs.tsx";
import ProductGallery from "../components/product/ProductGallery.tsx";
import ProductPricingBlock from "../components/product/ProductPricingBlock.tsx";
import ProductStatusBadge from "../components/product/ProductStatusBadge.tsx";
import ProductTrustFeatures from "../components/product/ProductTrustFeatures.tsx";
import ProductActions from "../components/product/ProductActions.tsx";
import ProductDetailGrid from "../components/product/ProductDetailGrid.tsx";
import ProductTabsSection from "../components/product/ProductTabsSection.tsx";
import ProductPremiumService from "../components/product/ProductPremiumService.tsx";
import ProductRelatedGrid from "../components/product/ProductRelatedGrid.tsx";
import ProductReserveModal, { type ReserveFormState } from "../components/product/ProductReserveModal.tsx";
import ProductMobileBar from "../components/product/ProductMobileBar.tsx";
import ProductSecuritySection from "../components/product/ProductSecuritySection.tsx";
import ProductPaymentMethods from "../components/product/ProductPaymentMethods.tsx";
import { stockUrgencyKey } from "../lib/stockUrgency.ts";
import { mergeSpecRows, parseSpecificationsText, splitDescriptionAndDetails } from "../lib/productDisplay.ts";
import { buildProductJsonLd } from "../lib/productJsonLd.ts";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../lib/priceOnRequest.ts";
import {
  buildDetailRows,
  buildTrustFeatures,
  canPurchaseProduct,
  getCategoryBreadcrumb,
  type ProductCertificateEligibility,
} from "../lib/productPage.ts";

export default function ProductDetails() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [certificateEligible, setCertificateEligible] = useState(false);
  const [certificateMessages, setCertificateMessages] = useState<
    ProductCertificateEligibility["messages"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveForm, setReserveForm] = useState<ReserveFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
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
          setActiveImage(0);

          const [relRes, certRes] = await Promise.all([
            fetch(`/api/products/${slug}/related`),
            fetch(`/api/products/${slug}/certificate`),
          ]);

          if (relRes.ok) setRelated(await relRes.json());
          else {
            const cat = data.type === "JEWELRY" ? "jewelry" : "watches";
            const fallback = await fetch(`/api/products?cat=${cat}&limit=4&exclude=${slug}`);
            if (fallback.ok) setRelated(await fallback.json());
          }

          if (certRes.ok) {
            const certData = await certRes.json();
            setCertificateEligible(!!certData.eligible);
            setCertificateMessages(certData.messages || null);
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

  const displayTitle = useMemo(() => {
    if (!product) return "";
    return language === "en" && product.titleEn
      ? product.titleEn
      : product.titleDe || product.name || "";
  }, [product, language]);

  useEffect(() => {
    if (!product) return;
    addRecentlyViewed({
      slug: product.slug,
      title: displayTitle,
      image: product.images?.[0] || "",
      price: product.price,
      brand: product.brand?.name,
    });
  }, [product?.slug, displayTitle, addRecentlyViewed]);

  useEffect(() => {
    if (!product) return;
    const baseUrl = window.location.origin;
    const category = getCategoryBreadcrumb(product, language);
    const breadcrumbItems = [
      { "@type": "ListItem", position: 1, name: t("product.breadcrumb.home"), item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: category.label, item: `${baseUrl}${category.path}` },
    ];
    if (product.brand?.name) {
      breadcrumbItems.push({
        "@type": "ListItem",
        position: 3,
        name: product.brand.name,
        item: product.brand.slug ? `${baseUrl}/brands/${product.brand.slug}` : `${baseUrl}/shop`,
      });
    }
    breadcrumbItems.push({
      "@type": "ListItem",
      position: breadcrumbItems.length + 1,
      name: displayTitle,
      item: `${baseUrl}/product/${product.slug}`,
    });

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [buildProductJsonLd(product as Product, baseUrl, language), { "@type": "BreadcrumbList", itemListElement: breadcrumbItems }],
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
  }, [product, language, displayTitle, t]);

  const priceOnRequestThreshold = parsePriceOnRequestThreshold(shopSettings);
  const priceOnRequest = product ? isPriceOnRequest(product.price, priceOnRequestThreshold) : false;

  const displayDescription =
    product && language === "en" && product.descriptionEn
      ? product.descriptionEn
      : product?.descriptionDe || "";
  const displayCondition =
    product && language === "en" && product.conditionEn
      ? product.conditionEn
      : product?.conditionDe || product?.condition || "";
  const displayScope =
    product && language === "en" && product.scopeOfDeliveryEn
      ? product.scopeOfDeliveryEn
      : product?.scopeOfDeliveryDe || "";
  const displaySpecs =
    product && language === "en" && product.specificationsEn
      ? product.specificationsEn
      : product?.specificationsDe || "";

  const { paragraphs: descriptionParagraphs, details: embeddedDetails } = useMemo(
    () => splitDescriptionAndDetails(displayDescription),
    [displayDescription]
  );

  const specRows = useMemo(() => {
    if (!product) return [];
    return mergeSpecRows(
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
  }, [product, language, displayCondition, displayScope, displaySpecs, embeddedDetails]);

  const detailRows = useMemo(() => {
    if (!product) return [];
    return buildDetailRows(product, language, specRows, displayCondition, displayScope, shopSettings);
  }, [product, language, specRows, displayCondition, displayScope, shopSettings]);

  const trustFeatures = useMemo(
    () => buildTrustFeatures(shopSettings, certificateEligible),
    [shopSettings, certificateEligible]
  );

  const handleAddToCart = useCallback(() => {
    if (!product || !canPurchaseProduct(product, priceOnRequest)) return;
    addItem({
      id: String(product.id),
      name: displayTitle,
      price: parseFloat(product.price),
      image: product.images?.[0] || "",
      quantity: 1,
      brand: product.brand?.name || shopSettings.shopBrandName,
    });
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 3000);
  }, [product, priceOnRequest, addItem, displayTitle, shopSettings.shopBrandName]);

  const handleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!product) return;
      toggleItem({
        id: String(product.id),
        name: displayTitle,
        price: parseFloat(product.price),
        image: product.images?.[0] || "",
        slug: product.slug,
      });
    },
    [product, displayTitle, toggleItem]
  );

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (navigator.share) {
        await navigator.share({ title: displayTitle, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert(t("product.share.copied"));
      }
    },
    [displayTitle, t]
  );

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

  if (loading) {
    return (
      <div className="pt-48 pb-24 text-center text-[10px] tracking-[0.35em] uppercase text-white/30">
        {t("common.loading")}
      </div>
    );
  }

  if (!product) {
    return <div className="pt-48 pb-24 text-center text-white/40">{t("common.back")}</div>;
  }

  const isFavorited = product.id ? isInWishlist(String(product.id)) : false;
  const authenticityNote =
    language === "en" ? shopSettings.authenticityNoteEn : shopSettings.authenticityNoteDe;
  const certificateNote =
    language === "en" ? shopSettings.certificateNoteEn : shopSettings.certificateNoteDe;
  const marginTaxNote = language === "en" ? shopSettings.marginTaxNoteEn : shopSettings.marginTaxNoteDe;
  const seoDescription =
    language === "en"
      ? product.seoDescriptionEn || product.shortDescriptionEn || displayTitle
      : product.seoDescriptionDe || product.shortDescriptionDe || displayTitle;
  const stockKey = stockUrgencyKey(product.stock);
  const whatsappPhone = normalizePhoneForLink(
    shopSettings.whatsappNumber || shopSettings.contactPhone || ""
  );
  const whatsappText = encodeURIComponent(
    language === "en"
      ? `Hello, I'm interested in: ${displayTitle}${product.sku ? ` (Ref. ${product.sku})` : ""} — ${window.location.href}`
      : `Guten Tag, ich interessiere mich für: ${displayTitle}${product.sku ? ` (Ref. ${product.sku})` : ""} — ${window.location.href}`
  );
  const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${whatsappText}` : "#";
  const images = product.images?.length ? product.images : [];

  return (
    <div className="pt-28 md:pt-32 pb-36 md:pb-28 px-5 md:px-10 bg-[#050505] min-h-screen">
      <MetaTags title={displayTitle} description={seoDescription} image={product.images?.[0]} />

      <AnimatePresence>
        {showAddedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-8 py-4 flex items-center gap-4 shadow-2xl border border-[#c5a059]"
          >
            <CheckCircle2 size={20} className="text-[#c5a059]" />
            <span className="text-[11px] tracking-widest uppercase font-bold">{t("product.add_to_cart")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <ProductBreadcrumbs product={product} displayTitle={displayTitle} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-20">
          <div className="lg:col-span-7 order-1">
            <ProductGallery
              images={images}
              displayTitle={displayTitle}
              activeIndex={activeImage}
              onActiveIndexChange={setActiveImage}
              onOpenLightbox={() => images.length > 0 && setShowLightbox(true)}
              isFavorited={isFavorited}
              onWishlist={handleWishlist}
              onShare={handleShare}
              stockBadge={stockKey ? t(stockKey) : null}
              shopSettings={shopSettings}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col order-2 lg:order-2">
            <header className="border-b border-white/[0.06] pb-8 mb-8">
              {product.brand?.name && (
                <p className="text-[#c5a059] text-[11px] tracking-[0.4em] uppercase font-medium mb-3">
                  {product.brand.name}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-serif tracking-tight leading-[1.15] mb-8 font-light italic text-white">
                {displayTitle}
              </h1>
              <ProductPricingBlock
                product={product}
                priceOnRequest={priceOnRequest}
                marginTaxNote={marginTaxNote}
              />
            </header>

            <div className="mb-8">
              <ProductStatusBadge product={product} shopSettings={shopSettings} />
            </div>

            <div className="mb-8 lg:mb-10">
              <ProductTrustFeatures
                features={trustFeatures}
                authenticityNote={authenticityNote}
                certificateNote={certificateEligible ? undefined : certificateNote}
              />
            </div>

            <div className="mb-10">
              <ProductActions
                product={product}
                priceOnRequest={priceOnRequest}
                onAddToCart={handleAddToCart}
                onReserve={() => {
                  setShowReserveModal(true);
                  setReserveSuccess(false);
                  setReserveError(null);
                }}
                whatsappUrl={whatsappUrl}
              />
            </div>

            <ProductPaymentMethods />

            <ProductDetailGrid rows={detailRows} />

            <ProductSecuritySection
              shopSettings={shopSettings}
              hasAuthenticity={Boolean(authenticityNote)}
            />
          </div>
        </div>

        <ProductTabsSection
          descriptionParagraphs={descriptionParagraphs}
          specRows={specRows}
          certificateEligible={certificateEligible}
          certificateMessages={certificateMessages}
          certificateNote={certificateNote}
        />

        <ProductPremiumService shopSettings={shopSettings} />

        <ProductRelatedGrid products={related} shopSettings={shopSettings} />

        <RecentlyViewed excludeSlug={product.slug} />
      </div>

      {images.length > 0 && (
        <ImageLightbox
          images={images}
          activeIndex={activeImage}
          alt={displayTitle}
          open={showLightbox}
          onClose={() => setShowLightbox(false)}
          onChange={setActiveImage}
        />
      )}

      <ProductMobileBar
        product={product}
        displayTitle={displayTitle}
        priceOnRequest={priceOnRequest}
        onAddToCart={handleAddToCart}
        onReserve={() => {
          setShowReserveModal(true);
          setReserveSuccess(false);
          setReserveError(null);
        }}
      />

      <ProductReserveModal
        open={showReserveModal}
        displayTitle={displayTitle}
        form={reserveForm}
        loading={reserveLoading}
        success={reserveSuccess}
        error={reserveError}
        onClose={() => setShowReserveModal(false)}
        onChange={setReserveForm}
        onSubmit={handleReserveSubmit}
      />
    </div>
  );
}
