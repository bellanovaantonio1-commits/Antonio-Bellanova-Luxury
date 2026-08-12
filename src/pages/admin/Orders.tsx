import { useState, useEffect } from "react";
import { ShoppingCart, Package, CreditCard, Download } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface AdminOrder {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  customerEmail?: string;
  itemCount: number;
  createdAt: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const updateOrder = async (id: number, updates: { status?: string; paymentStatus?: string }) => {
    const token = await auth.currentUser?.getIdToken();
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    loadOrders();
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  const exportCsv = async () => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/admin/orders/export", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bestellungen.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-gray-400">
          <ShoppingCart size={32} />
          <div>
            <h3 className="text-xl font-serif text-gray-900">Bestellungen</h3>
            <p className="text-sm">Verwalten Sie Kundenbestellungen und Zahlungsstatus.</p>
          </div>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl text-[10px] tracking-widest uppercase font-bold hover:bg-[#D4AF37] transition-colors">
          <Download size={14} /> CSV Export
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 italic text-sm">Bestellungen werden geladen...</p>
      ) : orders.length === 0 ? (
        <div className="border-2 border-dashed border-gray-100 rounded-xl p-12 text-center">
          <p className="text-gray-500">Noch keine Bestellungen vorhanden.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[10px] tracking-widest uppercase text-gray-400">
                <th className="pb-4 pr-4">Bestellnr.</th>
                <th className="pb-4 pr-4">Kunde</th>
                <th className="pb-4 pr-4">Betrag</th>
                <th className="pb-4 pr-4">Status</th>
                <th className="pb-4 pr-4">Zahlung</th>
                <th className="pb-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-4 pr-4 font-mono text-xs">{order.orderNumber}</td>
                  <td className="py-4 pr-4">{order.customerEmail || "—"}</td>
                  <td className="py-4 pr-4 font-serif">{parseFloat(order.total).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${order.paymentStatus === "PAID" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button onClick={() => updateOrder(order.id, { status: "PROCESSING" })} title="In Bearbeitung" className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"><Package size={14} /></button>
                      <button onClick={() => updateOrder(order.id, { paymentStatus: "PAID", status: "PROCESSING" })} title="Als bezahlt markieren" className="p-2 hover:bg-green-50 rounded-lg text-green-600"><CreditCard size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
