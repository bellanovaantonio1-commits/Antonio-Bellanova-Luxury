import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 p-3 bg-brand-green text-white rounded-full shadow-xl hover:bg-emerald-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 border border-white/20"
          aria-label="Nach oben scrollen"
        >
          <ChevronUp size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
