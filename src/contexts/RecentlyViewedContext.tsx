import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";

export type RecentlyViewedItem = {
  slug: string;
  title: string;
  image: string;
  price: string;
  brand?: string;
};

const STORAGE_KEY = "recently_viewed_v1";
const MAX_ITEMS = 8;

const RecentlyViewedContext = createContext<{
  items: RecentlyViewedItem[];
  addItem: (item: RecentlyViewedItem) => void;
}>({ items: [], addItem: () => {} });

function loadItems(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => loadItems());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: RecentlyViewedItem) => {
    if (!item.slug) return;
    setItems((prev) => {
      const filtered = prev.filter((p) => p.slug !== item.slug);
      return [item, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ items, addItem }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}
