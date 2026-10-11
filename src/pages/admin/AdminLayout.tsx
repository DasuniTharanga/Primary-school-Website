import { useOutletContext } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, CalendarDays, Newspaper, Image, ClipboardList, MessageSquare, KeyRound, Settings } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { useApi } from '@/lib/api';

export interface AdminCtx { data: any; error: string; loading: boolean; reload: () => void }
export const useAdmin = () => useOutletContext<AdminCtx>();

export default function AdminLayout() {
  const { data, error, loading, reload } = useApi<any>('/api/admin/dashboard');
  const c = data?.counts;
  return (
    <DashboardShell roleLabel="Administrator" context={{ data, error, loading, reload } satisfies AdminCtx} groups={[
      { items: [{ to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true }] },
      { label: 'School', items: [
        { to: '/admin/students', label: 'Students', icon: <Users size={18} /> },
        { to: '/admin/teachers', label: 'Teachers', icon: <GraduationCap size={18} /> },
      ] },
      { label: 'Website content', items: [
        { to: '/admin/events', label: 'Events', icon: <CalendarDays size={18} /> },
        { to: '/admin/news', label: 'News', icon: <Newspaper size={18} /> },
        { to: '/admin/gallery', label: 'Gallery', icon: <Image size={18} /> },
      ] },
      { label: 'Inbox', items: [
        { to: '/admin/admissions', label: 'Admissions', icon: <ClipboardList size={18} />, count: c?.newAdmissions },
        { to: '/admin/messages', label: 'Messages', icon: <MessageSquare size={18} />, count: c?.newMessages },
      ] },
      { label: 'System', items: [
        { to: '/admin/accounts', label: 'Accounts', icon: <KeyRound size={18} /> },
        { to: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
      ] },
    ]} />
  );
}
