import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  activeIndex: number;
  alt: string;
  open: boolean;
  onClose: () => void;
  onChange: (index: number) => void;
}

export default function ImageLightbox({ images, activeIndex, alt, open, onClose, onChange }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChange(Math.max(0, activeIndex - 1));
      if (e.key === "ArrowRight") onChange(Math.min(images.length - 1, activeIndex + 1));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, activeIndex, images.length, onClose, onChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 md:p-10"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 text-white/60 hover:text-white z-10"
            aria-label="Close"
          >
            <X size={32} strokeWidth={1} />
          </button>

          {images.length > 1 && activeIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(activeIndex - 1); }}
              className="absolute left-4 md:left-8 p-3 text-white/60 hover:text-white z-10"
              aria-label="Previous"
            >
              <ChevronLeft size={36} strokeWidth={1} />
            </button>
          )}

          {images.length > 1 && activeIndex < images.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(activeIndex + 1); }}
              className="absolute right-4 md:right-8 p-3 text-white/60 hover:text-white z-10"
              aria-label="Next"
            >
              <ChevronRight size={36} strokeWidth={1} />
            </button>
          )}

          <motion.img
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            src={images[activeIndex]}
            alt={alt}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <p className="absolute bottom-6 text-[10px] tracking-widest uppercase text-white/40">
              {activeIndex + 1} / {images.length}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
