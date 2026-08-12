import { useState, useEffect } from "react";
import { Users, Mail } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface Customer {
  id: number;
  uid: string;
  email: string;
  role: string;
  inquiryCount: number;
  createdAt: string;
}

interface Inquiry {
  id: number;
  type: string;
  status: string;
  firstName?: string;
  lastName?: string;
  email: string;
  subject?: string;
  message?: string;
  createdAt: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const [custRes, inqRes] = await Promise.all([
          fetch("/api/admin/crm/customers", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/inquiries", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (custRes.ok) setCustomers(await custRes.json());
        if (inqRes.ok) setInquiries(await inqRes.json());
      } catch (err) {
        console.error("Failed to load customers", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 text-gray-400">
        <Users size={32} />
        <div>
          <h3 className="text-xl font-serif text-gray-900">Kunden (CRM)</h3>
          <p className="text-sm">{customers.length} registrierte Kunden</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 italic text-sm">Kunden werden geladen...</p>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm italic">
          Keine Kunden gefunden.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] tracking-widest uppercase text-gray-400">
                <th className="px-6 py-4">E-Mail</th>
                <th className="px-6 py-4">Registriert</th>
                <th className="px-6 py-4">Anfragen</th>
                <th className="px-6 py-4">Rolle</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-4 flex items-center gap-2">
                    <Mail size={14} className="text-gray-300" />
                    {c.email}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {c.inquiryCount > 0 ? (
                      <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-1 rounded-full text-[10px] font-bold">{c.inquiryCount}</span>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-[10px] tracking-widest uppercase font-bold text-gray-400">{c.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inquiries.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-900">Offene Anfragen ({inquiries.filter(i => i.status === "NEW").length})</h4>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[10px] tracking-widest uppercase text-gray-400">
                  <th className="px-6 py-4">Typ</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">E-Mail</th>
                  <th className="px-6 py-4">Datum</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.slice(0, 10).map(inq => (
                  <tr key={inq.id} className="border-t border-gray-50">
                    <td className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400">{inq.type}</td>
                    <td className="px-6 py-4">{inq.firstName} {inq.lastName}</td>
                    <td className="px-6 py-4">{inq.email}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(inq.createdAt).toLocaleDateString("de-DE")}</td>
                    <td className="px-6 py-4"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-[10px] font-bold">{inq.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
