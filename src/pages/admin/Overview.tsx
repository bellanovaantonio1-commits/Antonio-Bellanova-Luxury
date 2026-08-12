import { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Package, ShoppingCart,
  ArrowUpRight, Calendar
} from "lucide-react";
import RevenueChart, { SalesTrendChart } from "../../components/admin/RevenueChart.tsx";
import { auth } from "../../lib/firebase.ts";

interface Stats {
  revenue: number;
  orders: number;
  customers: number;
  stock: number;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats>({ revenue: 0, orders: 0, customers: 0, stock: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentOrders(data.recentOrders);
          setLowStock(data.lowStock);
          setChartData(data.chartData?.length ? data.chartData : []);
        }
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: "Umsatz (Monat)", value: stats.revenue.toLocaleString("de-DE", { style: "currency", currency: "EUR" }), icon: <TrendingUp className="text-green-500" /> },
    { label: "Bestellungen", value: stats.orders.toString(), icon: <ShoppingCart className="text-blue-500" /> },
    { label: "Kunden", value: stats.customers.toString(), icon: <Users className="text-purple-500" /> },
    { label: "Lagerbestand", value: stats.stock.toString(), icon: <Package className="text-orange-500" /> },
  ];

  if (loading) return <p className="text-gray-400 italic text-sm">Dashboard wird geladen...</p>;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((stat, i) => (
          <div key={i} className="p-8 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white rounded-xl shadow-sm">{stat.icon}</div>
              <ArrowUpRight size={14} className="text-gray-300" />
            </div>
            <div>
              <p className="text-gray-500 text-[10px] tracking-widest uppercase font-bold">{stat.label}</p>
              <h3 className="text-3xl font-serif mt-1 text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-900">Umsatzentwicklung</h4>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
              <Calendar size={14} /> Letzte Monate
            </div>
          </div>
          <RevenueChart data={chartData} />
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-900">Verkaufsstatistik</h4>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
              <Calendar size={14} /> Letzte Monate
            </div>
          </div>
          <SalesTrendChart data={chartData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h4 className="text-[11px] tracking-[0.2em] uppercase font-bold mb-8 text-gray-900">Letzte Bestellungen</h4>
          {recentOrders.length === 0 ? (
            <p className="text-gray-400 italic text-sm">Noch keine Bestellungen.</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{order.orderNumber}</p>
                    <p className="text-[11px] text-gray-500">{order.customerEmail || "Unbekannt"}</p>
                  </div>
                  <span className="text-[11px] font-bold text-gray-900">
                    {parseFloat(order.total).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h4 className="text-[11px] tracking-[0.2em] uppercase font-bold mb-8 text-gray-900">Lager Warnungen</h4>
          {lowStock.length === 0 ? (
            <p className="text-gray-400 italic text-sm">Keine Warnungen — Bestand ausreichend.</p>
          ) : (
            <div className="space-y-4">
              {lowStock.map(item => (
                <div key={item.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded flex items-center justify-center">
                      <Package size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-900">{item.name}</p>
                      <p className="text-[11px] text-gray-500">Bestand: {item.stock} ({item.status})</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
