import { createContext, useContext } from 'react';

export interface AuthContextValue {
  token: string | null;
  role: string | null;
  isAdmin: boolean;
  isInitializing: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
