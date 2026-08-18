import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { GalleryImage } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, Loader2 } from 'lucide-react';

const Gallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
      setImages(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-4">Galerie</h1>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Ein visueller Rundgang durch unser Eiscafé und unsere Kreationen.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <motion.div
            key={img.id}
            layoutId={img.id}
            className="relative group cursor-pointer aspect-square rounded-2xl overflow-hidden bg-neutral-100"
            onClick={() => setSelectedImage(img)}
            whileHover={{ scale: 0.98 }}
          >
            <img src={img.url} alt={img.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="text-white" size={32} />
            </div>
          </motion.div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="text-center py-20 text-neutral-400">
          Noch keine Bilder in der Galerie vorhanden.
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white hover:text-rose-500 transition-colors">
              <X size={40} />
            </button>
            <motion.div
              layoutId={selectedImage.id}
              className="max-w-5xl w-full max-h-[85vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedImage.url} alt={selectedImage.caption} className="w-full h-full object-contain rounded-lg" />
              {selectedImage.caption && (
                <div className="absolute bottom-[-40px] left-0 right-0 text-center text-white font-medium">
                  {selectedImage.caption}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
