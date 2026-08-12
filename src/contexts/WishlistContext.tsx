import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.tsx";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  slug: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  toggleItem: (item: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
  syncFromServer: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem("wishlist");
    return saved ? JSON.parse(saved) : [];
  });

  const syncFromServer = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/wishlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setItems(data.map((p: any) => ({
            id: p.id.toString(),
            name: p.name,
            price: p.price,
            image: p.image || "",
            slug: p.slug,
          })));
        }
      }
    } catch (err) {
      console.warn("Wishlist sync failed", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      syncFromServer();
    }
  }, [user, syncFromServer]);

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(items));
  }, [items]);

  const toggleItem = async (item: WishlistItem) => {
    const existing = items.find(i => i.id === item.id);

    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: parseInt(item.id) }),
        });
      } catch (err) {
        console.warn("Wishlist API toggle failed", err);
      }
    }

    setItems(prev => {
      if (existing) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  };

  const isInWishlist = (id: string) => items.some(i => i.id === id);

  return (
    <WishlistContext.Provider value={{ items, toggleItem, isInWishlist, syncFromServer }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}
