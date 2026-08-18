import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => setIsVisible(true), 2000);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setIsVisible(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookie-consent', 'necessary');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-4"
        >
          <div className="max-w-4xl mx-auto bg-neutral-900 text-white p-6 rounded-2xl shadow-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-brand-green/20 text-brand-green rounded-lg shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase tracking-widest">Wir schätzen Ihre Privatsphäre</p>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Wir verwenden Cookies, um Ihr Erlebnis zu verbessern. Weitere Informationen finden Sie in unserer{' '}
                  <Link to="/legal/datenschutz" className="text-brand-red hover:underline">Datenschutzerklärung</Link>.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button 
                onClick={acceptNecessary}
                className="flex-1 md:flex-none px-6 py-2 text-[10px] font-bold uppercase tracking-widest border border-neutral-700 rounded-full hover:bg-neutral-800 transition-colors"
              >
                Nur Notwendige
              </button>
              <button 
                onClick={acceptAll}
                className="flex-1 md:flex-none px-6 py-2 text-[10px] font-bold uppercase tracking-widest bg-brand-red text-white rounded-full hover:bg-red-800 transition-colors shadow-lg"
              >
                Alle akzeptieren
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
