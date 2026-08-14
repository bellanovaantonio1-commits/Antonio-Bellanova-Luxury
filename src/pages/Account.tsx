import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Package, MapPin, Heart, Shield, LogOut, ChevronRight, Settings, Award } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import InvoiceActions from "../components/InvoiceActions.tsx";
import CertificateActions from "../components/CertificateActions.tsx";
import { useWishlist } from "../contexts/WishlistContext.tsx";
import { useIsAdmin } from "../hooks/useIsAdmin.ts";
import { Link, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { Order, OrderStatus } from "../types.ts";
import AddressesManager from "../components/account/AddressesManager.tsx";

function OrderTracking({ status }: { status: OrderStatus }) {
  const steps = [
    { key: "PENDING", label: "Bestellt", icon: Package },
    { key: "PROCESSING", label: "In Bearbeitung", icon: Settings },
    { key: "SHIPPED", label: "Versendet", icon: MapPin },
    { key: "DELIVERED", label: "Geliefert", icon: Shield },
  ];

  const currentStep = steps.findIndex(s => s.key === status);
  const activeSteps = currentStep === -1 ? 0 : currentStep;

  return (
    <div className="pt-8">
      <div className="relative flex justify-between items-center max-w-xl mx-auto">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2" />
        
        {/* Progress Bar Active */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(activeSteps / (steps.length - 1)) * 100}%` }}
          className="absolute top-1/2 left-0 h-[1px] bg-[#c5a059] -translate-y-1/2 transition-all duration-1000"
        />

        {steps.map((step, idx) => {
          const isActive = idx <= activeSteps;
          const isCurrent = idx === activeSteps;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-4">
              <motion.div 
                animate={{ 
                  scale: isCurrent ? 1.2 : 1,
                  backgroundColor: isActive ? "#c5a059" : "rgb(0,0,0)",
                  borderColor: isActive ? "#c5a059" : "rgba(255,255,255,0.1)"
                }}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isActive ? "text-black" : "text-white/20"}`}
              >
                <Icon size={14} />
              </motion.div>
              <span className={`text-[9px] tracking-widest uppercase font-bold text-center absolute -bottom-8 w-24 transition-colors ${isActive ? "text-white" : "text-white/20"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrdersView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/orders/my", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        } else {
          setApiError(true);
        }
      } catch (error) {
        console.error("Failed to fetch orders", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (loading) {
    return (
      <div className="p-20 text-center text-white/20 italic animate-pulse">
        Bestellungen werden geladen...
      </div>
    );
  }

  if (apiError) {
    return (
      <section className="p-10 bg-white/5 rounded-2xl border border-amber-500/20">
        <h3 className="text-sm uppercase tracking-widest text-amber-400">Bestellungen</h3>
        <p className="mt-4 text-white/50 text-sm">Datenbank nicht verbunden — Bestellungen können erst geladen werden, wenn <code className="text-[#c5a059]">DATABASE_URL</code> in der .env gesetzt ist.</p>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="p-10 bg-white/5 rounded-2xl border border-white/10">
        <h3 className="text-sm uppercase tracking-widest text-[#c5a059]">Bestellungen</h3>
        <p className="mt-8 text-white/30 italic">Keine Bestellungen gefunden.</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {orders.map(order => {
        const invoiceNumber = (order as { invoiceNumber?: string | null }).invoiceNumber;
        const invoiceStatus = (order as { invoiceStatus?: string | null }).invoiceStatus;
        return (
        <section key={order.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-8 space-y-8 sm:space-y-10">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] tracking-widest uppercase text-white/20 font-bold">Bestellnummer</span>
                <p className="text-lg font-serif italic text-[#c5a059] break-all">{order.orderNumber}</p>
                {invoiceNumber && (
                  <>
                    <span className="text-[10px] tracking-widest uppercase text-white/20 font-bold block mt-3">Rechnungsnummer</span>
                    <p className="text-sm font-mono text-white/70 break-all">{invoiceNumber}</p>
                  </>
                )}
              </div>
              <div className="space-y-1 text-left sm:text-right shrink-0">
                <span className="text-[10px] tracking-widest uppercase text-white/20 font-bold">Bestelldatum</span>
                <p className="text-sm font-light">
                  {order.createdAt ? (typeof order.createdAt === 'string' ? new Date(order.createdAt).toLocaleDateString('de-DE') : (order.createdAt as { toDate?: () => Date }).toDate?.()?.toLocaleDateString('de-DE') || 'Neu') : 'Neu'}
                </p>
              </div>
            </div>

            {invoiceNumber && user ? (
              <InvoiceActions
                orderId={order.id}
                invoiceNumber={invoiceNumber}
                invoiceStatus={invoiceStatus}
                getToken={() => user.getIdToken()}
                variant="dark"
              />
            ) : (
              !invoiceNumber && order.status !== "CANCELLED" && (
                <p className="text-xs text-white/40 text-center tracking-wide">{t("invoice.pending")}</p>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <span className="text-[10px] tracking-widest uppercase text-white/20 font-bold block">Status & Sendungsverfolgung</span>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${order.status === 'DELIVERED' ? 'bg-green-500' : 'bg-[#c5a059] animate-pulse'}`} />
                  <p className="text-sm uppercase tracking-widest font-bold">
                    {order.status === 'PENDING' && 'Eingegangen'}
                    {order.status === 'PROCESSING' && 'In Bearbeitung'}
                    {order.status === 'SHIPPED' && 'Versendet'}
                    {order.status === 'IN_TRANSIT' && 'In Zustellung'}
                    {order.status === 'DELIVERED' && 'Zugestellt'}
                  </p>
                </div>
                {order.trackingNumber && (
                  <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Tracking Number</p>
                    <p className="text-xs font-mono text-[#c5a059]">{order.trackingNumber}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-2">Carrier</p>
                    <p className="text-xs">{order.carrier || 'Standard Express'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <span className="text-[10px] tracking-widest uppercase text-white/20 font-bold block">Artikel</span>
              <div className="space-y-4">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs font-light truncate max-w-[200px]">{item.name}</span>
                    <span className="text-xs text-white/40">x{item.quantity}</span>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Gesamtsumme</span>
                  <span className="text-xl font-serif text-[#c5a059]">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(order.totalAmount || order.total || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 overflow-x-auto">
            <OrderTracking status={order.status} />
          </div>
        </section>
        );
      })}
    </div>
  );
}

function NewsletterSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) =>
      fetch("/api/account/newsletter", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : { subscribed: false }))
        .then((d) => setSubscribed(Boolean(d.subscribed)))
        .finally(() => setLoading(false))
    );
  }, [user]);

  const toggle = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/account/newsletter", {
        method: subscribed ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSubscribed(!subscribed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-10 space-y-6">
      <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("account.newsletter.title")}</h3>
      {loading ? (
        <p className="text-white/30 italic text-sm">{t("common.loading")}</p>
      ) : (
        <>
          <p className="text-sm font-light text-white/60 leading-relaxed">
            {subscribed ? t("account.newsletter.subscribed") : t("account.newsletter.notSubscribed")}
          </p>
          <p className="text-xs text-white/30">{t("account.newsletter.hint")}</p>
          <button
            onClick={toggle}
            disabled={busy}
            className="text-[10px] tracking-widest uppercase font-bold text-[#c5a059] border-b border-[#c5a059]/30 pb-1 hover:border-[#c5a059] transition-colors disabled:opacity-50"
          >
            {subscribed ? t("account.newsletter.unsubscribe") : t("account.newsletter.subscribe")}
          </button>
        </>
      )}
    </section>
  );
}

function AccountDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchLastOrder = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/orders/my", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setLastOrder(data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch last order", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastOrder();
  }, [user]);

  return (
    <div className="space-y-12">
      <section className="bg-white/5 border border-white/10 rounded-2xl p-10 space-y-8">
        <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059] border-b border-white/10 pb-4">Letzte Bestellung</h3>
        
        {loading ? (
          <div className="py-12 text-center text-white/20 italic animate-pulse">Wird geladen...</div>
        ) : lastOrder ? (
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Bestellnummer</p>
                <p className="font-serif italic text-xl text-[#c5a059]">{lastOrder.orderNumber}</p>
              </div>
              <Link to="/account/orders" className="text-[10px] tracking-widest uppercase font-bold text-[#c5a059] border-b border-[#c5a059]/30 pb-1 hover:border-[#c5a059] transition-all">Details ansehen</Link>
            </div>
            
            <OrderTracking status={lastOrder.status} />
            
            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 border-t border-white/5">
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Status</p>
                <p className="text-xs font-bold uppercase tracking-widest">{lastOrder.status}</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Artikel</p>
                <p className="text-xs font-bold">{lastOrder.items.length}</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Summe</p>
                <p className="text-xs font-bold">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(lastOrder.totalAmount || lastOrder.total || 0))}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Tracking</p>
                <p className="text-xs font-bold font-mono">{lastOrder.trackingNumber || 'N/A'}</p>
              </div>
            </div>

            {(lastOrder as { invoiceNumber?: string }).invoiceNumber && user && (
              <div className="pt-6 border-t border-white/10">
                <InvoiceActions
                  orderId={lastOrder.id}
                  invoiceNumber={(lastOrder as { invoiceNumber: string }).invoiceNumber}
                  invoiceStatus={(lastOrder as { invoiceStatus?: string }).invoiceStatus}
                  getToken={() => user.getIdToken()}
                  variant="dark"
                />
              </div>
            )}
            {!(lastOrder as { invoiceNumber?: string }).invoiceNumber && lastOrder.status !== "CANCELLED" && (
              <p className="text-xs text-white/40 text-center pt-4">{t("invoice.pending")}</p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 italic text-white/20 font-light">
            Sie haben noch keine Bestellungen getätigt.
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-10 space-y-6">
          <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059]">{t("account.addresses.title")}</h3>
          <p className="text-sm font-light text-white/60 leading-relaxed">{t("account.addresses.empty")}</p>
          <Link to="/account/addresses" className="text-[10px] tracking-widest uppercase font-bold text-[#c5a059] border-b border-[#c5a059]/30 pb-1 hover:border-[#c5a059] transition-colors">
            {t("account.addresses.add")}
          </Link>
        </section>

        <NewsletterSection />
      </div>
    </div>
  );
}

