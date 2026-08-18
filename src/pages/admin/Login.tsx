import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('E-Mail/Passwort-Anmeldung ist nicht aktiviert. Bitte nutzen Sie Google Login.');
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError('Anmeldung mit Google fehlgeschlagen.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-neutral-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-neutral-900">Admin Login</h1>
          <p className="text-neutral-500 text-sm">Bitte melden Sie sich an, um fortzufahren.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl flex items-center text-sm">
            <AlertCircle size={18} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Benutzername (E-Mail)</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="admin@eiscafecapri.de"
              />
              <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Passwort</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-green text-white rounded-xl font-bold hover:bg-emerald-900 transition-colors flex items-center justify-center disabled:opacity-70 uppercase text-xs tracking-widest shadow-lg"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="px-2 bg-white text-neutral-400">Oder</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-6 w-full py-4 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-bold hover:bg-neutral-50 transition-colors flex items-center justify-center disabled:opacity-70 uppercase text-xs tracking-widest shadow-sm"
        >
          <LogIn size={18} className="mr-2" />
          Mit Google anmelden
        </button>
      </motion.div>
    </div>
  );
};

export default Login;
