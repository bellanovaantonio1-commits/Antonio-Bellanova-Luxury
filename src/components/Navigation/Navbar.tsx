import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { cn } from '../../lib/utils';

const Navbar: React.FC = () => {
  const { settings, navItems } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery === '241100') {
      navigate('/admin/login');
      setSearchQuery('');
    } else {
      // Standard search logic could go here
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "bg-white/90 backdrop-blur-md shadow-md py-2" : "bg-transparent py-4"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            {settings?.logo ? (
              <img src={settings.logo} alt={settings.name} className="h-10 w-auto" />
            ) : (
              <span className="text-3xl font-black tracking-tighter text-brand-green" style={{ fontVariant: 'small-caps' }}>
                Capri
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.sort((a, b) => a.order - b.order).map((item) => (
              <div key={item.id} className="relative group">
                <Link
                  to={item.path}
                  className={cn(
                    "text-xs font-medium uppercase tracking-[0.2em] transition-colors hover:text-brand-red",
                    location.pathname === item.path ? "text-brand-red border-b-2 border-brand-red pb-1" : "text-gray-700"
                  )}
                >
                  {item.label}
                </Link>
                {item.subItems && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.id}
                        to={sub.path}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Search & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Suche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 bg-gray-100 rounded-full text-xs w-48 focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
              />
              <Search className="absolute left-2.5 top-2 h-3 w-3 text-gray-400" />
            </form>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-brand-green"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 px-3">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Suche..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
