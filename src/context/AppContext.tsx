import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Settings, NavItem } from '../types';

interface AppContextType {
  settings: Settings | null;
  navItems: NavItem[];
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as Settings);
      }
    });

    const unsubNav = onSnapshot(doc(db, 'nav', 'main'), (doc) => {
      if (doc.exists()) {
        setNavItems(doc.data().items as NavItem[]);
      } else {
        // Default nav items
        setNavItems([
          { id: 'home', label: 'Startseite', path: '/', order: 0 },
          { id: 'menu', label: 'Speisekarte', path: '/menu', order: 1 },
          { id: 'about', label: 'Über uns', path: '/about', order: 2 },
          { id: 'gallery', label: 'Galerie', path: '/gallery', order: 3 },
          { id: 'contact', label: 'Kontakt', path: '/contact', order: 4 },
        ]);
      }
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubNav();
    };
  }, []);

  return (
    <AppContext.Provider value={{ settings, navItems, loading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
