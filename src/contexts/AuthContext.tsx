import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.ts';
import { isAdminEmail } from '../config/admin.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  authError: string | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveRole(email: string | null | undefined, dbRole: string | null | undefined): string {
  if (isAdminEmail(email)) return "ADMIN";
  return dbRole || "CUSTOMER";
}

function getAuthErrorMessage(error: any): string {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") {
    return "Diese Domain ist in Firebase nicht erlaubt. Bitte 'localhost' in den Firebase Authorized Domains hinzufügen.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google-Anmeldung ist in Firebase nicht aktiviert.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup wurde blockiert. Bitte Popups für localhost erlauben oder Seite neu laden.";
  }
  return "Anmeldung fehlgeschlagen. Öffne die App über http://localhost:3000 (nicht 127.0.0.1) und prüfe die Firebase-Einstellungen.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      if (error?.code !== "auth/no-auth-event") {
        console.error("Redirect login failed", error);
        setAuthError(getAuthErrorMessage(error));
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setAuthError(null);
        const token = await user.getIdToken();
        try {
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setRole(resolveRole(user.email, data.role));
          } else {
            setRole(resolveRole(user.email, null));
          }
        } catch (e) {
          console.error("Sync failed", e);
          setRole(resolveRole(user.email, null));
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setAuthError(null);

    if (window.location.hostname === "127.0.0.1") {
      setAuthError("Bitte http://localhost:3000 öffnen (nicht 127.0.0.1) — sonst schlägt Google Login fehl.");
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === "auth/cancelled-popup-request" || error.code === "auth/popup-closed-by-user") {
        return;
      }
      // Popup often fails locally — fallback to full-page redirect
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/unauthorized-domain" ||
        error.code === "auth/invalid-action"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          console.error("Redirect login failed", redirectError);
          setAuthError(getAuthErrorMessage(redirectError));
          return;
        }
      }
      console.error("Login failed", error);
      setAuthError(getAuthErrorMessage(error));
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, authError, signIn, logout, clearAuthError: () => setAuthError(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
