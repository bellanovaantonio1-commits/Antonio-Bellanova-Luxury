import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, CheckCircle2, LogIn, FileText, CreditCard } from "lucide-react";
import { useCart } from "../contexts/CartContext.tsx";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useShopSettings } from "../contexts/ShopSettingsContext.tsx";
import InvoiceActions from "../components/InvoiceActions.tsx";

interface PaymentInfo {
  bankName?: string;
  bankIban?: string;
  bankBic?: string;
  bankAccountHolder?: string;
  paymentInstructionsDe?: string;
  paymentInstructionsEn?: string;
}

interface AddressForm {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

interface SavedAddress extends AddressForm {
  id: number;
  isDefault: string;
}

const emptyAddress = (): AddressForm => ({
  name: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
});

export default function Cart() {
  const { items, removeItem, total, count, updateQuantity, clearCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isStripeSuccess, setIsStripeSuccess] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<AddressForm>(emptyAddress());
  const [shipping, setShipping] = useState<AddressForm>(emptyAddress());
  const [differentShipping, setDifferentShipping] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [customerVatId, setCustomerVatId] = useState("");
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [shippingFreeFrom, setShippingFreeFrom] = useState<number>(500);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "STRIPE" | "PREPAYMENT">("BANK_TRANSFER");
  const [stripePaymentStatus, setStripePaymentStatus] = useState<string | null>(null);
  const [stripeConfirming, setStripeConfirming] = useState(false);
  const [successItems, setSuccessItems] = useState<{ name: string; quantity: number; price: number }[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<"SHIPPING" | "PICKUP">("SHIPPING");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "">("");
  const [checkoutQuote, setCheckoutQuote] = useState<{
    shopSubtotalGross: number;
    subtotalGross: number;
    prepaymentDiscount: number;
    shippingCost: number;
    totalGross: number;
    bankTransferEnabled?: boolean;
    prepaymentEnabled?: boolean;
    stripeEnabled?: boolean;
    paymentMethods?: { id: string; name: string; description: string; sortOrder: number }[];
  } | null>(null);
  const { t, language } = useLanguage();
  const { user, signIn } = useAuth();
  const shopSettings = useShopSettings();

  const shippingCountry = deliveryMethod === "PICKUP" ? "Deutschland" : ((differentShipping ? shipping.country : billing.country) || "Deutschland");
  const fallbackGrandTotal = total + (deliveryMethod === "PICKUP" ? 0 : (shippingCost ?? 0));
  const displaySubtotal = showCheckoutForm && checkoutQuote ? checkoutQuote.shopSubtotalGross : total;
  const displayShipping =
    showCheckoutForm && checkoutQuote ? checkoutQuote.shippingCost : (deliveryMethod === "PICKUP" ? 0 : (shippingCost ?? 0));
  const displayTotal = showCheckoutForm && checkoutQuote ? checkoutQuote.totalGross : fallbackGrandTotal;
  const prepaymentDiscount = showCheckoutForm && checkoutQuote ? checkoutQuote.prepaymentDiscount : 0;
  const bankTransferEnabled =
    checkoutQuote?.bankTransferEnabled ?? shopSettings.bankTransferEnabled !== "false";
  const availablePaymentMethods =
    checkoutQuote?.paymentMethods?.length
      ? checkoutQuote.paymentMethods
      : [
          ...(stripeEnabled
            ? [{ id: "STRIPE", name: t("cart.payment.stripe"), description: t("cart.payment.stripeNote"), sortOrder: 1 }]
            : []),
          ...(bankTransferEnabled
            ? [{ id: "BANK_TRANSFER", name: t("cart.payment.bank"), description: t("cart.payment.bankNote"), sortOrder: 2 }]
            : []),
        ];
  const showPaymentMethods = availablePaymentMethods.length > 0;

  useEffect(() => {
    if (availablePaymentMethods.length === 0) return;
    if (!availablePaymentMethods.some((m) => m.id === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0].id as "STRIPE" | "BANK_TRANSFER" | "PREPAYMENT");
    }
  }, [availablePaymentMethods, paymentMethod]);

  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    const orderParam = searchParams.get("order");
    if (stripeParam === "success" && orderParam) {
      setIsStripeSuccess(true);
      setIsSuccess(true);
      setOrderNumber(orderParam);
      setStripeConfirming(true);
      setShowCheckoutForm(true);
      setSearchParams({}, { replace: true });
    } else if (stripeParam === "cancelled") {
      setError(t("cart.payment.cancelled"));
      setShowCheckoutForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    if (!isStripeSuccess || !orderNumber || !user) return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/orders/by-number/${encodeURIComponent(orderNumber)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return false;
        const data = await res.json();
        setOrderId(data.id);
        setStripePaymentStatus(data.paymentStatus);
        if (data.items?.length) setSuccessItems(data.items);
        if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
        if (data.paymentStatus === "PAID") {
          clearCart();
          setStripeConfirming(false);
          return true;
        }
        if (data.paymentStatus === "FAILED" || data.paymentStatus === "CANCELLED") {
          setStripeConfirming(false);
          return true;
        }
      } catch {
        /* retry */
      }
      return false;
    };

    const run = async () => {
      const done = await poll();
      if (done || cancelled) return;
      const interval = window.setInterval(async () => {
        attempts += 1;
        const finished = await poll();
        if (finished || attempts >= 15) {
          window.clearInterval(interval);
          if (!finished && !cancelled) setStripeConfirming(false);
        }
      }, 2000);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isStripeSuccess, orderNumber, user, clearCart, t]);

