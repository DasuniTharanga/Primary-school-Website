import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export type Role = 'Admin' | 'Teacher' | 'Parent';
export interface User { id: number; email: string; role: Role; name: string; teacherId: number | null; guardianId: number | null }
interface Ctx { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; logout: () => Promise<void> }

const AuthContext = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthContext);
export const homeFor = (role: Role) => (role === 'Admin' ? '/admin' : role === 'Teacher' ? '/teacher' : '/parent');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ user: User | null }>('/api/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const r = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: { email, password } });
    setUser(r.user);
    return r.user;
  };
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
