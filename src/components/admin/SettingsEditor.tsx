import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Settings } from '../../types';
import { Save, Loader2, Check } from 'lucide-react';

const SettingsEditor: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as Settings);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'general'), { ...settings });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin text-emerald-600 mx-auto" />;
  if (!settings) return <div>Keine Einstellungen gefunden.</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Allgemeine Einstellungen</h1>
          <p className="text-neutral-500">Kontaktdaten, Öffnungszeiten und Branding.</p>
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

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Kontaktdaten</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Name des Eiscafés</label>
              <input 
                type="text" 
                value={settings.name} 
                onChange={e => setSettings({...settings, name: e.target.value})}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Adresse</label>
              <input 
                type="text" 
                value={settings.address} 
                onChange={e => setSettings({...settings, address: e.target.value})}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Telefon</label>
              <input 
                type="text" 
                value={settings.phone} 
                onChange={e => setSettings({...settings, phone: e.target.value})}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">E-Mail</label>
              <input 
                type="email" 
                value={settings.email} 
                onChange={e => setSettings({...settings, email: e.target.value})}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Öffnungszeiten & Social</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Öffnungszeiten (pro Zeile)</label>
              <textarea 
                rows={4}
                value={settings.hours} 
                onChange={e => setSettings({...settings, hours: e.target.value})}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook URL</label>
              <input 
                type="text" 
                value={settings.socialMedia.facebook || ''} 
                onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, facebook: e.target.value}})}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram URL</label>
              <input 
                type="text" 
                value={settings.socialMedia.instagram || ''} 
                onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, instagram: e.target.value}})}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsEditor;
