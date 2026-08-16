import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Settings as SettingsIcon,
  LogOut,
  BrainCircuit,
  Warehouse,
  MessageSquare,
  Tag,
  HelpCircle,
  PlusCircle,
  ExternalLink,
  FileText,
  CircleDollarSign,
  Shield,
  Scale,
  Menu,
  X,
} from "lucide-react";
import Inquiries from "./Inquiries.tsx";
import Brands from "./Brands.tsx";
import AdminHelp from "./AdminHelp.tsx";
import { useAuth } from "../../contexts/AuthContext.tsx";
import Overview from "./Overview.tsx";
import Products from "./Products.tsx";
import AIImport from "./AIImport.tsx";
import Orders from "./Orders.tsx";
import Inventory from "./Inventory.tsx";
import Customers from "./Customers.tsx";
import Settings from "./Settings.tsx";
import PricingPayments from "./PricingPayments.tsx";
import Certificates from "./Certificates.tsx";
import LegalCompliance from "./LegalCompliance.tsx";
import Invoices from "./Invoices.tsx";
import NewProduct from "./NewProduct.tsx";
import CuratedCollectionsAdmin from "./CuratedCollectionsAdmin.tsx";
import { auth } from "../../lib/firebase.ts";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadBadges() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/badges", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setBadges(await res.json());
      } catch {
        /* ignore */
      }
    }
    loadBadges();
    const interval = setInterval(loadBadges, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: "Übersicht", icon: <LayoutDashboard size={18} />, path: "/admin", badge: 0 },
    { label: "Anleitung", icon: <HelpCircle size={18} />, path: "/admin/help", badge: 0 },
    { label: "Produkte", icon: <Package size={18} />, path: "/admin/products", badge: 0 },
    { label: "Neues Produkt", icon: <PlusCircle size={18} />, path: "/admin/products/new", badge: 0 },
    { label: "AI Import", icon: <BrainCircuit size={18} />, path: "/admin/ai-import", badge: 0 },
    { label: "Bestellungen", icon: <ShoppingCart size={18} />, path: "/admin/orders", badge: badges.orders },
    { label: "Rechnungen", icon: <FileText size={18} />, path: "/admin/invoices", badge: 0 },
    { label: "Echtheitszertifikate", icon: <Shield size={18} />, path: "/admin/certificates", badge: 0 },
    { label: "Rechtliches & Unternehmen", icon: <Scale size={18} />, path: "/admin/legal", badge: 0 },
    { label: "Anfragen", icon: <MessageSquare size={18} />, path: "/admin/inquiries", badge: badges.inquiries },
    { label: "Bestand", icon: <Warehouse size={18} />, path: "/admin/inventory", badge: badges.lowStock },
    { label: "Marken", icon: <Tag size={18} />, path: "/admin/brands", badge: 0 },
    { label: "Kunden (CRM)", icon: <Users size={18} />, path: "/admin/crm", badge: 0 },
    { label: "Preise & Zahlungen", icon: <CircleDollarSign size={18} />, path: "/admin/pricing", badge: 0 },
    { label: "Einstellungen", icon: <SettingsIcon size={18} />, path: "/admin/settings", badge: 0 },
  ];

  const activeLabel =
    navItems.find(
      (n) => location.pathname === n.path || (n.path !== "/admin" && location.pathname.startsWith(n.path))
    )?.label || "Admin";

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  const sidebar = (
    <>
      <div className="shrink-0 p-6 lg:p-8 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex flex-col items-start">
          <span className="text-sm font-serif tracking-[0.2em] leading-tight">ANTONIO BELLANOVA</span>
          <span className="text-[7px] tracking-[0.4em] text-[#D4AF37] mt-1 uppercase">Luxury Admin</span>
        </Link>
        <button
          type="button"
          className="lg:hidden text-white/60 hover:text-white touch-target"
          onClick={() => setMenuOpen(false)}
          aria-label="Menü schließen"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-6 lg:py-8 px-3 lg:px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 text-[11px] tracking-widest uppercase transition-all rounded-lg ${
              isActive(item.path)
                ? "bg-[#D4AF37] text-white font-bold shadow-lg shadow-[#D4AF37]/20"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="shrink-0 p-6 lg:p-8 border-t border-white/10">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 text-white/50 hover:text-red-400 text-[11px] tracking-widest uppercase transition-colors group min-h-11"
        >
          <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          Abmelden
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden lg:flex w-64 bg-[#0A0A0A] text-white flex-col fixed inset-y-0 z-40 min-h-0">
        {sidebar}
      </aside>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-[min(300px,88vw)] bg-[#0A0A0A] text-white flex flex-col lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col min-w-0">
        <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur border-b border-gray-200 px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden touch-target text-gray-700"
              onClick={() => setMenuOpen(true)}
              aria-label="Admin-Menü"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif tracking-tight text-gray-900 truncate">
              {activeLabel}
            </h2>
          </div>
          <Link
            to="/shop"
            className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-gray-400 hover:text-[#D4AF37] transition-colors shrink-0"
          >
            <ExternalLink size={14} /> <span className="hidden sm:inline">Shop ansehen</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-12">
          <div className="admin-panel bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100 min-h-[400px] text-gray-900 [&_input:not([type=checkbox]):not([type=radio])]:text-gray-900 [&_input]:placeholder:text-gray-400 [&_textarea]:text-gray-900 [&_textarea]:placeholder:text-gray-400 [&_select]:text-gray-900 [&_option]:text-gray-900 [&_h2]:text-gray-900 [&_h3]:text-gray-900 [&_h4]:text-gray-900">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="help" element={<AdminHelp />} />
              <Route path="products" element={<Products />} />
              <Route path="collections" element={<CuratedCollectionsAdmin />} />
              <Route path="products/new" element={<NewProduct />} />
              <Route path="ai-import" element={<AIImport />} />
              <Route path="orders" element={<Orders />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="certificates" element={<Certificates />} />
              <Route path="legal" element={<LegalCompliance />} />
              <Route path="inquiries" element={<Inquiries />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="brands" element={<Brands />} />
              <Route path="crm" element={<Customers />} />
              <Route path="pricing" element={<PricingPayments />} />
              <Route path="settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
