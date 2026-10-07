import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from '@/lib/hooks';
import { SCHOOL_NAME } from '@/data';
import type { Settings, Kind } from '@/types';

const fallback: Settings = {
  name: SCHOOL_NAME,
  sinhalaName: 'මීගහතැන්න ප්‍රාථමික විද්‍යාලය',
  shortName: 'Meegahathanna Primary College',
  tagline: 'Small steps. Bright futures.',
  address: 'Meegahathanna, Sri Lanka',
  phone: '',
  email: '',
  hours: '',
  about: '',
  vision: '',
  mission: '',
  principalName: '',
  principalMessage: '',
  heroImage: '',
  logoImage: '',
  admissionsOpen: false,
  version: 1,
};
const Context = createContext({
  settings: fallback,
  counts: {} as Partial<Record<Kind, number>>,
  loading: true,
  error: '',
  reload: () => {},
});
export function SchoolProvider({ children }: { children: ReactNode }) {
  const resource = useApi<{ settings: Settings; counts: Partial<Record<Kind, number>> }>(
    '/api/site',
  );
  return (
    <Context.Provider
      value={{
        settings: resource.data?.settings || fallback,
        counts: resource.data?.counts || {},
        loading: resource.loading,
        error: resource.error,
        reload: resource.reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSchool = () => useContext(Context);
