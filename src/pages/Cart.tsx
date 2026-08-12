import { useState } from "react";
import { motion } from "motion/react";
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, CheckCircle2, LogIn, FileText } from "lucide-react";
import { useCart } from "../contexts/CartContext.tsx";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
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

const emptyAddress = (): AddressForm => ({
  name: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
});

export default function Cart() {
  const { items, removeItem, total, count, updateQuantity, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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
  const { t, language } = useLanguage();
  const { user, signIn } = useAuth();

  const formatAddress = (a: AddressForm) => ({
    name: a.name.trim(),
    street: a.street.trim(),
    postalCode: a.postalCode.trim(),
    city: a.city.trim(),
    country: a.country.trim(),
    line1: a.street.trim(),
    line2: `${a.postalCode.trim()} ${a.city.trim()}`.trim(),
  });

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
    if (differentShipping && !validateAddress(shipping)) {
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout fehlgeschlagen");
      }

      const data = await res.json();
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
            <h1 className="text-3xl font-serif italic">{t("cart.success.title")}</h1>
            <p className="text-white/40 text-sm font-light leading-relaxed">{t("cart.success.desc")}</p>
            <div className="space-y-2 pt-2">
              <p className="text-[10px] tracking-widest uppercase text-white/30">{t("cart.success.orderNumber")}</p>
              <p className="text-[#c5a059] font-serif text-xl">{orderNumber}</p>
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

          {invoiceNumber && orderId && user && (
            <InvoiceActions
              orderId={orderId}
              invoiceNumber={invoiceNumber}
              getToken={() => user.getIdToken()}
              variant="dark"
            />
          )}

          {paymentInfo && (
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
            <span>{t("cart.shipping.free")}</span>
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
                    />
                    <span className="text-sm text-white/60">{t("cart.address.differentShipping")}</span>
                  </label>
                  {differentShipping && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-white/40">{t("cart.address.shipping")}</h3>
                      <AddressFields value={shipping} onChange={setShipping} prefix="shipping" />
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
                    <span>{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-light">
                    <span className="text-white/40">{t("cart.shipping")}</span>
                    <span className="text-green-400 uppercase tracking-widest text-[10px] font-bold">{t("cart.shipping.free")}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] tracking-[0.3em] uppercase font-bold">{t("cart.total")}</span>
                    <span className="text-3xl font-serif text-[#c5a059]">
                      {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(total)}
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

                <p className="text-[9px] text-center text-white/30 uppercase tracking-widest">{t("cart.payment.note")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
