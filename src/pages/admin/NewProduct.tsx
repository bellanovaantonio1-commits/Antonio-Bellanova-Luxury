import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, X, Upload, Globe, Sparkles, AlertCircle } from "lucide-react";
import ImportInterface from "../../components/admin/ImportInterface.tsx";
import ImportPreview from "../../components/admin/ImportPreview.tsx";
import ErrorBoundary from "../../components/common/ErrorBoundary.tsx";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase.ts";

export default function NewProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    sku: "",
    type: "WATCH",
    condition: "NEW",
    price: "",
    currency: "EUR",
    descriptionDe: "",
    status: "DRAFT"
  });

  const handleAddImage = () => {
    if (imageUrl && !images.includes(imageUrl)) {
      setImages([...images, imageUrl]);
      setImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProduct(formData, images);
  };

  const saveProduct = async (finalData: any, finalImages: string[]) => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Nicht authentifiziert");

      const productData = {
        ...finalData,
        images: finalImages,
        price: parseFloat(finalData.price) || 0,
      };

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Speichern");
      }

      navigate("/admin/products");
    } catch (error: any) {
      console.error("Failed to save product", error);
      alert(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (importData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <ErrorBoundary fallback={
          <div className="p-12 bg-white rounded-[32px] border border-red-100 shadow-xl flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-4 bg-red-50 rounded-full">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-serif tracking-tight text-gray-900">Analyse-Vorschau Fehler</h3>
              <p className="text-[13px] text-gray-500">Die Vorschau konnte aufgrund eines Fehlers in den extrahierten Daten nicht geladen werden.</p>
            </div>
            <button onClick={() => setImportData(null)} className="px-8 py-3 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg">Zurück zum Import</button>
          </div>
        }>
          <ImportPreview 
            data={importData} 
            onSave={() => navigate("/admin/products")}
            onCancel={() => setImportData(null)}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/admin/products")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-serif tracking-tight text-gray-900">Neues Produkt anlegen</h2>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mt-1">Manuell oder via Import</p>
          </div>
        </div>

        <button 
          onClick={() => setShowImport(!showImport)}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${showImport ? 'bg-gray-100 text-gray-600' : 'bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20'}`}
        >
          <Globe size={14} />
          {showImport ? "Manueller Modus" : "Produkt Importieren"}
        </button>
      </div>

      {showImport && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <ImportInterface onDataExtracted={setImportData} />
        </div>
      )}

      {!showImport && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-gray-100 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 pb-4">Basis Informationen</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Produktname</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    placeholder="z.B. Rolex Submariner Date"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Referenz (SKU)</label>
                    <input 
                      required
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      placeholder="126610LN"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Preis (EUR)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      placeholder="14500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Beschreibung (DE)</label>
                  <textarea 
                    rows={6}
                    value={formData.descriptionDe}
                    onChange={e => setFormData({...formData, descriptionDe: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37] resize-none"
                    placeholder="Detaillierte Beschreibung des Produkts..."
                  />
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-2xl border border-gray-100 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 pb-4">Bilder</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    placeholder="Bild URL hinzufügen..."
                  />
                  <button 
                    type="button"
                    onClick={handleAddImage}
                    className="px-6 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-gray-700"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {images.map((url, i) => (
                    <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden group">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button 
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {images.length === 0 && (
                    <div className="col-span-4 py-12 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-300">
                      <Upload size={32} className="mb-2" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Keine Bilder hinzugefügt</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-gray-100 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 pb-4">Kategorisierung</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Typ</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 outline-none appearance-none"
                  >
                    <option value="WATCH">Armbanduhr</option>
                    <option value="JEWELRY">Schmuck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Zustand</label>
                  <select 
                    value={formData.condition}
                    onChange={e => setFormData({...formData, condition: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 outline-none appearance-none"
                  >
                    <option value="NEW">Neu (Ungetragen)</option>
                    <option value="PRE_OWNED">Gebraucht</option>
                    <option value="VINTAGE">Vintage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-900 outline-none appearance-none"
                  >
                    <option value="DRAFT">Entwurf</option>
                    <option value="ACTIVE">Verfügbar</option>
                    <option value="RESERVED">Reserviert</option>
                    <option value="SOLD">Verkauft</option>
                  </select>
                </div>
              </div>
            </section>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#D4AF37] text-white rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#C19B2E] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? "Wird gespeichert..." : (
                <>
                  <Save size={18} />
                  Produkt speichern
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
