import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LegalPage } from '../../types';
import { Loader2, ArrowLeft } from 'lucide-react';

const Legal: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const unsub = onSnapshot(doc(db, 'legal', slug), (doc) => {
      if (doc.exists()) {
        setPage({ id: doc.id, ...doc.data() } as LegalPage);
      } else {
        setPage(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Seite nicht gefunden</h1>
        <p className="text-gray-600 mb-8">Die von Ihnen gesuchte Seite existiert leider nicht.</p>
        <Link to="/" className="text-emerald-600 flex items-center justify-center hover:underline">
          <ArrowLeft size={18} className="mr-2" />
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Link to="/" className="text-sm text-gray-500 flex items-center mb-8 hover:text-emerald-600 transition-colors">
        <ArrowLeft size={16} className="mr-1" />
        Startseite
      </Link>
      
      <h1 className="text-4xl font-serif font-bold text-neutral-900 mb-10">{page.title}</h1>
      
      <div className="prose prose-emerald max-w-none prose-headings:font-serif prose-headings:text-neutral-900 prose-p:text-neutral-600 prose-p:leading-relaxed">
        {page.content.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
};

export default Legal;
