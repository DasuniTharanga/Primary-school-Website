import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, messageOf, setCsrfToken } from '@/lib/api';
import type { Session, User } from '@/types';

interface Auth {
  user: User | null;
  checked: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [checked, setChecked] = useState(false),
    [error, setError] = useState('');
  const apply = useCallback((session: Session) => {
    setUser(session.user);
    setCsrfToken(session.csrfToken);
    setChecked(true);
    setError('');
  }, []);
  const refresh = useCallback(async () => {
    setChecked(false);
    try {
      apply(await api<Session>('/api/auth/session'));
    } catch (e) {
      setError(messageOf(e));
      setChecked(true);
    }
  }, [apply]);
  useEffect(() => {
    void refresh();
    const expired = () => apply({ user: null, csrfToken: '' });
    window.addEventListener('school:unauthorized', expired);
    return () => window.removeEventListener('school:unauthorized', expired);
  }, [refresh, apply]);
  const login = async (email: string, password: string) =>
    apply(await api<Session>('/api/auth/login', { method: 'POST', body: { email, password } }));
  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST', body: {} });
    apply({ user: null, csrfToken: '' });
  };
  return (
    <Context.Provider value={{ user, checked, error, refresh, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('AuthProvider is missing');
  return ctx;
}
