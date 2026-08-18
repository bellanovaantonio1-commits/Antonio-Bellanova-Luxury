import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Search, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface FailedSearch {
  id: string;
  query: string;
  timestamp: any;
  category: string;
}

const SearchAnalytics: React.FC = () => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [recentSearches, setRecentSearches] = useState<FailedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'failed_searches'), orderBy('timestamp', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const searches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FailedSearch));

      setRecentSearches(searches.slice(0, 10));

      // Aggregate counts
      const counts: Record<string, number> = {};
      searches.forEach(s => {
        const term = s.query.toLowerCase().trim();
        counts[term] = (counts[term] || 0) + 1;
      });

      const chartData = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8

      setData(chartData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const COLORS = ['#00442c', '#c41e3a', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#6b7280'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-brand-green" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-emerald-50 rounded-2xl text-brand-green">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-neutral-900">Such-Trends</h2>
            <p className="text-neutral-500">Häufigste Suchbegriffe ohne Treffer.</p>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={80}
                stroke="#94a3b8"
                fontSize={12}
                fontWeight={500}
              />
              <YAxis stroke="#94a3b8" fontSize={12} fontWeight={500} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-neutral-100 rounded-xl text-neutral-500">
              <Clock size={20} />
            </div>
            <h3 className="text-xl font-serif font-bold text-neutral-900">Kürzliche Fehlversuche</h3>
          </div>
          
          <div className="space-y-4">
            {recentSearches.map((search) => (
              <div key={search.id} className="flex justify-between items-center p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div>
                  <p className="font-bold text-neutral-800">"{search.query}"</p>
                  <p className="text-[10px] uppercase text-neutral-400 tracking-wider font-bold">
                    Kategorie: {search.category === 'all' ? 'Alle' : search.category}
                  </p>
                </div>
                <span className="text-[10px] text-neutral-400 bg-white px-2 py-1 rounded-md border border-neutral-100">
                  {search.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {recentSearches.length === 0 && (
              <p className="text-center py-8 text-neutral-400 text-sm">Noch keine Daten vorhanden.</p>
            )}
          </div>
        </div>

        <div className="bg-brand-green/5 rounded-3xl p-8 border border-brand-green/10 flex flex-col justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-sm w-fit mb-6">
            <Search className="text-brand-green" size={32} />
          </div>
          <h3 className="text-2xl font-serif font-bold text-neutral-900 mb-4">Potenzial erkennen</h3>
          <p className="text-neutral-600 leading-relaxed">
            Diese Daten helfen Ihnen zu verstehen, wonach Ihre Kunden suchen, was Sie aktuell nicht im Sortiment haben. 
            Nutzen Sie diese Erkenntnisse, um Ihre Speisekarte zu optimieren oder saisonale Angebote zu planen.
          </p>
          <div className="mt-8 flex items-center space-x-2 text-brand-green font-bold text-sm uppercase tracking-widest">
            <TrendingUp size={16} />
            <span>Kundenorientiert wachsen</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchAnalytics;
