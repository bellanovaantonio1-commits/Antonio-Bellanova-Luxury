import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { CartProvider } from './contexts/CartContext.tsx';
import { WishlistProvider } from './contexts/WishlistContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { ShopSettingsProvider } from './contexts/ShopSettingsContext.tsx';
import { RecentlyViewedProvider } from './contexts/RecentlyViewedContext.tsx';

import { CookieConsentProvider } from './contexts/CookieConsentContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <ShopSettingsProvider>
        <CookieConsentProvider>
        <RecentlyViewedProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <App />
            </Router>
          </WishlistProvider>
        </CartProvider>
        </RecentlyViewedProvider>
        </CookieConsentProvider>
        </ShopSettingsProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
