import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithSwegrowth: () => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
