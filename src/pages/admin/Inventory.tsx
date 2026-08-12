import { useState, useEffect } from "react";
import { Warehouse } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  brand?: string;
  status: string;
  stock: number;
  price: string;
}

export default function Inventory() {
  const [stats, setStats] = useState({ totalStock: 0, available: 0, reserved: 0 });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/inventory", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setItems(data.items);
        }
      } catch (err) {
        console.error("Failed to load inventory", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 text-gray-400">
        <Warehouse size={32} />
        <div>
          <h3 className="text-xl font-serif text-gray-900">Bestand</h3>
          <p className="text-sm">Live-Bestandsübersicht aus der Produktdatenbank.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-[10px] tracking-widest uppercase font-bold text-gray-400">Gesamtbestand</p>
          <p className="text-2xl font-serif mt-2 text-gray-900">{stats.totalStock}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-[10px] tracking-widest uppercase font-bold text-gray-400">Verfügbar (Active)</p>
          <p className="text-2xl font-serif mt-2 text-gray-900">{stats.available}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-[10px] tracking-widest uppercase font-bold text-gray-400">Reserviert</p>
          <p className="text-2xl font-serif mt-2 text-orange-500">{stats.reserved}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 italic text-sm text-center py-12">Bestandsliste wird geladen...</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm italic">
          Keine Produkte im Bestand.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] tracking-widest uppercase text-gray-400">
                <th className="px-6 py-4">Produkt</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Marke</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Bestand</th>
                <th className="px-6 py-4">Preis</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-t border-gray-50 ${item.stock <= 1 && item.status === "ACTIVE" ? "bg-orange-50/50" : ""}`}>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.sku || "—"}</td>
                  <td className="px-6 py-4 text-gray-500">{item.brand || "—"}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] tracking-widest uppercase font-bold text-gray-400">{item.status}</span>
                  </td>
                  <td className={`px-6 py-4 font-serif ${item.stock <= 1 ? "text-orange-600 font-bold" : ""}`}>{item.stock}</td>
                  <td className="px-6 py-4">{parseFloat(item.price).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
