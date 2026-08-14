import { useState, useEffect } from "react";
import { Search, Edit, Trash2, ExternalLink, Plus, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Product } from "../../types.ts";
import { collection, onSnapshot, query, deleteDoc, doc, writeBatch, getDocs, orderBy, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebase.ts";
import ProductEditModal from "../../components/admin/ProductEditModal.tsx";
import { adminProductService } from "../../services/admin/AdminProductService.ts";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [reEnrichLoading, setReEnrichLoading] = useState(false);
  const [reEnrichResult, setReEnrichResult] = useState<{ processed: number; updated: number; errors: { id: number; error: string }[] } | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        throw new Error("Failed to load products");
      }
    } catch (err: any) {
      console.error("Failed to load products from SQL", err);
      setError(err.message || "Fehler beim Laden der Produkte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();

    // Still use Firestore for real-time updates if available
    const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      // Prefer Firestore data for real-time if we have it
      if (productList.length > 0) {
        setProducts(productList);
        setError(null);
      }
    }, (error) => {
      console.warn("Firestore real-time sync restricted:", error.message);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || product.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteAll = async () => {
    if (!confirm("Möchten Sie wirklich ALLE Produkte löschen? Dieser Vorgang löscht SQL-Daten, Firestore-Dokumente und alle Produktbilder im Speicher.")) return;
    
    setLoading(true);
    try {
      await adminProductService.deleteAllProducts();
      alert("Alle Produkte und zugehörigen Medien wurden erfolgreich gelöscht.");
      await loadProducts();
    } catch (e: any) {
      console.error("Failed to delete all products", e);
      alert(`Fehler beim Löschen: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReEnrich = async () => {
    if (!confirm("Shop-Texte für ALLE Produkte neu aufbereiten? Bestehende DE/EN-Felder werden anhand der Quelldaten und des Enrichment-Pipelines aktualisiert.")) return;

    setReEnrichLoading(true);
    setReEnrichResult(null);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/admin/products/re-enrich", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Re-Enrichment fehlgeschlagen");
      setReEnrichResult(data);
      await loadProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Re-Enrichment fehlgeschlagen");
    } finally {
      setReEnrichLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const deleteId =
      typeof product.id === "number"
        ? product.id
        : (product as Product & { sqlId?: number }).sqlId ?? product.id;
    if (!deleteId) return;
    if (!confirm(`Produkt "${product.name}" wirklich unwiderruflich löschen? Dabei werden auch alle zugehörigen Bilder aus dem Speicher entfernt.`)) return;
    
    setLoading(true);
    try {
      await adminProductService.deleteProduct(deleteId);
      await loadProducts();
      alert("Produkt wurde erfolgreich gelöscht.");
    } catch (e: any) {
      console.error("Failed to delete product", e);
      alert(`Fehler beim Löschen: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {reEnrichResult && (
        <div className="p-4 bg-green-50 border border-green-100 text-green-800 rounded-lg text-sm space-y-1">
          <p className="font-bold">Shop-Texte neu aufbereitet</p>
          <p>{reEnrichResult.updated} von {reEnrichResult.processed} Produkten aktualisiert.</p>
          {reEnrichResult.errors.length > 0 && (
            <p className="text-amber-800">{reEnrichResult.errors.length} Fehler — IDs: {reEnrichResult.errors.map((e) => e.id).join(", ")}</p>
          )}
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center border-b border-gray-100 pb-8">
        <div className="relative w-full md:w-96">
           <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
           <input 
             placeholder="Produkt suchen (Name, SKU...)"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all shadow-sm"
           />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <button
             type="button"
             onClick={handleReEnrich}
             disabled={reEnrichLoading || loading}
             className="flex items-center justify-center gap-2 px-6 py-3 border border-[#D4AF37]/40 text-[#8B6914] rounded-lg text-[10px] tracking-widest uppercase font-bold hover:bg-[#D4AF37]/10 transition-all disabled:opacity-50 whitespace-nowrap"
           >
             {reEnrichLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
             {reEnrichLoading ? "Wird aufbereitet…" : "Shop-Texte neu aufbereiten"}
           </button>
           <Link 
             to="/admin/products/new" 
             className="bg-[#D4AF37] text-white px-6 py-3 rounded-lg text-[10px] tracking-widest uppercase font-bold flex items-center gap-2 hover:bg-[#C19B2E] transition-all shadow-md whitespace-nowrap"
           >
             <Plus size={16} /> Produkt hinzufügen
           </Link>
            <button 
              onClick={handleDeleteAll}
              disabled={loading}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-red-100 text-red-500 rounded-lg text-[10px] tracking-widest uppercase font-bold transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
            >
               <Trash2 size={16} /> {loading ? 'Löschen...' : 'Alle löschen'}
            </button>
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="flex-1 md:flex-none px-6 py-3 border border-gray-100 rounded-lg text-[10px] tracking-widest uppercase font-bold hover:bg-gray-50 transition-all outline-none bg-white cursor-pointer"
           >
              <option value="ALL">Status: Alle</option>
              <option value="ACTIVE">Aktiv</option>
              <option value="DRAFT">Entwurf</option>
              <option value="RESERVED">Reserviert</option>
              <option value="SOLD">Verkauft</option>
           </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-[10px] tracking-[0.2em] uppercase font-bold text-gray-600">Produkt</th>
              <th className="px-6 py-4 text-[10px] tracking-[0.2em] uppercase font-bold text-gray-600">Status</th>
              <th className="px-6 py-4 text-[10px] tracking-[0.2em] uppercase font-bold text-gray-600">Bestand</th>
              <th className="px-6 py-4 text-[10px] tracking-[0.2em] uppercase font-bold text-gray-600">Preis</th>
              <th className="px-6 py-4 text-[10px] tracking-[0.2em] uppercase font-bold text-gray-600">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-8"><div className="h-4 bg-gray-100 w-48 rounded" /></td>
                  <td className="px-6 py-8"><div className="h-4 bg-gray-100 w-24 rounded" /></td>
                  <td className="px-6 py-8"><div className="h-4 bg-gray-100 w-12 rounded" /></td>
                  <td className="px-6 py-8"><div className="h-4 bg-gray-100 w-24 rounded" /></td>
                  <td className="px-6 py-8"><div className="h-4 bg-gray-100 w-16 rounded" /></td>
                </tr>
              ))
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-24 text-center text-gray-400 text-sm italic">
                  Keine Produkte gefunden. {searchTerm || statusFilter !== "ALL" ? "Passen Sie Ihre Suche an." : "Nutzen Sie den AI Importer oder legen Sie ein Produkt manuell an."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden">
                        <img src={product.images[0]} className="w-full h-full object-cover" alt={product.name} />
                      </div>
                      <div>
                        <p className="text-[14px] font-serif font-bold text-gray-900 leading-tight">{product.name}</p>
                        <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`text-[10px] tracking-widest uppercase px-3 py-1 rounded-md font-bold shadow-sm ${
                      product.status === "ACTIVE" ? "bg-green-100 text-green-700 border border-green-200" :
                      product.status === "RESERVED" ? "bg-orange-100 text-orange-700 border border-orange-200" :
                      "bg-gray-200 text-gray-700 border border-gray-300"
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 font-mono text-[13px]">
                    <span className="font-bold text-gray-900">{product.stock || 0}</span>
                  </td>
                  <td className="px-6 py-6 font-bold text-[14px] text-gray-900">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(parseFloat(product.price))}
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingProduct(product)}
                        className="p-2 text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-all"
                        title="Bearbeiten"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                      <Link 
                        to={`/product/${product.slug}`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Vorschau"
                      >
                        <ExternalLink size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <ProductEditModal 
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updated) => {
            if (updated.id === -1) {
              loadProducts();
            } else {
              setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
            }
          }}
        />
      )}
    </div>
  );
}
