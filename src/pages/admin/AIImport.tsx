import { useState } from "react";
import { BrainCircuit, Loader2, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase.ts";

export default function AIImport() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/extract", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraktion fehlgeschlagen");
      setResult(data);
    } catch (e: any) {
      console.error("AI Extraction failed", e);
      alert(e.message || "Extraktion fehlgeschlagen. Möglicherweise wurde das Kontingent überschritten.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Nicht authentifiziert");

      // Sanitize price: remove non-numeric chars except dot/comma
      const rawPrice = result.price?.toString() || "0";
      const sanitizedPrice = rawPrice.replace(/[^-0-9,.]/g, '').replace(',', '.');
      const finalPrice = parseFloat(sanitizedPrice) || 0;

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ...result,
          price: finalPrice,
          status: "ACTIVE",
          images: result.images || [],
          sku: result.reference || result.sku || "AI-" + Date.now()
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Fehler beim Speichern");
      }

      alert("Produkt erfolgreich in den Bestand übernommen.");
      navigate("/admin/products");
    } catch (e: any) {
      console.error("Failed to save product", e);
      alert(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const updateResult = (field: string, value: any) => {
    setResult((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-gray-50 p-8 rounded-xl border border-gray-100">
        <h3 className="text-lg font-serif mb-4 flex items-center gap-3">
          <BrainCircuit className="text-[#D4AF37]" /> AI Product Importer
        </h3>
        <p className="text-gray-500 text-[12px] mb-6 leading-relaxed">
          Fügen Sie eine Produktbeschreibung oder technische Details ein. Unsere KI extrahiert automatisch alle relevanten Felder für das ERP.
        </p>
        
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Beispiel: Rolex Submariner Date, Referenz 126610LN, Jahr 2023, Full Set, Box & Papiere vorhanden, Zustand Ungetragen..."
          className="w-full h-48 bg-white border border-gray-200 rounded-lg p-6 text-[13px] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all resize-none mb-6"
        />
        
        <button 
          onClick={handleExtract}
          disabled={loading || !text}
          className="bg-[#0A0A0A] text-white px-8 py-4 rounded-lg text-[10px] tracking-widest uppercase font-bold flex items-center gap-3 disabled:opacity-50 transition-all"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
          Daten extrahieren
        </button>
      </div>

      {result && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-[#FAFAFA] px-8 py-4 border-b border-gray-200 flex justify-between items-center">
            <span className="text-[10px] tracking-widest uppercase font-bold">Vorschau der extrahierten Daten</span>
            <div className="flex gap-4">
               <button onClick={() => setResult(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={18} /></button>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Name (DE)</label>
                <input 
                  value={result.titleDe || result.name || ""} 
                  onChange={(e) => updateResult("titleDe", e.target.value)}
                  className="w-full border-b border-gray-200 py-2 text-[13px] outline-none focus:border-[#D4AF37]" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Name (EN)</label>
                <input 
                  value={result.titleEn || result.name || ""} 
                  onChange={(e) => updateResult("titleEn", e.target.value)}
                  className="w-full border-b border-gray-200 py-2 text-[13px] outline-none focus:border-[#D4AF37]" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Marke</label>
                <input 
                  value={result.brand || ""} 
                  onChange={(e) => updateResult("brand", e.target.value)}
                  className="w-full border-b border-gray-200 py-2 text-[13px] outline-none focus:border-[#D4AF37]" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Referenz</label>
                <input 
                  value={result.sku || result.reference || ""} 
                  onChange={(e) => updateResult("sku", e.target.value)}
                  className="w-full border-b border-gray-200 py-2 text-[13px] outline-none focus:border-[#D4AF37]" 
                />
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Preis (Vorschlag)</label>
                <input 
                  value={result.price || ""} 
                  onChange={(e) => updateResult("price", e.target.value)}
                  className="w-full border-b border-gray-200 py-2 text-[13px] outline-none focus:border-[#D4AF37]" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Jahr</label>
                <input 
                  value={result.year || ""} 
                  onChange={(e) => updateResult("year", e.target.value)}
                  className="w-full border-b border-gray-200 py-2 text-[13px] outline-none focus:border-[#D4AF37]" 
                />
              </div>
              <div className="space-y-1 flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={!!result.box} 
                    onChange={(e) => updateResult("box", e.target.checked)}
                    className="accent-[#D4AF37]" 
                  />
                  <span className="text-[10px] tracking-widest uppercase">Box</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={!!result.papers} 
                    onChange={(e) => updateResult("papers", e.target.checked)}
                    className="accent-[#D4AF37]" 
                  />
                  <span className="text-[10px] tracking-widest uppercase">Papiere</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-6">
             <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Beschreibung (DE)</label>
                <textarea 
                  value={result.descriptionDe || ""} 
                  onChange={(e) => updateResult("descriptionDe", e.target.value)}
                  className="w-full border border-gray-200 rounded p-3 text-[13px] outline-none focus:border-[#D4AF37] h-32" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Beschreibung (EN)</label>
                <textarea 
                  value={result.descriptionEn || ""} 
                  onChange={(e) => updateResult("descriptionEn", e.target.value)}
                  className="w-full border border-gray-200 rounded p-3 text-[13px] outline-none focus:border-[#D4AF37] h-32" 
                />
              </div>
          </div>
          
          <div className="px-8 py-6 border-t border-gray-100 flex justify-end">
             <button 
               onClick={handleSave}
               disabled={saving}
               className="bg-[#D4AF37] text-white px-10 py-4 rounded-lg text-[10px] tracking-widest uppercase font-bold flex items-center gap-3 hover:bg-[#C19B2E] transition-all disabled:opacity-50"
             >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                In den Bestand übernehmen
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
