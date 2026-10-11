import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from '@/lib/api';

export type Settings = Record<string, string>;
const fallback: Settings = {
  school_name: 'WP/MT/Meegahathanna Primary College', school_name_si: 'මීගහතැන්න ප්‍රාථමික විද්‍යාලය',
  tagline: 'Small steps. Bright futures.', address: 'Meegahathanna, Sri Lanka', phone: '', email: '',
  office_hours: 'Monday to Friday, 7:30 AM - 1:30 PM', principal: '', admissions_open: '1',
};
const Ctx = createContext<Settings>(fallback);
export const useSettings = () => useContext(Ctx);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { data } = useApi<{ settings: Settings }>('/api/public/settings');
  return <Ctx.Provider value={{ ...fallback, ...(data?.settings ?? {}) }}>{children}</Ctx.Provider>;
}
