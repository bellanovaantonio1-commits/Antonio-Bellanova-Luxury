import React, { useState } from "react";
import { Link, Search, Loader2, CheckCircle2, AlertCircle, Globe, ChevronRight } from "lucide-react";
import { Product } from "../../types.ts";
import { auth } from "../../lib/firebase.ts";

interface ImportInterfaceProps {
  onDataExtracted: (data: any) => void;
}

export default function ImportInterface({ onDataExtracted }: ImportInterfaceProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Bitte melden Sie sich an, um den Import zu nutzen.");
      }

      const response = await fetch("/api/admin/products/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Analyse fehlgeschlagen");
      }

      const data = await response.json();
      onDataExtracted(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D4AF37]/10 rounded-lg">
            <Globe className="text-[#D4AF37]" size={20} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-gray-900">Produkt Importieren</h3>
            <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest font-black">Unterstützte Quelle: TS Trading (ts-t.jp)</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <input 
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ts-t.jp/..."
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:bg-white focus:border-[#D4AF37] transition-all pr-32 placeholder:text-gray-400"
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading || !url}
            className="absolute right-2 top-2 bottom-2 px-6 bg-[#D4AF37] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#C19B2E] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Analysieren
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3 text-red-700">
            <AlertCircle size={16} />
            <span className="text-[11px] font-bold uppercase tracking-wider">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between group cursor-help">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Quelle erkannt</span>
            </div>
            <span className="text-[10px] font-bold text-gray-800">TS TRADING</span>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-gray-400" size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</span>
            </div>
            <span className="text-[10px] font-bold text-gray-600">BEREIT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
