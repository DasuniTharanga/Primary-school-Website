import { Outlet, useOutletContext } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, PenLine } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { useApi } from '@/lib/api';
import { ErrorBox, Loading } from '@/components/ui';

export interface TeacherCtx { data: any; reload: () => void }
export const useTeacher = () => useOutletContext<TeacherCtx>();

export function TeacherBody() {
  const { data, error, loading, reload } = useApi<any>('/api/teacher/dashboard');
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return <Outlet context={{ data, reload } satisfies TeacherCtx} />;
}

export default function TeacherLayout() {
  return (
    <DashboardShell roleLabel="Teacher portal" groups={[{ label: 'My classroom', items: [
      { to: '/teacher', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
      { to: '/teacher/attendance', label: 'Attendance', icon: <ClipboardCheck size={18} /> },
      { to: '/teacher/results', label: 'Enter marks', icon: <PenLine size={18} /> },
    ] }]} />
  );
}