function ProfileView() {
  const { user } = useAuth();
  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-10 space-y-10">
      <h3 className="text-sm tracking-[0.3em] uppercase font-bold text-[#c5a059] border-b border-white/10 pb-4">Mein Profil</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-2">
          <label className="text-[10px] tracking-widest uppercase text-white/20 font-bold">E-Mail Adresse</label>
          <p className="text-lg font-light">{user?.email}</p>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] tracking-widest uppercase text-white/20 font-bold">Benutzername</label>
          <p className="text-lg font-light">{user?.email?.split('@')[0]}</p>
        </div>
      </div>
      <button className="bg-white/5 border border-white/10 px-8 py-4 rounded-full text-[10px] tracking-widest uppercase font-bold hover:bg-white/10 transition-colors">
        Profil bearbeiten
      </button>
    </section>
  );
}

function CertificatesView() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<
    {
      id: number;
      certificateNumber: string;
      status: string;
      issuedAt: string | null;
      productName: string;
      brand: string;
      model: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) =>
      fetch("/api/account/certificates", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then(setCerts)
        .catch(() => setCerts([]))
        .finally(() => setLoading(false))
    );
  }, [user]);

  const statusLabel: Record<string, string> = {
    ACTIVE: "Gültig",
    CANCELLED: "Storniert",
    REPLACED: "Ersetzt",
  };

  if (loading) {
    return (
      <div className="p-20 text-center text-white/20 italic animate-pulse">Zertifikate werden geladen…</div>
    );
  }

  if (certs.length === 0) {
    return (
      <section className="p-10 bg-white/5 rounded-2xl border border-white/10">
        <h3 className="text-sm uppercase tracking-widest text-[#c5a059]">Meine Zertifikate</h3>
        <p className="mt-8 text-white/30 italic">Noch keine Echtheitszertifikate vorhanden.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h3 className="text-sm uppercase tracking-widest text-[#c5a059]">Meine Zertifikate</h3>
      <div className="space-y-4">
        {certs.map((c) => (
          <div
            key={c.id}
            className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <p className="font-serif text-lg">{c.productName || `${c.brand} ${c.model}`}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                  {c.certificateNumber}
                </p>
              </div>
              <span
                className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full self-start ${
                  c.status === "ACTIVE"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {statusLabel[c.status] || c.status}
              </span>
            </div>
            {c.issuedAt && (
              <p className="text-xs text-white/40">
                Ausgestellt:{" "}
                {new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(c.issuedAt))}
              </p>
            )}
            <CertificateActions
              certificateId={c.id}
              certificateNumber={c.certificateNumber}
              getToken={() => user!.getIdToken()}
              variant="dark"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SecurityView() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      const { auth } = await import("../lib/firebase.ts");
      await sendPasswordResetEmail(auth, user.email);
      setSent(true);
    } catch (err) {
      console.error("Password reset failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-10 bg-white/5 rounded-2xl border border-white/10 space-y-8">
      <h3 className="text-sm uppercase tracking-widest text-[#c5a059]">Sicherheit</h3>
      <p className="text-white/50 text-sm font-light leading-relaxed">
        Da Sie sich mit Google anmelden, können Sie Ihr Passwort über Google verwalten. Alternativ senden wir Ihnen einen Link zum Zurücksetzen.
      </p>
      {sent ? (
        <p className="text-green-400 text-sm">E-Mail zum Zurücksetzen wurde gesendet an {user?.email}</p>
      ) : (
        <button onClick={handleReset} disabled={loading}
          className="bg-[#c5a059] text-black px-8 py-4 rounded-full text-[10px] tracking-widest uppercase font-bold hover:bg-[#d4af37] transition-all disabled:opacity-50">
          {loading ? "Wird gesendet..." : "Passwort zurücksetzen"}
        </button>
      )}
    </section>
  );
}

export default function Account() {
  const { user, logout, role } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const location = useLocation();
  const isAdmin = useIsAdmin();

  if (!user) return <Navigate to="/" />;

  const menuItems = [
    { icon: User, label: "Profil", path: "/account/profile" },
    { icon: Package, label: "Bestellungen", path: "/account/orders" },
    { icon: Award, label: "Meine Zertifikate", path: "/account/certificates" },
    { icon: MapPin, label: "Adressen", path: "/account/addresses" },
    { icon: Heart, label: "Wunschliste", path: "/wishlist", badge: wishlistItems.length },
    { icon: Shield, label: "Sicherheit", path: "/account/security" },
  ];

  return (
    <div className="min-h-screen pt-40 pb-20 px-10">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <h4 className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">Kundenkonto</h4>
            <h1 className="text-4xl md:text-5xl font-serif italic tracking-wider">Willkommen, {user.email?.split('@')[0]}</h1>
            <div className="flex items-center gap-4 text-white/40 text-[10px] tracking-widest uppercase">
              <span>Status: <span className="text-[#c5a059] font-bold">{role}</span></span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span>Mitglied seit {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-bold text-red-400/60 hover:text-red-400 transition-colors border border-red-400/20 px-6 py-3 rounded-full"
          >
            <LogOut size={14} /> Abmelden
          </button>
        </header>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center justify-between p-8 bg-gradient-to-r from-[#c5a059]/20 to-[#c5a059]/5 border border-[#c5a059]/40 rounded-2xl hover:border-[#c5a059] transition-all group"
          >
            <div className="space-y-1">
              <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-[#c5a059]">Administration</p>
              <p className="text-xl font-serif italic">Zum Admin-Portal</p>
              <p className="text-white/40 text-xs">Produkte, Bestellungen, Einstellungen verwalten</p>
            </div>
            <ChevronRight size={24} className="text-[#c5a059] group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-4 space-y-2">
            <Link 
              to="/account"
              className={`flex items-center justify-between p-6 rounded-xl transition-all group ${location.pathname === "/account" ? "bg-[#c5a059]/10 border border-[#c5a059]/20" : "bg-white/5 border border-white/5 hover:border-[#c5a059]/30"}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${location.pathname === "/account" ? "bg-[#c5a059] text-black" : "bg-black text-[#c5a059]"}`}>
                  <User size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold">Dashboard</span>
              </div>
              <ChevronRight size={14} className="text-white/20 group-hover:text-[#c5a059] transition-colors" />
            </Link>

            {menuItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center justify-between p-6 rounded-xl transition-all group ${location.pathname === item.path ? "bg-[#c5a059]/10 border border-[#c5a059]/20" : "bg-white/5 border border-white/5 hover:border-[#c5a059]/30"}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${location.pathname === item.path ? "bg-[#c5a059] text-black" : "bg-black text-[#c5a059]"}`}>
                    <item.icon size={18} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] tracking-[0.2em] uppercase font-bold">{item.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-[#c5a059] text-black text-[9px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                  )}
                  <ChevronRight size={14} className="text-white/20 group-hover:text-[#c5a059] transition-colors" />
                </div>
              </Link>
            ))}
            
            {(isAdmin) && (
              <Link 
                to="/admin"
                className="flex items-center justify-between p-6 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-xl hover:bg-[#c5a059]/20 transition-all group mt-8"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center text-black">
                    <Settings size={18} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#c5a059]">Admin Dashboard</span>
                </div>
                <ChevronRight size={14} className="text-[#c5a059]" />
              </Link>
            )}
          </aside>

          {/* Content Area */}
          <main className="lg:col-span-8">
            <Routes>
              <Route index element={<AccountDashboard />} />
              <Route path="profile" element={<ProfileView />} />
              <Route path="orders" element={<OrdersView />} />
              <Route path="certificates" element={<CertificatesView />} />
              <Route path="addresses" element={<AddressesManager />} />
              <Route path="security" element={<SecurityView />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
