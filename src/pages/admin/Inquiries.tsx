import { useState, useEffect } from "react";
import { Mail, MessageSquare, CheckCircle, Clock, XCircle } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface Inquiry {
  id: number;
  type: string;
  status: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export default function Inquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "CONTACT" | "SELL">("ALL");

  const load = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/inquiries", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setInquiries(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    const token = await auth.currentUser?.getIdToken();
    await fetch(`/api/admin/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const filtered = inquiries.filter(i => filter === "ALL" || i.type === filter);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <MessageSquare size={32} className="text-gray-400" />
          <div>
            <h3 className="text-xl font-serif text-gray-900">Anfragen</h3>
            <p className="text-sm text-gray-500">Kontakt- und Ankaufanfragen von der Website</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(["ALL", "CONTACT", "SELL"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[10px] tracking-widest uppercase font-bold transition-all ${filter === f ? "bg-[#D4AF37] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {f === "ALL" ? "Alle" : f === "CONTACT" ? "Kontakt" : "Ankauf"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 italic text-sm">Wird geladen...</p>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-100 rounded-xl p-12 text-center text-gray-400">Keine Anfragen vorhanden.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(inq => (
            <div key={inq.id} className="border border-gray-100 rounded-xl p-6 hover:shadow-sm transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${inq.type === "SELL" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>{inq.type === "SELL" ? "Ankauf" : "Kontakt"}</span>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${inq.status === "NEW" ? "bg-yellow-100 text-yellow-800" : inq.status === "CLOSED" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}`}>{inq.status}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(inq.createdAt).toLocaleString("de-DE")}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold text-gray-900">{inq.firstName} {inq.lastName}</p>
                  <p className="text-gray-500 flex items-center gap-1"><Mail size={12} /> {inq.email}</p>
                  {inq.phone && <p className="text-gray-500">{inq.phone}</p>}
                  {inq.subject && <p className="text-gray-600 mt-2">Betreff: {inq.subject}</p>}
                </div>
                <div>
                  {inq.message && <p className="text-gray-600 whitespace-pre-wrap">{inq.message}</p>}
                  {inq.metadata && inq.type === "SELL" && (
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <p>Marke: {(inq.metadata as any).brand}</p>
                      <p>Modell: {(inq.metadata as any).model}</p>
                      {(inq.metadata as any).priceExpectation && <p>Preisvorstellung: {(inq.metadata as any).priceExpectation} €</p>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                <button onClick={() => updateStatus(inq.id, "IN_PROGRESS")} className="flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-blue-600 hover:bg-blue-50 rounded-lg"><Clock size={12} /> In Bearbeitung</button>
                <button onClick={() => updateStatus(inq.id, "CLOSED")} className="flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={12} /> Erledigt</button>
                <button onClick={() => updateStatus(inq.id, "CANCELLED")} className="flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-red-500 hover:bg-red-50 rounded-lg"><XCircle size={12} /> Ablehnen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
