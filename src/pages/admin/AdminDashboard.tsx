import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
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
  ExternalLink
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
import NewProduct from "./NewProduct.tsx";
import { auth } from "../../lib/firebase.ts";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadBadges() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/badges", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setBadges(await res.json());
      } catch { /* ignore */ }
    }
    loadBadges();
    const interval = setInterval(loadBadges, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: "Übersicht", icon: <LayoutDashboard size={18} />, path: "/admin", badge: 0 },
    { label: "Anleitung", icon: <HelpCircle size={18} />, path: "/admin/help", badge: 0 },
    { label: "Produkte", icon: <Package size={18} />, path: "/admin/products", badge: 0 },
    { label: "Neues Produkt", icon: <PlusCircle size={18} />, path: "/admin/products/new", badge: 0 },
    { label: "AI Import", icon: <BrainCircuit size={18} />, path: "/admin/ai-import", badge: 0 },
    { label: "Bestellungen", icon: <ShoppingCart size={18} />, path: "/admin/orders", badge: badges.orders },
    { label: "Anfragen", icon: <MessageSquare size={18} />, path: "/admin/inquiries", badge: badges.inquiries },
    { label: "Bestand", icon: <Warehouse size={18} />, path: "/admin/inventory", badge: badges.lowStock },
    { label: "Marken", icon: <Tag size={18} />, path: "/admin/brands", badge: 0 },
    { label: "Kunden (CRM)", icon: <Users size={18} />, path: "/admin/crm", badge: 0 },
    { label: "Einstellungen", icon: <SettingsIcon size={18} />, path: "/admin/settings", badge: 0 },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-[#0A0A0A] text-white flex flex-col fixed inset-y-0 z-50">
        <div className="p-8 border-b border-white/10">
          <Link to="/" className="flex flex-col items-start">
            <span className="text-sm font-serif tracking-[0.2em] leading-tight">ANTONIO BELLANOVA</span>
            <span className="text-[7px] tracking-[0.4em] text-[#D4AF37] mt-1 uppercase">Luxury Admin</span>
          </Link>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 text-[11px] tracking-widest uppercase transition-all rounded-lg ${
                (item.path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.path))
                  ? "bg-[#D4AF37] text-white font-bold shadow-lg shadow-[#D4AF37]/20"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-white/10">
          <button 
            onClick={logout}
            className="flex items-center gap-3 text-white/50 hover:text-red-400 text-[11px] tracking-widest uppercase transition-colors group"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-12">
        <header className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-serif tracking-tight text-gray-900">
            {navItems.find(n => location.pathname === n.path || (n.path !== "/admin" && location.pathname.startsWith(n.path)))?.label || "Admin"}
          </h2>
          <Link to="/shop" className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-gray-400 hover:text-[#D4AF37] transition-colors">
            <ExternalLink size={14} /> Shop ansehen
          </Link>
        </header>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[600px]">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/help" element={<AdminHelp />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<NewProduct />} />
            <Route path="/ai-import" element={<AIImport />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/inquiries" element={<Inquiries />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/crm" element={<Customers />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
