import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Footer: React.FC = () => {
  const { settings } = useAppContext();

  if (!settings) return null;

  return (
    <footer className="bg-neutral-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <h2 className="text-3xl font-black italic text-white tracking-tighter">
              Capri
            </h2>
            <p className="text-gray-400 text-xs uppercase tracking-widest opacity-60">
              © {new Date().getFullYear()} Gelateria Capri. Tutti i diritti riservati.
            </p>
            <div className="flex space-x-4">
              {settings.socialMedia.facebook && (
                <a href={settings.socialMedia.facebook} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-xs hover:bg-brand-green hover:border-brand-green transition-colors">
                  FB
                </a>
              )}
              {settings.socialMedia.instagram && (
                <a href={settings.socialMedia.instagram} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-xs hover:bg-brand-red hover:border-brand-red transition-colors">
                  IG
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-white">Rechtliches</h3>
            <ul className="space-y-4 text-gray-400 text-[11px] uppercase tracking-wider font-sans">
              <li><Link to="/legal/impressum" className="hover:text-brand-red transition-colors">Impressum</Link></li>
              <li><Link to="/legal/datenschutz" className="hover:text-brand-red transition-colors">Datenschutz</Link></li>
              <li><Link to="/legal/cookies" className="hover:text-brand-red transition-colors">Cookies</Link></li>
              <li><Link to="/legal/haftung" className="hover:text-brand-red transition-colors">Haftung</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-white">Kontakt</h3>
            <ul className="space-y-4 text-gray-400 text-xs font-sans">
              <li className="flex items-start space-x-3">
                <MapPin size={16} className="text-brand-green shrink-0" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={16} className="text-brand-green shrink-0" />
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={16} className="text-brand-green shrink-0" />
                <span>{settings.email}</span>
              </li>
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-white">Öffnungszeiten</h3>
            <div className="flex items-start space-x-3 text-gray-400 text-xs font-sans">
              <Clock size={16} className="text-brand-green shrink-0" />
              <div className="whitespace-pre-line uppercase tracking-wider leading-loose">
                {settings.hours}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-neutral-800 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Eiscafé Capri. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
