import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category } from '../../types';
import { Plus, Trash2, GripVertical, Save, Loader2 } from 'lucide-react';
import { motion, Reorder } from 'motion/react';

const CategoryEditor: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      setCategories(cats);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName.trim(),
        order: categories.length
      });
      setNewCategoryName('');
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding category:", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Kategorie wirklich löschen?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  const handleReorder = async (newOrder: Category[]) => {
    setCategories(newOrder);
    try {
      const updates = newOrder.map((cat, index) => 
        updateDoc(doc(db, 'categories', cat.id), { order: index })
      );
      await Promise.all(updates);
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-brand-green" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-neutral-900">Kategorien</h2>
          <p className="text-neutral-500">Verwalten Sie die Kategorien Ihrer Speisekarte.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-2 px-6 py-2.5 bg-brand-green text-white rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-lg uppercase text-xs tracking-widest"
          >
            <Plus size={20} />
            <span>Hinzufügen</span>
          </button>
        )}
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddCategory}
          className="mb-8 p-6 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-end gap-4"
        >
          <div className="flex-grow">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Kategoriename</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-1 focus:ring-brand-green outline-none transition-all"
              placeholder="z.B. Eisbecher"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-3 bg-white text-neutral-600 rounded-xl font-bold hover:bg-neutral-100 transition-all uppercase text-xs tracking-widest border border-neutral-200"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-brand-green text-white rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-lg uppercase text-xs tracking-widest flex items-center"
            >
              <Save size={18} className="mr-2" />
              Speichern
            </button>
          </div>
        </motion.form>
      )}

      <Reorder.Group axis="y" values={categories} onReorder={handleReorder} className="space-y-3">
        {categories.map((category) => (
          <Reorder.Item
            key={category.id}
            value={category}
            className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl hover:border-brand-green/30 transition-colors group cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center">
              <GripVertical size={20} className="text-neutral-300 mr-4 group-hover:text-brand-green transition-colors" />
              <span className="font-bold text-neutral-800">{category.name}</span>
            </div>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="p-2 text-neutral-300 hover:text-brand-red hover:bg-rose-50 rounded-lg transition-all"
            >
              <Trash2 size={18} />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {categories.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
          <p className="text-neutral-400">Noch keine Kategorien angelegt.</p>
        </div>
      )}
    </div>
  );
};

export default CategoryEditor;
