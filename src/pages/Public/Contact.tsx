import React from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';

const Contact: React.FC = () => {
  const { settings } = useAppContext();

  if (!settings) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-4">Kontakt & Anfahrt</h1>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Haben Sie Fragen oder möchten Sie eine Reservierung vornehmen? Wir sind gerne für Sie da.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Info & Form */}
        <div className="space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 font-serif">Adresse</h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-sans">{settings.address}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-brand-red/10 text-brand-red rounded-xl">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 font-serif">Telefon</h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-sans">{settings.phone}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 font-serif">E-Mail</h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-sans">{settings.email}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 font-serif">Öffnungszeiten</h3>
                <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-line font-sans uppercase tracking-wider text-[10px]">{settings.hours}</p>
              </div>
            </div>
          </div>

          <form className="bg-white p-8 rounded-3xl shadow-lg border border-neutral-100 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Vorname</label>
                <input type="text" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Nachname</label>
                <input type="text" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">E-Mail Adresse</label>
              <input type="email" className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Nachricht</label>
              <textarea rows={4} className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"></textarea>
            </div>
            <button type="submit" className="w-full py-4 bg-brand-green text-white rounded-xl font-bold hover:bg-emerald-900 transition-colors flex items-center justify-center uppercase text-xs tracking-widest shadow-lg">
              Nachricht senden
              <Send size={18} className="ml-2" />
            </button>
          </form>
        </div>

        {/* Map Placeholder */}
        <div className="h-[400px] lg:h-auto min-h-[500px] bg-neutral-100 rounded-3xl overflow-hidden border border-neutral-200 shadow-inner relative group">
          <div className="absolute inset-0 flex items-center justify-center">
             {/* Note: Real Google Maps would be integrated here if a key was provided */}
             <div className="text-center p-8">
               <MapPin size={48} className="text-emerald-600 mx-auto mb-4" />
               <h3 className="text-xl font-bold mb-2">Unser Standort</h3>
               <p className="text-neutral-500">{settings.address}</p>
             </div>
          </div>
          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-emerald-600/5 group-hover:bg-transparent transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default Contact;
