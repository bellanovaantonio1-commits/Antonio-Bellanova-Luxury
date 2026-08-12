import { useState, useEffect } from "react";
import { Tag } from "lucide-react";
import { auth } from "../../lib/firebase.ts";

interface Brand {
  id: number;
  name: string;
  slug: string;
  descriptionDe?: string;
}

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const load = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/brands", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setBrands(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const token = await auth.currentUser?.getIdToken();
    await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Tag size={32} className="text-gray-400" />
        <div>
          <h3 className="text-xl font-serif text-gray-900">Marken</h3>
          <p className="text-sm text-gray-500">Luxusmarken für Produkte verwalten</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3 max-w-md">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Rolex, Patek Philippe"
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#D4AF37]" />
        <button type="submit" className="bg-[#D4AF37] text-white px-6 py-3 rounded-lg text-[10px] tracking-widest uppercase font-bold hover:bg-[#C19B2E]">Hinzufügen</button>
      </form>

      {loading ? (
        <p className="text-gray-400 italic text-sm">Wird geladen...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {brands.map(b => (
            <div key={b.id} className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
              <p className="font-serif text-lg text-gray-900">{b.name}</p>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{b.slug}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
