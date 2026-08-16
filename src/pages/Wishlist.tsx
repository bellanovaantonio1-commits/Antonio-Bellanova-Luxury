import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Heart, ShoppingBag, Trash2, Bell } from "lucide-react";
import { useWishlist } from "../contexts/WishlistContext.tsx";
import { useCart } from "../contexts/CartContext.tsx";
import { Link } from "react-router-dom";
import { useShopSettings } from "../contexts/ShopSettingsContext.tsx";
import { isPriceOnRequest, parsePriceOnRequestThreshold } from "../lib/priceOnRequest.ts";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";

interface WishlistAlert {
  productId: number;
  notifyPriceDrop: string;
  notifyBackInStock: string;
}

export default function Wishlist() {
  const { items, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const shopSettings = useShopSettings();
  const priceOnRequestThreshold = parsePriceOnRequestThreshold(shopSettings);
  const { t } = useLanguage();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Record<number, WishlistAlert>>({});

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) =>
      fetch("/api/wishlist/alerts", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: WishlistAlert[]) => {
          const map: Record<number, WishlistAlert> = {};
          rows.forEach((a) => { map[a.productId] = a; });
          setAlerts(map);
        })
        .catch(() => {})
    );
  }, [user, items.length]);

  const updateAlert = async (productId: number, field: "notifyPriceDrop" | "notifyBackInStock", value: boolean) => {
    if (!user) return;
    const current = alerts[productId] || { productId, notifyPriceDrop: "true", notifyBackInStock: "true" };
    const next = {
      notifyPriceDrop: field === "notifyPriceDrop" ? (value ? "true" : "false") : current.notifyPriceDrop,
      notifyBackInStock: field === "notifyBackInStock" ? (value ? "true" : "false") : current.notifyBackInStock,
    };
    const token = await user.getIdToken();
    const res = await fetch(`/api/wishlist/alerts/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        notifyPriceDrop: next.notifyPriceDrop === "true",
        notifyBackInStock: next.notifyBackInStock === "true",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setAlerts((prev) => ({ ...prev, [productId]: data }));
    }
  };

  const handleAddToCart = (item: any) => {
    addItem({ ...item, quantity: 1, brand: item.brand || "Antonio Bellanova" });
  };

  return (
    <div className="min-h-screen page-pt page-pb page-x">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="space-y-4 text-center">
          <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">Kollektion</h4>
          <h1 className="text-4xl md:text-5xl font-serif italic tracking-wider">Ihre Wunschliste</h1>
          <p className="text-[#F4F4F4]/40 font-light text-sm italic">Sichern Sie sich Ihre Favoriten bevor sie vergriffen sind.</p>
        </header>

        {items.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-white/10 rounded-3xl space-y-8">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Heart size={24} className="text-white/20" strokeWidth={1} />
            </div>
            <p className="text-white/30 italic">Ihre Wunschliste ist aktuell noch leer.</p>
            <Link to="/shop" className="inline-block text-[10px] tracking-widest uppercase bg-[#c5a059] text-black px-8 py-4 rounded-full font-bold hover:bg-[#d4af37] transition-all">
              Kollektion entdecken
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => {
              const alert = alerts[item.id];
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={item.id}
                  className="group bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-[#c5a059]/30 transition-all flex flex-col"
                >
                  <Link to={`/product/${item.slug}`} className="aspect-[4/5] overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                      loading="lazy"
                      decoding="async"
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); toggleItem(item); }}
                      className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-[#c5a059] hover:bg-black transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Link>
                  <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-serif italic">{item.name}</h3>
                      <p className="text-[#c5a059] font-serif">
                        {isPriceOnRequest(item.price, priceOnRequestThreshold)
                          ? t("product.price_on_request")
                          : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(item.price)}
                      </p>
                    </div>

                    {user && (
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <p className="text-[9px] tracking-widest uppercase text-white/30 flex items-center gap-2">
                          <Bell size={12} /> {t("wishlist.alerts.title")}
                        </p>
                        <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alert?.notifyPriceDrop !== "false"}
                            onChange={(e) => updateAlert(item.id, "notifyPriceDrop", e.target.checked)}
                            className="rounded border-white/20"
                          />
                          {t("wishlist.alerts.priceDrop")}
                        </label>
                        <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={alert?.notifyBackInStock !== "false"}
                            onChange={(e) => updateAlert(item.id, "notifyBackInStock", e.target.checked)}
                            className="rounded border-white/20"
                          />
                          {t("wishlist.alerts.backInStock")}
                        </label>
                      </div>
                    )}

                    {!isPriceOnRequest(item.price, priceOnRequestThreshold) && (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full border border-white/10 group-hover:border-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-black py-4 text-[10px] tracking-widest uppercase font-bold transition-all flex items-center justify-center gap-3"
                      >
                        <ShoppingBag size={14} /> In den Warenkorb
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
