import { useState, useEffect } from "react";
import { ShoppingCart, Package, CreditCard, Download, XCircle, Truck, CheckCircle2, FileText, Shield } from "lucide-react";
import { auth } from "../../lib/firebase.ts";
import OrderCertificateModal from "../../components/admin/OrderCertificateModal.tsx";

interface AdminOrder {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  total: string;
  customerEmail?: string;
  itemCount: number;
  createdAt: string;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paidAt?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Offen",
  PROCESSING: "In Bearbeitung",
  SHIPPED: "Versendet",
  DELIVERED: "Geliefert",
  CANCELLED: "Storniert",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  PAID: "Bezahlt",
  FAILED: "Fehlgeschlagen",
  REFUNDED: "Erstattet",
  PARTIALLY_REFUNDED: "Teilerstattet",
  CANCELLED: "Storniert",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Stripe",
  BANK_TRANSFER: "Überweisung",
};

export default function Orders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [shipModal, setShipModal] = useState<AdminOrder | null>(null);
  const [certModal, setCertModal] = useState<AdminOrder | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("DHL");

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

  const updateOrder = async (id: number, updates: Record<string, string | undefined>) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Aktualisierung fehlgeschlagen.");
      return false;
    }
    await loadOrders();
    return true;
  };

  const openShipModal = (order: AdminOrder) => {
    setShipModal(order);
    setTrackingNumber(order.trackingNumber || "");
    setCarrier(order.carrier || "DHL");
  };

  const confirmShip = async () => {
    if (!shipModal) return;
    const ok = await updateOrder(shipModal.id, {
      status: "SHIPPED",
      trackingNumber: trackingNumber.trim(),
      carrier: carrier.trim(),
    });
    if (ok) setShipModal(null);
  };

  const cancelOrder = async (order: AdminOrder) => {
    if (order.status === "CANCELLED") return;
    const msg =
      order.status === "SHIPPED" || order.status === "DELIVERED"
        ? `Bestellung ${order.orderNumber} ist bereits ${STATUS_LABELS[order.status] || order.status}. Trotzdem stornieren?`
        : `Bestellung ${order.orderNumber} wirklich stornieren?\n\nDer Lagerbestand wird wieder gutgeschrieben.`;
    if (!confirm(msg)) return;

    setCancellingId(order.id);
    try {
      await updateOrder(order.id, {
        status: "CANCELLED",
        paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : "CANCELLED",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  const paymentColors: Record<string, string> = {
    PENDING: "bg-orange-100 text-orange-800",
    PAID: "bg-green-100 text-green-800",
    REFUNDED: "bg-gray-100 text-gray-700",
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

  const generateInvoice = async (orderId: number) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/admin/orders/${orderId}/invoice`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Rechnung konnte nicht erstellt werden.");
      return;
    }
    await loadOrders();
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

      {certModal && (
        <OrderCertificateModal
          orderId={certModal.id}
          orderNumber={certModal.orderNumber}
          onClose={() => setCertModal(null)}
        />
      )}

      {shipModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h4 className="text-lg font-serif text-gray-900">Versand — {shipModal.orderNumber}</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tracking-Nummer</label>
                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-4 py-3 text-sm" placeholder="z.B. JJD0001234567890" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Carrier</label>
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-4 py-3 text-sm">
                  <option value="DHL">DHL</option>
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DPD">DPD</option>
                  <option value="Other">Sonstige</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShipModal(null)} className="px-4 py-2 text-sm text-gray-500">Abbrechen</button>
              <button onClick={confirmShip} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold">Als versendet markieren</button>
            </div>
          </div>
        </div>
      )}

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
                <th className="pb-4 pr-4">Art</th>
                <th className="pb-4 pr-4">Tracking</th>
                <th className="pb-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const isCancelled = order.status === "CANCELLED";
                return (
                  <tr key={order.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isCancelled ? "opacity-60" : ""}`}>
                    <td className="py-4 pr-4 font-mono text-xs">{order.orderNumber}</td>
                    <td className="py-4 pr-4">{order.customerEmail || "—"}</td>
                    <td className="py-4 pr-4 font-serif">{parseFloat(order.total).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                    <td className="py-4 pr-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${paymentColors[order.paymentStatus] || "bg-orange-100 text-orange-800"}`}>
                        {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
                      </span>
                      {order.paymentMethod === "STRIPE" && order.stripePaymentIntentId && (
                        <p className="text-[9px] font-mono text-gray-400 mt-1 max-w-[140px] truncate" title={order.stripePaymentIntentId}>
                          {order.stripePaymentIntentId}
                        </p>
                      )}
                      {order.paidAt && (
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          {new Date(order.paidAt).toLocaleString("de-DE")}
                        </p>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-xs text-gray-600">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod || "BANK_TRANSFER"] || order.paymentMethod}
                      {order.stripeCheckoutSessionId && (
                        <p className="text-[9px] font-mono text-gray-400 mt-1 max-w-[120px] truncate" title={order.stripeCheckoutSessionId}>
                          {order.stripeCheckoutSessionId}
                        </p>
                      )}
                    </td>
                    <td className="py-4 pr-4 font-mono text-[10px] text-gray-500">
                      {order.trackingNumber ? `${order.carrier || ""} ${order.trackingNumber}`.trim() : "—"}
                    </td>
                    <td className="py-4">
                      {isCancelled ? (
                        <span className="text-[10px] uppercase tracking-widest text-gray-400">Storniert</span>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          {order.status === "PENDING" && (
                            <button
                              onClick={() => updateOrder(order.id, { status: "PROCESSING" })}
                              title="In Bearbeitung setzen"
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                            >
                              <Package size={14} />
                            </button>
                          )}
                          {order.status === "PROCESSING" && (
                            <button
                              onClick={() => openShipModal(order)}
                              title="Als versendet markieren"
                              className="p-2 hover:bg-purple-50 rounded-lg text-purple-600"
                            >
                              <Truck size={14} />
                            </button>
                          )}
                          {order.status === "SHIPPED" && (
                            <button
                              onClick={() => updateOrder(order.id, { status: "DELIVERED" })}
                              title="Als geliefert markieren"
                              className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED" && (
                            <button
                              onClick={() => updateOrder(order.id, { paymentStatus: "PAID", status: order.status === "PENDING" ? "PROCESSING" : order.status })}
                              title="Als bezahlt markieren"
                              className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                            >
                              <CreditCard size={14} />
                            </button>
                          )}
                          {!order.invoiceNumber && !isCancelled && (
                            <button
                              onClick={() => generateInvoice(order.id)}
                              title="Rechnung ausstellen"
                              className="p-2 hover:bg-amber-50 rounded-lg text-amber-700"
                            >
                              <FileText size={14} />
                            </button>
                          )}
                          {order.invoiceNumber && (
                            <span className="text-[9px] font-mono text-gray-400 px-1" title={order.invoiceStatus === "CANCELLED" ? "Rechnung storniert" : order.invoiceNumber}>
                              {order.invoiceNumber}
                            </span>
                          )}
                          <button
                            onClick={() => setCertModal(order)}
                            title="Echtheitszertifikat"
                            className="p-2 hover:bg-amber-50 rounded-lg text-[#9a7b2e]"
                          >
                            <Shield size={14} />
                          </button>
                          <button
                            onClick={() => cancelOrder(order)}
                            disabled={cancellingId === order.id}
                            title="Bestellung stornieren"
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-40"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
