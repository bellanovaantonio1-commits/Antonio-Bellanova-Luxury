import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LegalPage } from '../../types';
import { Save, Loader2, Check } from 'lucide-react';

const LegalEditor: React.FC = () => {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState('impressum');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'legal'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalPage));
      setPages(data);
      
      const active = data.find(p => p.slug === activeSlug);
      if (active) {
        setContent(active.content);
        setTitle(active.title);
      } else {
        // Defaults for required pages
        const defaults: Record<string, {title: string, content: string}> = {
          'impressum': { title: 'Impressum', content: 'Angaben gemäß § 5 TMG...' },
          'datenschutz': { title: 'Datenschutzerklärung', content: 'Inhalt der Datenschutzerklärung...' },
          'cookies': { title: 'Cookie-Einstellungen', content: 'Informationen zu Cookies...' },
          'haftung': { title: 'Haftungsausschluss', content: 'Haftung für Inhalte...' },
        };
        if (defaults[activeSlug]) {
          setTitle(defaults[activeSlug].title);
          setContent(defaults[activeSlug].content);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [activeSlug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'legal', activeSlug), {
        title,
        slug: activeSlug,
        content
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin text-emerald-600 mx-auto" />;

  const tabs = [
    { slug: 'impressum', label: 'Impressum' },
    { slug: 'datenschutz', label: 'Datenschutz' },
    { slug: 'cookies', label: 'Cookies' },
    { slug: 'haftung', label: 'Haftung' },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Rechtstexte verwalten</h1>
          <p className="text-neutral-500">Inhalte für Impressum, Datenschutz etc. anpassen.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : success ? <Check size={20} /> : <Save size={20} />}
          <span>{success ? 'Gespeichert' : 'Speichern'}</span>
        </button>
      </header>

      <div className="flex space-x-2 border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            onClick={() => setActiveSlug(tab.slug)}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
              activeSlug === tab.slug 
                ? "border-emerald-600 text-emerald-600" 
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">Titel</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase mb-2">Inhalt</label>
          <textarea 
            rows={15}
            value={content} 
            onChange={e => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default LegalEditor;
