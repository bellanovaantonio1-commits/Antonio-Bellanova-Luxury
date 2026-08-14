import React, { useState, useEffect } from "react";
import { X, Save, Loader2, AlertCircle, Languages } from "lucide-react";
import { Product } from "../../types.ts";
import { auth } from "../../lib/firebase.ts";
import { motion, AnimatePresence } from "motion/react";

import { adminProductService } from "../../services/admin/AdminProductService.ts";
import ProductPricingSection, { type ProductPricingSectionValue } from "./ProductPricingSection.tsx";
import ProductCertificatePanel from "./ProductCertificatePanel.tsx";

interface ProductEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
}

export default function ProductEditModal({ product, isOpen, onClose, onSave }: ProductEditModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>(product);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(product);
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ...formData,
          pricingModel: formData.pricingModel || "STANDARD",
          fixedSalePrice:
            formData.pricingModel === "PREPAYMENT_DISCOUNT"
              ? undefined
              : formData.fixedSalePrice ?? formData.price,
          basePrice:
            formData.pricingModel === "STANDARD" ? undefined : formData.basePrice ?? formData.price,
          overwrite: true,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Update fehlgeschlagen");
      }

      const updated = await response.json();
      onSave(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to update product", err);
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetranslate = async () => {
    if (!product.id) return;
    setIsSaving(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/products/${product.id}/retranslate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Retranslation failed");
      }

      const updated = await response.json();
      setFormData(updated);
      onSave(updated);
      alert("Produktdaten wurden erfolgreich neu übersetzt.");
    } catch (err: any) {
      console.error("Retranslation failed", err);
      setError(err.message || "Fehler bei der Neuübersetzung");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-xl font-serif italic tracking-wide text-gray-900">Produkt bearbeiten</h2>
                <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-1">{product.sku}</p>
              </div>
              
              <button
                type="button"
                onClick={handleRetranslate}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Languages size={14} /> Neu übersetzen
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div className="space-y-6">
                <h3 className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#D4AF37] border-b border-gray-100 pb-2">Allgemeine Infos</h3>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</label>
                  <input 
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    required
                  />
                </div>

                <ProductPricingSection
                  value={{
                    pricingModel:
                      (formData.pricingModel as ProductPricingSectionValue["pricingModel"]) ||
                      (formData.basePrice ? "PREPAYMENT_DISCOUNT" : "STANDARD"),
                    fixedSalePrice: String(formData.fixedSalePrice ?? formData.price ?? ""),
                    basePrice: String(formData.basePrice ?? ""),
                  }}
                  onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
                />

                {formData.id ? (
                  <ProductCertificatePanel productId={Number(formData.id)} />
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Shop-Preis (Anzeige)</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.price ? `${formData.price} €` : "—"}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                    <select 
                      value={formData.status || ""}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all cursor-pointer"
                    >
                      <option value="DRAFT">Entwurf</option>
                      <option value="ACTIVE">Aktiv</option>
                      <option value="RESERVED">Reserviert</option>
                      <option value="SOLD">Verkauft</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bestand</label>
                    <input 
                      type="number"
                      value={formData.stock || 0}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Jahr</label>
                    <input 
                      type="text"
                      placeholder="z.B. 2023"
                      value={formData.year || ""}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Marke</label>
                    <input 
                      type="text"
                      value={formData.brand?.name || formData.brandName || ""}
                      onChange={(e) => setFormData({...formData, brandName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kategorie</label>
                    <input 
                      type="text"
                      value={formData.category?.nameDe || formData.categoryName || ""}
                      onChange={(e) => setFormData({...formData, categoryName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-6">
                <h3 className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#D4AF37] border-b border-gray-100 pb-2">Produktdetails</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Material</label>
                    <input 
                      type="text"
                      value={formData.material || ""}
                      onChange={(e) => setFormData({...formData, material: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Durchmesser</label>
                    <input 
                      type="text"
                      value={formData.diameter || ""}
                      onChange={(e) => setFormData({...formData, diameter: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Box</label>
                    <select 
                      value={formData.box || ""}
                      onChange={(e) => setFormData({...formData, box: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all cursor-pointer"
                    >
                      <option value="">Nicht angegeben</option>
                      <option value="true">Ja</option>
                      <option value="false">Nein</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Papiere</label>
                    <select 
                      value={formData.papers || ""}
                      onChange={(e) => setFormData({...formData, papers: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all cursor-pointer"
                    >
                      <option value="">Nicht angegeben</option>
                      <option value="true">Ja</option>
                      <option value="false">Nein</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Uhrwerk</label>
                  <input 
                    type="text"
                    value={formData.movement || ""}
                    onChange={(e) => setFormData({...formData, movement: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Beschreibung (DE)</label>
                  <textarea 
                    rows={4}
                    value={formData.descriptionDe || ""}
                    onChange={(e) => setFormData({...formData, descriptionDe: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              {product.id && (
                <button 
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Produkt "${product.name}" wirklich unwiderruflich löschen? Dabei werden auch alle zugehörigen Bilder aus dem Speicher entfernt.`)) return;
                    setIsSaving(true);
                    try {
                      await adminProductService.deleteProduct(product.id!);
                      alert("Produkt wurde erfolgreich gelöscht.");
                      onSave({ ...product, id: -1 });
                      onClose();
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Produkt löschen
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-lg text-[10px] tracking-widest uppercase font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                onClick={handleSubmit}
                className="bg-[#D4AF37] text-white px-8 py-3 rounded-lg text-[10px] tracking-widest uppercase font-bold flex items-center gap-2 hover:bg-[#C19B2E] transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Speichere...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Änderungen speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
