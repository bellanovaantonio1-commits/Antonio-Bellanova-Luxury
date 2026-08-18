import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MenuItem, Category } from '../../types';
import { Plus, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react';

const MenuEditor: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Partial<MenuItem>>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const menuQ = query(collection(db, 'menu'), orderBy('order', 'asc'));
    const categoriesQ = query(collection(db, 'categories'), orderBy('order', 'asc'));

    const unsubMenu = onSnapshot(menuQ, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });

    const unsubCategories = onSnapshot(categoriesQ, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
      if (cats.length > 0 && !editItem.category) {
        setEditItem(prev => ({ ...prev, category: cats[0].name }));
      }
    });

    setLoading(false); // Simplified loading for now

    return () => {
      unsubMenu();
      unsubCategories();
    };
  }, []);

  const handleSave = async () => {
    if (!editItem.name || !editItem.price || !editItem.category) return;
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'menu', editingId), editItem);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'menu'), { ...editItem, order: items.length });
        setIsAdding(false);
      }
      setEditItem({});
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Möchten Sie diesen Artikel wirklich löschen?')) {
      await deleteDoc(doc(db, 'menu', id));
    }
  };

  if (loading) return <Loader2 className="animate-spin text-emerald-600 mx-auto" />;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Speisekarte verwalten</h1>
          <p className="text-neutral-500">Artikel hinzufügen, bearbeiten oder löschen.</p>
        </div>
        <button
          onClick={() => { 
            setIsAdding(true); 
            setEditingId(null); 
            setEditItem({ category: categories[0]?.name || '' }); 
          }}
          className="flex items-center space-x-2 px-6 py-2.5 bg-brand-green text-white rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-lg uppercase text-xs tracking-widest"
        >
          <Plus size={20} />
          <span>Hinzufügen</span>
        </button>
      </header>

      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Kategorie</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Preis</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(isAdding || editingId) && (
              <tr className="bg-brand-green/5">
                <td className="px-6 py-4">
                  <input 
                    type="text" 
                    value={editItem.name || ''} 
                    onChange={e => setEditItem({...editItem, name: e.target.value})}
                    placeholder="Name"
                    className="w-full px-3 py-1.5 border rounded-lg focus:ring-1 focus:ring-brand-green outline-none"
                  />
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={editItem.category || ''} 
                    onChange={e => setEditItem({...editItem, category: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg focus:ring-1 focus:ring-brand-green outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <input 
                    type="text" 
                    value={editItem.price || ''} 
                    onChange={e => setEditItem({...editItem, price: e.target.value})}
                    placeholder="2.50"
                    className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={handleSave} className="text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg">
                    <Save size={18} />
                  </button>
                  <button onClick={() => { setIsAdding(false); setEditingId(null); setEditItem({}); }} className="text-neutral-400 hover:bg-neutral-100 p-2 rounded-lg">
                    <X size={18} />
                  </button>
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 font-medium text-neutral-900">{item.name}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">{item.category}</span>
                </td>
                <td className="px-6 py-4 text-neutral-600">{item.price}€</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => { setEditingId(item.id); setEditItem(item); setIsAdding(false); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MenuEditor;
