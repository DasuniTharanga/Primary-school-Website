import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, CalendarCheck, CalendarDays } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { useApi } from '@/lib/api';
import { ErrorBox, Loading } from '@/components/ui';

export interface ParentCtx { data: any; child: any; childId: number | null; setChildId: (id: number) => void }
export const useParent = () => useOutletContext<ParentCtx>();

function Body() {
  const { data, error, loading, reload } = useApi<any>('/api/parent/dashboard');
  const [childId, setChildId] = useState<number | null>(null);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const child = data.children.find((c: any) => c.id === childId) ?? data.children[0] ?? null;
  return <Outlet context={{ data, child, childId: child?.id ?? null, setChildId } satisfies ParentCtx} />;
}

export default function ParentLayout() {
  return (
    <DashboardShell roleLabel="Parent portal" groups={[{ label: 'My children', items: [
      { to: '/parent', label: 'Overview', icon: <LayoutDashboard size={18} />, end: true },
      { to: '/parent/results', label: 'Results', icon: <GraduationCap size={18} /> },
      { to: '/parent/attendance', label: 'Attendance', icon: <CalendarCheck size={18} /> },
      { to: '/parent/events', label: 'Events & news', icon: <CalendarDays size={18} /> },
    ] }]} />
  );
}
export { Body as ParentBody };
