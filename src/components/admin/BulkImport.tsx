import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const BulkImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const processImport = async () => {
    if (!file) return;

    setUploading(true);
    setStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          let importedCount = 0;

          // Get existing categories to avoid duplicates and map names to IDs if needed
          const categoriesSnapshot = await getDocs(collection(db, 'categories'));
          const existingCategories = new Map(categoriesSnapshot.docs.map(doc => [doc.data().name.toLowerCase(), doc.id]));

          for (const row of data) {
            const { name, category, price, description, image } = row;

            if (!name || !category || !price) continue;

            // Ensure category exists
            let categoryName = category.trim();
            if (!existingCategories.has(categoryName.toLowerCase())) {
              const newCatRef = await addDoc(collection(db, 'categories'), {
                name: categoryName,
                order: existingCategories.size
              });
              existingCategories.set(categoryName.toLowerCase(), newCatRef.id);
            }

            // Add menu item
            await addDoc(collection(db, 'menu'), {
              name: name.trim(),
              category: categoryName,
              price: parseFloat(price.replace(',', '.')),
              description: description?.trim() || '',
              image: image?.trim() || '',
              order: importedCount,
              createdAt: serverTimestamp()
            });

            importedCount++;
          }

          setStatus({
            type: 'success',
            message: `${importedCount} Artikel erfolgreich importiert.`
          });
          setFile(null);
        } catch (err) {
          console.error("Import error:", err);
          setStatus({
            type: 'error',
            message: 'Fehler beim Importieren der Daten. Bitte überprüfen Sie das Format.'
          });
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        console.error("Parsing error:", error);
        setStatus({
          type: 'error',
          message: 'Fehler beim Lesen der CSV-Datei.'
        });
        setUploading(false);
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-neutral-900">Bulk Import</h2>
        <p className="text-neutral-500">Importieren Sie Kategorien und Artikel über eine CSV-Datei.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
            <h3 className="font-bold text-neutral-800 mb-4 flex items-center">
              <FileText size={18} className="mr-2 text-brand-green" />
              CSV-Format Anleitung
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Ihre CSV-Datei sollte folgende Spalten enthalten:
            </p>
            <code className="block p-3 bg-neutral-900 text-emerald-400 text-xs rounded-lg mb-4">
              name,category,price,description,image
            </code>
            <ul className="text-xs text-neutral-500 space-y-2 list-disc pl-4">
              <li><strong>name:</strong> Name des Artikels (Pflicht)</li>
              <li><strong>category:</strong> Kategorie (Pflicht, wird erstellt falls neu)</li>
              <li><strong>price:</strong> Preis in Euro (Pflicht, z.B. 4.50 oder 4,50)</li>
              <li><strong>description:</strong> Kurze Beschreibung (Optional)</li>
              <li><strong>image:</strong> Bild-URL (Optional)</li>
            </ul>
          </div>

          <div className="relative group">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={cn(
              "p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all",
              file 
                ? "border-brand-green bg-emerald-50/50" 
                : "border-neutral-200 hover:border-brand-green/50 bg-neutral-50/50"
            )}>
              <Upload size={40} className={cn("mb-4", file ? "text-brand-green" : "text-neutral-300")} />
              <p className="text-sm font-bold text-neutral-700">
                {file ? file.name : "Klicken oder CSV-Datei hierher ziehen"}
              </p>
              {!file && <p className="text-xs text-neutral-400 mt-2">Nur .csv Dateien</p>}
            </div>
          </div>

          <button
            onClick={processImport}
            disabled={!file || uploading}
            className={cn(
              "w-full py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center space-x-2",
              file && !uploading
                ? "bg-brand-green text-white shadow-lg hover:bg-emerald-900"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verarbeite...</span>
              </>
            ) : (
              <span>Import starten</span>
            )}
          </button>

          {status && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-xl flex items-start space-x-3",
                status.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-brand-red"
              )}
            >
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="text-sm font-medium">{status.message}</span>
            </motion.div>
          )}
        </div>

        <div className="hidden lg:block bg-neutral-50 rounded-3xl p-8 border border-neutral-100">
          <h3 className="font-bold text-neutral-800 mb-6 font-serif">Vorschau Beispiel</h3>
          <div className="space-y-4">
            {[
              { name: 'Spaghetti Eis', cat: 'Eisbecher', price: '7.50' },
              { name: 'Tartufo', cat: 'Eisbecher', price: '8.00' },
              { name: 'Espresso', cat: 'Warme Getränke', price: '2.50' }
            ].map((ex, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-neutral-900">{ex.name}</p>
                  <p className="text-[10px] uppercase text-neutral-400 tracking-wider font-bold">{ex.cat}</p>
                </div>
                <span className="font-bold text-brand-red">{ex.price}€</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
