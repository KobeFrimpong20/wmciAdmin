import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_UNAUTHORIZED_EVENT,
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from '../api/client';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [role, setRole] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(() => Boolean(getStoredAuthToken()));

  const clearSession = useCallback(() => {
    clearStoredAuthToken();
    setToken(null);
    setRole(null);
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    const initialToken = getStoredAuthToken();
    if (!initialToken) {
      return;
    }

    let isMounted = true;

    const verifySession = async () => {
      try {
        const session = await authApi.getSession();
        if (isMounted) {
          setToken(initialToken);
          setRole(session.role);
        }
      } catch {
        if (isMounted) {
          clearStoredAuthToken();
          setToken(null);
          setRole(null);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_STORAGE_KEY && !event.newValue) {
        clearSession();
      }
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearSession]);

  const login = useCallback(async (password: string) => {
    const response = await authApi.login(password);
    setStoredAuthToken(response.token);
    setToken(response.token);
    setRole(response.role);
    setIsInitializing(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      isAdmin: Boolean(token && role === 'admin'),
      isInitializing,
      login,
      logout: clearSession,
    }),
    [token, role, isInitializing, login, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
