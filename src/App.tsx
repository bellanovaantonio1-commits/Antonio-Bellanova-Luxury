import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar.tsx";
import Footer from "./components/layout/Footer.tsx";
import CookieBanner from "./components/common/CookieBanner.tsx";
import ScrollToTop from "./components/common/ScrollToTop.tsx";
import WhatsAppButton from "./components/common/WhatsAppButton.tsx";
import MetaTags from "./components/common/MetaTags.tsx";
import DbStatusBanner from "./components/common/DbStatusBanner.tsx";
import Home from "./pages/Home.tsx";
import Shop from "./pages/Shop.tsx";
import ProductDetails from "./pages/ProductDetails.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import Sell from "./pages/Sell.tsx";
import Contact from "./pages/Contact.tsx";
import BookAppointment from "./pages/BookAppointment.tsx";
import InfoPage, { ShippingContent, ReturnsContent } from "./pages/InfoPage.tsx";
import { FAQContent, PrivacyContent, TermsContent, LegalContent } from "./content/legal.tsx";
import { useAuth } from "./contexts/AuthContext.tsx";

import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";

import Account from "./pages/Account.tsx";

import Wishlist from "./pages/Wishlist.tsx";

import BrandPage from "./pages/BrandPage.tsx";

import Cart from "./pages/Cart.tsx";

function AuthErrorBanner() {
  const { authError, clearAuthError } = useAuth();
  if (!authError) return null;
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] max-w-lg w-[calc(100%-2rem)] bg-red-950/90 border border-red-500/30 text-red-100 px-6 py-4 rounded-xl text-sm shadow-2xl">
      <p>{authError}</p>
      <button onClick={clearAuthError} className="mt-2 text-[10px] uppercase tracking-widest text-red-300 hover:text-white">Schließen</button>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <div
      className={
        isAdmin
          ? "min-h-screen bg-gray-50 text-gray-900 selection:bg-[#c5a059] selection:text-black"
          : "min-h-screen bg-[#050505] text-[#F4F4F4] selection:bg-[#c5a059] selection:text-black"
      }
    >
      <MetaTags />
      <DbStatusBanner />
      {!isAdmin && <Navbar />}
      <AuthErrorBanner />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/brands/:slug" element={<BrandPage />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/termin" element={<BookAppointment />} />
          <Route 
            path="/shipping" 
            element={<InfoPage title="Versand & Lieferung" subtitle="Logistik" content={<ShippingContent />} />} 
          />
          <Route 
            path="/returns" 
            element={<InfoPage title="Widerruf & Retouren" subtitle="Service" content={<ReturnsContent />} />} 
          />
          
          <Route path="/faq" element={<InfoPage title="Häufige Fragen" subtitle="Support" content={<FAQContent />} />} />
          <Route path="/legal" element={<InfoPage title="Impressum" subtitle="Rechtliches" content={<LegalContent />} />} />
          <Route path="/privacy" element={<InfoPage title="Datenschutz" subtitle="Rechtliches" content={<PrivacyContent />} />} />
          <Route path="/terms" element={<InfoPage title="AGB" subtitle="Rechtliches" content={<TermsContent />} />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route 
            path="/account/*" 
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <CookieBanner />}
      <ScrollToTop />
      {!isAdmin && <WhatsAppButton />}
    </div>
  );
}
