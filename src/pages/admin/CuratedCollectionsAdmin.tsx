import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { auth } from "../../lib/firebase.ts";
import { SHOP_COLLECTIONS, type ShopCollectionSlug } from "../../config/shopCollections.ts";
import { getProductImageUrl } from "../../lib/productImage.ts";
import { pickUniqueCollectionPreviews, productInCuratedCollection } from "../../lib/shopCollectionFilters.ts";
import type { Product } from "../../types.ts";

type CollectionMap = Record<ShopCollectionSlug, Product[]>;

const EMPTY_COLLECTIONS: CollectionMap = {
  sport: [],
  vintage: [],
  "under-5000": [],
};

export default function CuratedCollectionsAdmin() {
  const [collections, setCollections] = useState<CollectionMap>(EMPTY_COLLECTIONS);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<ShopCollectionSlug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<Record<ShopCollectionSlug, string>>({
    sport: "",
    vintage: "",
    "under-5000": "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [collectionsRes, productsRes] = await Promise.all([
        fetch("/api/admin/collections", { headers }),
        fetch("/api/admin/products", { headers }),
      ]);

      if (!collectionsRes.ok) {
        const data = await collectionsRes.json().catch(() => ({}));
        throw new Error(
          data.error ||
            "Kollektionen konnten nicht geladen werden. Bitte `npm run db:migrate` ausführen und den Server neu starten."
        );
      }
      if (!productsRes.ok) throw new Error("Produkte konnten nicht geladen werden.");

      setCollections(await collectionsRes.json());
      setAllProducts(await productsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const homepagePreviews = useMemo(
    () =>
      pickUniqueCollectionPreviews(collections, SHOP_COLLECTIONS.map((c) => c.slug), {
        stable: true,
      }),
    [collections]
  );

  const toggleProduct = async (
    collection: ShopCollectionSlug,
    productId: number,
    featured: boolean
  ) => {
    setSavingSlug(collection);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/admin/collections/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, collection, featured }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSavingSlug(null);
    }
  };

  const addProduct = async (collection: ShopCollectionSlug) => {
    const productId = parseInt(selectedProductId[collection], 10);
    if (!Number.isFinite(productId)) return;
    await toggleProduct(collection, productId, true);
    setSelectedProductId((prev) => ({ ...prev, [collection]: "" }));
  };

  if (loading) {
    return (
      <p className="text-gray-400 italic text-sm flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        Kollektionen werden geladen…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-serif text-gray-900">Kuratierte Kollektionen</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl">
          Hier legen Sie fest, welche Uhren auf der Startseite unter Sportuhren, Vintage und Under 5.000 €
          erscheinen. Pro Kategorie können mehrere Produkte hinterlegt werden — auf der Startseite wird jeweils
          eine passende Uhr ohne Duplikate angezeigt. Sportuhren erscheinen zusätzlich im Shop-Filter.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {SHOP_COLLECTIONS.map((collection) => {
          const assigned = collections[collection.slug] ?? [];
          const preview = homepagePreviews[collection.slug];
          const previewImage = preview ? getProductImageUrl(preview) : collection.fallbackImage;
          const availableProducts = allProducts.filter(
            (product) =>
              product.status === "ACTIVE" &&
              (product.stock ?? 0) > 0 &&
              !productInCuratedCollection(product, collection.slug)
          );

          return (
            <section
              key={collection.slug}
              className="rounded-2xl border border-gray-100 bg-gray-50/60 overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 bg-white">
                <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#D4AF37]">
                  Startseiten-Vorschau
                </p>
                <div className="mt-3 aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-[#0a0a0a]">
                  <img
                    src={previewImage || collection.fallbackImage}
                    alt={preview?.name || collection.slug}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h4 className="mt-4 text-lg font-serif italic text-gray-900">
                  {collection.slug === "sport"
                    ? "Sportuhren"
                    : collection.slug === "vintage"
                      ? "Vintage"
                      : "Under 5.000 €"}
                </h4>
                {preview ? (
                  <p className="text-xs text-gray-500 mt-1">Aktuell: {preview.titleDe || preview.name}</p>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">Noch kein Produkt zugewiesen — Platzhalterbild</p>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col gap-4">
                <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400">
                  Zugewiesene Produkte ({assigned.length})
                </p>

                {assigned.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Noch keine Uhren in dieser Kollektion.</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto overscroll-contain pr-1">
                    {assigned.map((product) => (
                      <li
                        key={product.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3"
                      >
                        <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {getProductImageUrl(product) ? (
                            <img
                              src={getProductImageUrl(product)}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-300">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.titleDe || product.name}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">{product.sku}</p>
                        </div>
                        <button
                          type="button"
                          disabled={savingSlug === collection.slug}
                          onClick={() => toggleProduct(collection.slug, Number(product.id), false)}
                          className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Aus Kollektion entfernen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-2 border-t border-gray-100 space-y-2">
                  <label className="text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400">
                    Uhr hinzufügen
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedProductId[collection.slug]}
                      onChange={(e) =>
                        setSelectedProductId((prev) => ({ ...prev, [collection.slug]: e.target.value }))
                      }
                      className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900"
                    >
                      <option value="">Produkt wählen…</option>
                      {availableProducts.map((product) => (
                        <option key={product.id} value={String(product.id)}>
                          {(product.titleDe || product.name) + (product.sku ? ` (${product.sku})` : "")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedProductId[collection.slug] || savingSlug === collection.slug}
                      onClick={() => addProduct(collection.slug)}
                      className="shrink-0 px-4 py-2.5 rounded-lg bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#C19B2E] disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingSlug === collection.slug ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