  useEffect(() => {
    if (items.length === 0) {
      setShippingCost(null);
      return;
    }

    if (deliveryMethod === "PICKUP") {
      setShippingCost(0);
      return;
    }

    let cancelled = false;
    setShippingLoading(true);
    fetch(`/api/shipping/quote?country=${encodeURIComponent(shippingCountry)}&subtotal=${total}&method=${shippingMethod}&deliveryMethod=${deliveryMethod}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setShippingCost(Number(data.shippingCost) || 0);
        setShippingFreeFrom(Number(data.freeFrom) || 500);
        setStripeEnabled(Boolean(data.stripeEnabled));
        if (!data.stripeEnabled) setPaymentMethod("BANK_TRANSFER");
      })
      .catch(() => {
        if (!cancelled) setShippingCost(0);
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shippingCountry, total, items.length, shippingMethod, deliveryMethod]);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      return;
    }
    user.getIdToken().then((token) =>
      fetch("/api/account/addresses", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((addrs: SavedAddress[]) => {
          setSavedAddresses(addrs);
          const def = addrs.find((a) => a.isDefault === "true");
          if (def && !billing.name) {
            setBilling({ name: def.name, street: def.street, postalCode: def.postalCode, city: def.city, country: def.country });
            setSelectedAddressId(def.id);
          }
        })
        .catch(() => setSavedAddresses([]))
    );
  }, [user]);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" }).format(amount);

  const shippingLabel = () => {
    if (deliveryMethod === "PICKUP") return t("cart.delivery.pickup");
    if (shippingLoading || shippingCost === null) return t("cart.shipping.calculated");
    if (shippingCost === 0) return t("cart.shipping.free");
    return formatMoney(shippingCost);
  };

  const applySavedAddress = (id: number | "") => {
    setSelectedAddressId(id);
    if (id === "") return;
    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) {
      setBilling({ name: addr.name, street: addr.street, postalCode: addr.postalCode, city: addr.city, country: addr.country });
    }
  };

  const formatAddress = (a: AddressForm) => ({
    name: a.name.trim(),
    street: a.street.trim(),
    postalCode: a.postalCode.trim(),
    city: a.city.trim(),
    country: a.country.trim(),
    line1: a.street.trim(),
    line2: `${a.postalCode.trim()} ${a.city.trim()}`.trim(),
  });

  useEffect(() => {
    if (!showCheckoutForm || items.length === 0) {
      setCheckoutQuote(null);
      return;
    }

    let cancelled = false;
    fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        paymentMethod,
        deliveryMethod,
        shippingMethod,
        billingAddress: formatAddress(billing),
        shippingAddress: differentShipping ? formatAddress(shipping) : formatAddress(billing),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setCheckoutQuote(data);
      })
      .catch(() => {
        if (!cancelled) setCheckoutQuote(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    showCheckoutForm,
    items,
    paymentMethod,
    deliveryMethod,
    shippingMethod,
    billing,
    shipping,
    differentShipping,
  ]);

  const validateAddress = (a: AddressForm) =>
    a.name.trim() && a.street.trim() && a.postalCode.trim() && a.city.trim() && a.country.trim();

  const handleCheckout = async () => {
    if (!user) {
      await signIn();
      return;
    }

    if (!showCheckoutForm) {
      setShowCheckoutForm(true);
      if (user.displayName && !billing.name) {
        setBilling((b) => ({ ...b, name: user.displayName || "" }));
      }
      return;
    }

    if (!validateAddress(billing)) {
      setError(t("cart.address.required"));
      return;
    }
    if (deliveryMethod === "SHIPPING" && differentShipping && !validateAddress(shipping)) {
      setError(t("cart.shipping.required"));
      return;
    }

    setIsCheckingOut(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const billingAddress = formatAddress(billing);
      const shippingAddress = differentShipping ? formatAddress(shipping) : billingAddress;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
          billingAddress,
          shippingAddress,
          customerName: billingAddress.name,
          companyName: isBusiness ? companyName.trim() || null : null,
          customerVatId: isBusiness ? customerVatId.trim() || null : null,
          language,
          paymentMethod,
          deliveryMethod,
          shippingMethod: deliveryMethod === "PICKUP" ? undefined : shippingMethod,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout fehlgeschlagen");
      }

      const data = await res.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setOrderNumber(data.orderNumber || `ORD-${data.id}`);
      setOrderId(data.id);
      setInvoiceNumber(data.invoiceNumber || null);
      setPaymentInfo(data.paymentInfo || null);
      clearCart();
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout fehlgeschlagen");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isSuccess) {
    const paymentHint =
      language === "en"
        ? paymentInfo?.paymentInstructionsEn || paymentInfo?.paymentInstructionsDe
        : paymentInfo?.paymentInstructionsDe;

    return (
      <div className="min-h-screen pt-40 pb-20 px-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center space-y-8 bg-white/5 border border-white/10 p-12 rounded-3xl"
        >
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-green-500" strokeWidth={1.5} />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-serif italic">
              {isStripeSuccess ? t("cart.success.stripe.title") : t("cart.success.title")}
            </h1>
            <p className="text-white/40 text-sm font-light leading-relaxed">
              {isStripeSuccess ? t("cart.success.stripe.desc") : t("cart.success.desc")}
            </p>
            <div className="space-y-2 pt-2">
              <p className="text-[10px] tracking-widest uppercase text-white/30">{t("cart.success.orderNumber")}</p>
              <p className="text-[#c5a059] font-serif text-xl">{orderNumber}</p>
              {isStripeSuccess && (
                <div className="pt-2">
                  <p className="text-[10px] tracking-widest uppercase text-white/30">{t("cart.payment.status")}</p>
                  <p className="text-sm font-bold uppercase tracking-widest text-white/80">
                    {stripeConfirming
                      ? t("cart.payment.stripePending")
                      : stripePaymentStatus === "PAID"
                        ? t("cart.payment.status.paid")
                        : stripePaymentStatus === "FAILED"
                          ? t("cart.payment.status.failed")
                          : t("cart.payment.status.pending")}
                  </p>
                </div>
              )}
              {invoiceNumber ? (
                <>
                  <p className="text-[10px] tracking-widest uppercase text-white/30 pt-2">{t("cart.success.invoiceNumber")}</p>
                  <p className="text-white/80 font-mono text-sm">{invoiceNumber}</p>
                </>
              ) : (
                <p className="text-white/30 text-xs pt-4 leading-relaxed">{t("cart.success.invoicePending")}</p>
              )}
            </div>
          </div>

          {successItems.length > 0 && (
            <div className="text-left bg-black/30 border border-white/10 rounded-xl p-6 space-y-3 text-sm">
              <p className="text-[10px] tracking-widest uppercase text-[#c5a059] font-bold">{t("cart.summary")}</p>
              {successItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-white/70">
                  <span>{item.quantity}× {item.name}</span>
                  <span>{formatMoney(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          {invoiceNumber && orderId && user && (
            <InvoiceActions
              orderId={orderId}
              invoiceNumber={invoiceNumber}
              getToken={() => user.getIdToken()}
              variant="dark"
            />
          )}

          {paymentInfo && !isStripeSuccess && (
            <div className="text-left bg-black/30 border border-white/10 rounded-xl p-6 space-y-3 text-sm">
              <p className="text-[10px] tracking-widest uppercase text-[#c5a059] font-bold">{t("cart.payment.bank")}</p>
              <p className="text-white/60">{paymentHint}</p>
              {paymentInfo.bankAccountHolder && (
                <p><span className="text-white/40">{t("cart.payment.recipient")}:</span> {paymentInfo.bankAccountHolder}</p>
              )}
              {paymentInfo.bankIban && (
                <p><span className="text-white/40">IBAN:</span> {paymentInfo.bankIban}</p>
              )}
              {paymentInfo.bankBic && (
                <p><span className="text-white/40">BIC:</span> {paymentInfo.bankBic}</p>
              )}
              {paymentInfo.bankName && (
                <p><span className="text-white/40">{t("cart.payment.bankLabel")}:</span> {paymentInfo.bankName}</p>
              )}
              <p className="text-white/40 text-xs pt-2">{t("cart.payment.reference")}: {orderNumber}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              to="/account/orders"
              className="block w-full bg-white/10 text-white py-4 rounded-full text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-white/20 transition-all"
            >
              {t("cart.success.viewOrders")}
            </Link>
            <Link
              to="/shop"
              className="block w-full bg-white/5 border border-white/10 text-white py-4 rounded-full text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-white/10 transition-all"
            >
              {t("cart.continue")}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const AddressFields = ({
    value,
    onChange,
    prefix,
  }: {
    value: AddressForm;
    onChange: (v: AddressForm) => void;
    prefix: string;
  }) => (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.address.name")}</label>
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
        />
      </div>
      <div>
        <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.address.street")}</label>
        <input
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.address.postal")}</label>
          <input
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
          />
        </div>
        <div>
          <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.address.city")}</label>
          <input
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.address.country")}</label>
        <input
          value={value.country}
          onChange={(e) => onChange({ ...value, country: e.target.value })}
          className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-40 pb-20 px-10">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="space-y-4">
          <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">Checkout</h4>
          <h1 className="text-4xl md:text-5xl font-serif italic tracking-wider">{t("cart.title")}</h1>
          <div className="flex items-center gap-4 text-white/30 text-[10px] tracking-widest uppercase font-bold">
            <span>{count} {t("cart.items")}</span>
            <span className="w-1 h-1 bg-white/10 rounded-full" />
            <span>{shippingLabel()}</span>
          </div>
        </header>

        {!user && items.length > 0 && (
          <div className="bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-xl p-6 flex items-center justify-between gap-4">
            <p className="text-sm text-white/70">{t("cart.login.required")}</p>
            <button onClick={signIn} className="flex items-center gap-2 bg-[#c5a059] text-black px-6 py-3 rounded-full text-[10px] tracking-widest uppercase font-bold">
              <LogIn size={14} /> {t("cart.login.button")}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-white/10 rounded-3xl space-y-8">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag size={24} className="text-white/20" strokeWidth={1} />
            </div>
            <p className="text-white/30 italic">{t("cart.empty")}</p>
            <Link to="/shop" className="inline-block text-[10px] tracking-widest uppercase bg-[#c5a059] text-black px-8 py-4 rounded-full font-bold hover:bg-[#d4af37] transition-all">
              {t("home.categories.explore")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-6">
              {items.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  className="flex gap-8 bg-white/5 border border-white/5 p-6 rounded-2xl group relative"
                >
                  <div className="w-32 h-40 bg-black rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div className="space-y-2">
                      <p className="text-[10px] tracking-widest uppercase text-[#c5a059] font-bold">{item.brand}</p>
                      <h3 className="text-xl font-serif italic">{item.name}</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 bg-black/40 rounded-full px-4 py-2 border border-white/5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="text-white/20 hover:text-white transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="text-white/20 hover:text-white transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-lg font-serif">
                        {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="absolute top-6 right-6 text-white/10 hover:text-red-400 transition-colors">
                    <Trash2 size={18} strokeWidth={1.5} />
                  </button>
                </motion.div>
              ))}

              {showCheckoutForm && user && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8"
                >
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <FileText size={18} className="text-[#c5a059]" />
                    <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("cart.address.billing")}</h3>
                  </div>

                  {savedAddresses.length > 0 && (
                    <div>
                      <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.address.useSaved")}</label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => applySavedAddress(e.target.value ? parseInt(e.target.value, 10) : "")}
                        className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                      >
                        <option value="">—</option>
                        {savedAddresses.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} — {a.city}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <AddressFields value={billing} onChange={setBilling} prefix="billing" />

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBusiness}
                      onChange={(e) => setIsBusiness(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    <span className="text-sm text-white/60">{t("cart.business.label")}</span>
                  </label>
                  {isBusiness && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-6 border-l-2 border-[#c5a059]/30">
                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.business.company")}</label>
                        <input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-white/40 font-bold">{t("cart.business.vat")}</label>
                        <input
                          value={customerVatId}
                          onChange={(e) => setCustomerVatId(e.target.value)}
                          placeholder="DE123456789"
                          className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#c5a059]/50"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={differentShipping}
                      onChange={(e) => setDifferentShipping(e.target.checked)}
                      className="rounded border-white/20"
                      disabled={deliveryMethod === "PICKUP"}
                    />
                    <span className="text-sm text-white/60">{t("cart.address.differentShipping")}</span>
                  </label>
                  {differentShipping && deliveryMethod === "SHIPPING" && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-white/40">{t("cart.address.shipping")}</h3>
                      <AddressFields value={shipping} onChange={setShipping} prefix="shipping" />
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("cart.delivery.title")}</h3>
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-white/10 hover:border-[#c5a059]/30 transition-colors">
                      <input type="radio" name="deliveryMethod" checked={deliveryMethod === "SHIPPING" && shippingMethod === "standard"} onChange={() => { setDeliveryMethod("SHIPPING"); setShippingMethod("standard"); }} className="mt-1" />
                      <div>
                        <p className="text-sm font-bold">{t("cart.delivery.standard")}</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-white/10 hover:border-[#c5a059]/30 transition-colors">
                      <input type="radio" name="deliveryMethod" checked={deliveryMethod === "SHIPPING" && shippingMethod === "express"} onChange={() => { setDeliveryMethod("SHIPPING"); setShippingMethod("express"); }} className="mt-1" />
                      <div>
                        <p className="text-sm font-bold">{t("cart.delivery.express")}</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-white/10 hover:border-[#c5a059]/30 transition-colors">
                      <input type="radio" name="deliveryMethod" checked={deliveryMethod === "PICKUP"} onChange={() => setDeliveryMethod("PICKUP")} className="mt-1" />
                      <div>
                        <p className="text-sm font-bold">{t("cart.delivery.pickup")}</p>
                        <p className="text-xs text-white/40 mt-1">
                          {language === "en" ? shopSettings.pickupNoteEn : shopSettings.pickupNoteDe}
                        </p>
                      </div>
                    </label>
                  </div>

                  {showPaymentMethods && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("cart.payment.method")}</h3>
                      {availablePaymentMethods.map((method) => (
                        <label
                          key={method.id}
                          className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-white/10 hover:border-[#c5a059]/30 transition-colors"
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === method.id}
                            onChange={() =>
                              setPaymentMethod(method.id as "STRIPE" | "BANK_TRANSFER" | "PREPAYMENT")
                            }
                            className="mt-1"
                          />
                          <div className="flex items-start gap-2 flex-1">
                            {method.id === "STRIPE" && (
                              <CreditCard size={16} className="text-[#c5a059] mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-bold">{method.name}</p>
                              {method.description && (
                                <p className="text-xs text-white/40 mt-1">{method.description}</p>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 space-y-10 sticky top-40">
                <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059] border-b border-white/10 pb-4">{t("cart.summary")}</h3>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-light">
                    <span className="text-white/40">{t("cart.subtotal")}</span>
                    <span>{formatMoney(displaySubtotal)}</span>
                  </div>
                  {prepaymentDiscount > 0 &&
                    (paymentMethod === "BANK_TRANSFER" || paymentMethod === "PREPAYMENT") && (
                    <div className="flex justify-between text-sm font-light text-green-400">
                      <span>{t("cart.prepaymentDiscount")}</span>
                      <span>− {formatMoney(prepaymentDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-light">
                    <span className="text-white/40">{t("cart.shipping")}</span>
                    <span className={displayShipping === 0 && !shippingLoading ? "text-green-400 uppercase tracking-widest text-[10px] font-bold" : ""}>
                      {showCheckoutForm && checkoutQuote
                        ? displayShipping === 0
                          ? t("cart.shipping.free")
                          : formatMoney(displayShipping)
                        : shippingLabel()}
                    </span>
                  </div>
                  {shippingFreeFrom > 0 && total < shippingFreeFrom && shippingCost !== null && shippingCost > 0 && (
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">
                      {t("cart.shipping.freeFrom").replace("{amount}", formatMoney(shippingFreeFrom))}
                    </p>
                  )}
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] tracking-[0.3em] uppercase font-bold">{t("cart.total")}</span>
                    <span className="text-3xl font-serif text-[#c5a059]">
                      {formatMoney(displayTotal)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-[#c5a059] text-black py-6 rounded-full text-[11px] tracking-[0.3em] uppercase font-bold hover:bg-[#d4af37] transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingOut
                    ? t("cart.processing")
                    : !user
                      ? t("cart.login.button")
                      : showCheckoutForm
                        ? t("cart.placeOrder")
                        : t("cart.checkout")}{" "}
                  <ArrowRight size={16} />
                </button>

                <p className="text-[9px] text-center text-white/30 uppercase tracking-widest">
                  {stripeEnabled && paymentMethod === "STRIPE" ? t("cart.payment.stripeNote") : t("cart.payment.note")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
