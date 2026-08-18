import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { Loader2 } from 'lucide-react';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  if (!user || user.email !== 'antoniobellanova1812@gmail.com') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
