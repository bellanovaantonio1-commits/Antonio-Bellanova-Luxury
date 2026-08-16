import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageIcon, Loader2, Search, Trash2, X } from "lucide-react";
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

function formatPrice(product: Product): string {
  const price = Number.parseFloat(String(product.price ?? ""));
  if (!Number.isFinite(price)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: product.currency || "EUR",
  }).format(price);
}

function getProductLabel(product: Product): string {
  return product.titleDe || product.name;
}

function ProductMeta({ product }: { product: Product }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-bold truncate">
        {product.brand?.name || "—"}
      </p>
      <p className="text-sm font-medium text-gray-900 truncate">{getProductLabel(product)}</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500 uppercase tracking-wide">
        {product.sku && <span>Ref. {product.sku}</span>}
        <span>{formatPrice(product)}</span>
        {product.conditionGroup && <span>{product.conditionGroup}</span>}
      </div>
    </div>
  );
}

function ProductThumbnail({ product, size = "md" }: { product: Product; size?: "sm" | "md" }) {
  const imageUrl = getProductImageUrl(product);
  const box = size === "sm" ? "h-12 w-12" : "h-14 w-14";

  return (
    <div className={`${box} shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-100`}>
      {imageUrl ? (
        <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-gray-300">
          <ImageIcon size={18} />
        </div>
      )}
    </div>
  );
}

interface CollectionProductPickerProps {
  products: Product[];
  disabled?: boolean;
  onAdd: (productIds: number[]) => Promise<void>;
}

function CollectionProductPicker({
  products,
  disabled,
  onAdd,
}: CollectionProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = 0;
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.titleDe,
        product.titleEn,
        product.sku,
        product.brand?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [products, query]);

  const toggleSelected = (productId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((p) => Number(p.id))));
  };

  const clearSelection = () => setSelected(new Set());

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await onAdd([...selected]);
      setSelected(new Set());
      setOpen(false);
      setQuery("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-auto pt-2 border-t border-gray-100 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400">
          Uhren hinzufügen
        </label>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={disabled || products.length === 0}
          className="text-[10px] tracking-widest uppercase font-bold text-[#8B6914] hover:text-[#D4AF37] disabled:opacity-40"
        >
          {open ? "Schließen" : "Auswahl öffnen"}
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Keine weiteren aktiven Produkte verfügbar.</p>
      ) : open ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suche nach Name, Marke, SKU…"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-gray-800"
              >
                Alle sichtbaren wählen
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-gray-800"
              >
                Auswahl leeren
              </button>
            </div>
          </div>

          <ul ref={listRef} className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <li className="p-4 text-sm text-gray-400 italic">Keine Treffer.</li>
            ) : (
              filtered.map((product) => {
                const productId = Number(product.id);
                const isSelected = selected.has(productId);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => toggleSelected(productId)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        isSelected ? "bg-[#FFFBF0]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center ${
                          isSelected
                            ? "border-[#D4AF37] bg-[#D4AF37] text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                      </div>
                      <ProductThumbnail product={product} size="sm" />
                      <ProductMeta product={product} />
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="p-3 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/80">
            <p className="text-xs text-gray-500">
              {selected.size === 0
                ? "Mehrere Uhren gleichzeitig auswählen"
                : `${selected.size} ausgewählt`}
            </p>
            <button
              type="button"
              disabled={selected.size === 0 || adding || disabled}
              onClick={handleAdd}
              className="px-4 py-2.5 rounded-lg bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#C19B2E] disabled:opacity-50 flex items-center gap-2"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : null}
              Hinzufügen
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          {products.length} verfügbare Produkte — mehrere gleichzeitig mit Bild und Details auswählen.
        </p>
      )}
    </div>
  );
}

export default function CuratedCollectionsAdmin() {
  const [collections, setCollections] = useState<CollectionMap>(EMPTY_COLLECTIONS);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<ShopCollectionSlug | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  };

  const addProducts = async (collection: ShopCollectionSlug, productIds: number[]) => {
    if (productIds.length === 0) return;
    setSavingSlug(collection);
    setError(null);
    try {
      await Promise.all(productIds.map((productId) => toggleProduct(collection, productId, true)));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSavingSlug(null);
    }
  };

  const removeProduct = async (collection: ShopCollectionSlug, productId: number) => {
    setSavingSlug(collection);
    setError(null);
    try {
      await toggleProduct(collection, productId, false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSavingSlug(null);
    }
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
          Wählen Sie pro Kategorie eine oder mehrere Uhren aus. In der Auswahl sehen Sie Bild, Marke, Preis und
          Referenz. Auf der Startseite wird jeweils eine passende Uhr ohne Duplikate angezeigt.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
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
          const isSaving = savingSlug === collection.slug;

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
                  <p className="text-xs text-gray-500 mt-1">Aktuell: {getProductLabel(preview)}</p>
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
                  <ul className="space-y-2 max-h-80 overflow-y-auto overscroll-contain pr-1">
                    {assigned.map((product) => (
                      <li
                        key={product.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3"
                      >
                        <ProductThumbnail product={product} />
                        <ProductMeta product={product} />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => removeProduct(collection.slug, Number(product.id))}
                          className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Aus Kollektion entfernen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <CollectionProductPicker
                  products={availableProducts}
                  disabled={isSaving}
                  onAdd={(productIds) => addProducts(collection.slug, productIds)}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
