import { Link, Routes, Route, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings as SettingsIcon, 
  PlusCircle, 
  LogOut,
  BrainCircuit,
  Warehouse
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.tsx";
import Overview from "./Overview.tsx";
import Products from "./Products.tsx";
import AIImport from "./AIImport.tsx";
import Orders from "./Orders.tsx";
import Inventory from "./Inventory.tsx";
import Customers from "./Customers.tsx";
import Settings from "./Settings.tsx";
import NewProduct from "./NewProduct.tsx";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: "Übersicht", icon: <LayoutDashboard size={18} />, path: "/admin" },
    { label: "Produkte", icon: <Package size={18} />, path: "/admin/products" },
    { label: "AI Import", icon: <BrainCircuit size={18} />, path: "/admin/ai-import" },
    { label: "Bestellungen", icon: <ShoppingCart size={18} />, path: "/admin/orders" },
    { label: "Bestand", icon: <Warehouse size={18} />, path: "/admin/inventory" },
    { label: "Kunden (CRM)", icon: <Users size={18} />, path: "/admin/crm" },
    { label: "Einstellungen", icon: <SettingsIcon size={18} />, path: "/admin/settings" },
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
              {item.label}
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
            {navItems.find(n => n.path === (location.pathname === "/admin" ? "/admin" : location.pathname))?.label || "Produkte"}
          </h2>
        </header>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[600px]">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<NewProduct />} />
            <Route path="/ai-import" element={<AIImport />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/crm" element={<Customers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<div className="flex items-center justify-center h-[400px] text-gray-400 italic">In Kürze verfügbar...</div>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
