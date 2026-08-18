import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MenuItem, Category } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { IceCream, Coffee, Cake, Loader2, Search, X, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.3 }}
    className="bg-white rounded-3xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-all group h-full flex flex-col"
  >
    {item.image && (
      <div className="h-48 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
    )}
    <div className="p-6 flex flex-col flex-grow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-neutral-900 font-serif">{item.name}</h3>
        <span className="text-brand-red font-bold font-sans">{item.price}€</span>
      </div>
      <p className="text-neutral-600 text-sm mb-4 leading-relaxed flex-grow">
        {item.description}
      </p>
      <div className="flex items-center text-xs text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full w-fit">
        {item.category.includes('Eis') && <IceCream size={14} className="mr-1" />}
        {item.category.includes('Getränke') && <Coffee size={14} className="mr-1" />}
        {(item.category === 'Waffeln' || item.category === 'Crêpe') && <Cake size={14} className="mr-1" />}
        {item.category}
      </div>
    </div>
  </motion.div>
);

const MenuSkeleton = () => (
  <div className="space-y-12 animate-pulse">
    <div className="flex flex-wrap justify-center gap-2 mb-12">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-10 w-24 bg-neutral-100 rounded-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white rounded-[2rem] p-6 border border-neutral-100">
          <div className="h-4 w-2/3 bg-neutral-100 rounded mb-4" />
          <div className="h-3 w-full bg-neutral-100 rounded mb-2" />
          <div className="h-3 w-4/5 bg-neutral-100 rounded mb-6" />
          <div className="flex justify-between items-center">
            <div className="h-6 w-20 bg-neutral-100 rounded-full" />
            <div className="h-6 w-12 bg-neutral-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MenuPage: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const menuQ = query(collection(db, 'menu'), orderBy('order', 'asc'));
    const categoriesQ = query(collection(db, 'categories'), orderBy('order', 'asc'));

    let menuLoaded = false;
    let categoriesLoaded = false;

    const unsubMenu = onSnapshot(menuQ, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
      menuLoaded = true;
      if (categoriesLoaded) setLoading(false);
    });

    const unsubCategories = onSnapshot(categoriesQ, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
      categoriesLoaded = true;
      if (menuLoaded) setLoading(false);
    });

    return () => {
      unsubMenu();
      unsubCategories();
    };
  }, []);

  const categoryNames = ['all', ...categories.map(c => c.name)];

  const generatePDF = () => {
    const doc = new jsPDF();
    const title = "Eiscafé Capri - Speisekarte";
    
    // Header
    doc.setFont("serif", "bold");
    doc.setFontSize(24);
    doc.setTextColor(0, 68, 44); // brand-green
    doc.text(title, 105, 20, { align: 'center' });
    
    doc.setFont("sans", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Handwerkliche Perfektion seit 2001", 105, 28, { align: 'center' });
    doc.text("www.eiscafe-capri.de", 105, 33, { align: 'center' });

    let currentY = 45;

    categories.forEach((category) => {
      const categoryItems = items.filter(item => item.category === category.name);
      if (categoryItems.length === 0) return;

      // Check if we need a new page
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      autoTable(doc, {
        startY: currentY,
        head: [[category.name.toUpperCase(), 'Preis']],
        body: categoryItems.map(item => [
          { content: `${item.name}\n${item.description || ''}`, styles: { fontStyle: 'normal' } },
          `${item.price} €`
        ]),
        theme: 'plain',
        headStyles: { 
          fillColor: [248, 248, 248], 
          textColor: [0, 68, 44], 
          fontStyle: 'bold',
          fontSize: 12,
          cellPadding: 4
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 150 },
          1: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 },
        didDrawPage: (data) => {
          // Footer on each page
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Seite ${doc.getNumberOfPages()}`, 105, 285, { align: 'center' });
        }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save('Eiscafe_Capri_Speisekarte.pdf');
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Log failed searches
  useEffect(() => {
    if (searchQuery.trim().length > 2 && filteredItems.length === 0 && !loading) {
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
      
      logTimeoutRef.current = setTimeout(async () => {
        try {
          await addDoc(collection(db, 'failed_searches'), {
            query: searchQuery.trim(),
            timestamp: serverTimestamp(),
            category: activeCategory
          });
        } catch (err) {
          console.error("Failed to log search:", err);
        }
      }, 2000); // Wait 2 seconds of inactivity/empty state before logging
    }

    return () => {
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    };
  }, [searchQuery, filteredItems.length, loading, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-neutral-900 mb-4">Speisekarte</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto italic">
          Entdecken Sie unsere hausgemachten Köstlichkeiten, zubereitet nach traditionellen Familienrezepten.
        </p>
        <button
          onClick={generatePDF}
          className="mt-6 inline-flex items-center space-x-2 px-6 py-2.5 bg-neutral-900 text-white rounded-full font-bold hover:bg-neutral-800 transition-all shadow-md uppercase text-[10px] tracking-[0.2em]"
        >
          <Download size={16} />
          <span>Speisekarte als PDF</span>
        </button>
      </div>

      {loading ? (
        <MenuSkeleton />
      ) : (
        <>
          {/* Search and Category Container */}
          <div className="space-y-8 mb-12">
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-neutral-400 group-focus-within:text-brand-green transition-colors" size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suchen nach Eis, Waffeln..."
                className="w-full pl-12 pr-12 py-3 bg-white border border-neutral-100 rounded-2xl shadow-sm focus:ring-1 focus:ring-brand-green outline-none transition-all placeholder:text-neutral-300 font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-300 hover:text-brand-red transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap justify-center gap-2">
              {categoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setSearchQuery(''); // Reset search when category changes
                  }}
                  className={cn(
                    "px-6 py-2 rounded-full text-sm font-medium transition-all",
                    activeCategory === cat 
                      ? "bg-brand-green text-white shadow-md" 
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 uppercase tracking-widest text-[10px] font-bold"
                  )}
                >
                  {cat === 'all' ? 'Alle' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Sections */}
          <div className="space-y-16">
            <AnimatePresence mode="popLayout">
              {activeCategory === 'all' ? (
                categories.map((category) => {
                  const categoryItems = items.filter(item => item.category === category.name);
                  if (categoryItems.length === 0) return null;

                  return (
                    <motion.section 
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center space-x-4">
                        <h2 className="text-2xl font-serif font-bold text-neutral-900 whitespace-nowrap">
                          {category.name}
                        </h2>
                        <div className="h-px bg-neutral-100 flex-grow" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {categoryItems.map((item) => (
                          <MenuItemCard key={item.id} item={item} />
                        ))}
                      </div>
                    </motion.section>
                  );
                })
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {filteredItems.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {filteredItems.length === 0 && !loading && (
              <div className="text-center py-20 text-neutral-400">
                Keine Artikel in dieser Kategorie gefunden.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MenuPage;
