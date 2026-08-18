import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Utensils, 
  Image as ImageIcon, 
  Settings as SettingsIcon, 
  FileText, 
  LogOut,
  ChevronRight,
  Home as HomeIcon,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  X,
  Upload
} from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import AdminRoute from '../../components/Admin/AdminRoute';
import { cn } from '../../lib/utils';
import SettingsEditor from '../../components/Admin/SettingsEditor';
import MenuEditor from '../../components/Admin/MenuEditor';
import CategoryEditor from '../../components/Admin/CategoryEditor';
import BulkImport from '../../components/Admin/BulkImport';
import SearchAnalytics from '../../components/Admin/SearchAnalytics';
import GalleryEditor from '../../components/Admin/GalleryEditor';
import LegalEditor from '../../components/Admin/LegalEditor';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { id: 'overview', label: 'Übersicht', icon: <LayoutDashboard size={20} />, path: '/admin/dashboard' },
    { id: 'settings', label: 'Allgemein', icon: <SettingsIcon size={20} />, path: '/admin/settings' },
    { id: 'menu', label: 'Speisekarte', icon: <Utensils size={20} />, path: '/admin/menu' },
    { id: 'categories', label: 'Kategorien', icon: <Plus size={20} />, path: '/admin/categories' },
    { id: 'analytics', label: 'Analyse', icon: <TrendingUp size={20} />, path: '/admin/analytics' },
    { id: 'bulk-import', label: 'Bulk Import', icon: <Upload size={20} />, path: '/admin/bulk-import' },
    { id: 'gallery', label: 'Galerie', icon: <ImageIcon size={20} />, path: '/admin/gallery' },
    { id: 'legal', label: 'Rechtliches', icon: <FileText size={20} />, path: '/admin/legal' },
  ];

  return (
    <AdminRoute>
      <div className="min-h-[calc(100vh-80px)] bg-neutral-50 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-neutral-200 p-6 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900">Admin Panel</h2>
            <Link to="/" className="text-neutral-400 hover:text-emerald-600">
              <HomeIcon size={20} />
            </Link>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  location.pathname === item.path 
                    ? "bg-emerald-50 text-emerald-600 shadow-sm" 
                    : "text-neutral-500 hover:bg-neutral-100"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {location.pathname === item.path && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all w-full mt-auto"
          >
            <LogOut size={20} />
            <span>Abmelden</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-grow p-6 md:p-10">
          <Routes>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/settings" element={<SettingsEditor />} />
            <Route path="/menu" element={<MenuEditor />} />
            <Route path="/categories" element={<CategoryEditor />} />
            <Route path="/analytics" element={<SearchAnalytics />} />
            <Route path="/bulk-import" element={<BulkImport />} />
            <Route path="/gallery" element={<GalleryEditor />} />
            <Route path="/legal" element={<LegalEditor />} />
            <Route path="/" element={<Overview />} />
          </Routes>
        </main>
      </div>
    </AdminRoute>
  );
};

const Overview: React.FC = () => (
  <div className="space-y-8">
    <header>
      <h1 className="text-3xl font-serif font-bold text-neutral-900">Willkommen zurück!</h1>
      <p className="text-neutral-500">Verwalten Sie hier alle Inhalte Ihres Eiscafés.</p>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col items-center text-center">
        <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl mb-6">
          <Utensils size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2">Speisekarte</h3>
        <p className="text-neutral-500 text-sm mb-6">Aktualisieren Sie Ihre Eissorten, Preise und Kategorien.</p>
        <Link to="/admin/menu" className="mt-auto px-6 py-2 bg-neutral-900 text-white rounded-full text-sm font-bold hover:bg-emerald-600 transition-colors">
          Bearbeiten
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col items-center text-center">
        <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl mb-6">
          <ImageIcon size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2">Galerie</h3>
        <p className="text-neutral-500 text-sm mb-6">Laden Sie neue Fotos von Ihren Kreationen hoch.</p>
        <Link to="/admin/gallery" className="mt-auto px-6 py-2 bg-neutral-900 text-white rounded-full text-sm font-bold hover:bg-rose-600 transition-colors">
          Bearbeiten
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col items-center text-center">
        <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl mb-6">
          <SettingsIcon size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2">Einstellungen</h3>
        <p className="text-neutral-500 text-sm mb-6">Ändern Sie Kontaktdaten, Öffnungszeiten und Design.</p>
        <Link to="/admin/settings" className="mt-auto px-6 py-2 bg-neutral-900 text-white rounded-full text-sm font-bold hover:bg-blue-600 transition-colors">
          Bearbeiten
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col items-center text-center">
        <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl mb-6">
          <TrendingUp size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2">Analyse</h3>
        <p className="text-neutral-500 text-sm mb-6">Sehen Sie, wonach Kunden suchen (fehlgeschlagene Suchen).</p>
        <Link to="/admin/analytics" className="mt-auto px-6 py-2 bg-neutral-900 text-white rounded-full text-sm font-bold hover:bg-brand-green transition-colors">
          Ansehen
        </Link>
      </div>
    </div>
  </div>
);

export default Dashboard;
