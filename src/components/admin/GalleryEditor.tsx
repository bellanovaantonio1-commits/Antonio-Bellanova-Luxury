import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { GalleryImage } from '../../types';
import { Plus, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

const GalleryEditor: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    try {
      await addDoc(collection(db, 'gallery'), {
        url: newUrl,
        caption: newCaption,
        order: images.length
      });
      setNewUrl('');
      setNewCaption('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bild wirklich löschen?')) {
      await deleteDoc(doc(db, 'gallery', id));
    }
  };

  if (loading) return <Loader2 className="animate-spin text-emerald-600 mx-auto" />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Galerie verwalten</h1>
        <p className="text-neutral-500">Bilder hinzufügen und entfernen.</p>
      </header>

      <form onSubmit={handleAdd} className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">Bild URL</label>
          <input 
            type="text" 
            value={newUrl} 
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">Beschriftung (optional)</label>
          <input 
            type="text" 
            value={newCaption} 
            onChange={e => setNewCaption(e.target.value)}
            placeholder="Leckeres Erdbeereis"
            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button type="submit" className="bg-neutral-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center">
          <Plus size={20} className="mr-2" />
          Hinzufügen
        </button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map((img) => (
          <div key={img.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
            <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => handleDelete(img.id)}
                className="p-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full py-12 text-center text-neutral-400 flex flex-col items-center">
            <ImageIcon size={40} className="mb-4 opacity-20" />
            <p>Noch keine Bilder hochgeladen.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryEditor;
