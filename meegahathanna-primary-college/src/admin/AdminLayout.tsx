import { useState, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  CalendarDays,
  Users,
  BookOpen,
  Image,
  FileText,
  Inbox,
  Settings,
  UserRound,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { Alert, Loading, Badge } from '@/components/ui';
import { messageOf } from '@/lib/api';

const contentLinks = [
  { to: 'content/notices', label: 'Notices', Icon: Bell },
  { to: 'content/events', label: 'Events', Icon: CalendarDays },
  { to: 'content/teachers', label: 'Teachers', Icon: Users },
  { to: 'content/classes', label: 'Classes', Icon: BookOpen },
  { to: 'content/gallery', label: 'Gallery', Icon: Image },
  { to: 'content/resources', label: 'Resources', Icon: FileText },
];
export default function AdminLayout() {
  const { user, checked, error, refresh, logout } = useAuth(),
    { settings } = useSchool(),
    location = useLocation();
  const [open, setOpen] = useState(false),
    [actionError, setError] = useState(''),
    [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  if (!checked)
    return (
      <div className="guard-screen">
        <Loading label="Checking your staff account…" />
      </div>
    );
  if (error)
    return (
      <div className="guard-screen">
        <Alert onRetry={() => void refresh()}>{error}</Alert>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  const admin = user.role === 'ADMIN';
  async function signOut() {
    setSigningOut(true);
    try {
      await logout();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        Skip to dashboard content
      </a>
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img src={settings.logoImage || '/crest.svg'} width="36" height="43" alt="" />
          <div>
            <strong>Meegahathanna</strong>
            <span>School staff portal</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
        <nav aria-label="Staff navigation">
          <NavLink end to="/admin">
            <LayoutDashboard size={18} />
            Overview
          </NavLink>
          <p className="sidebar-label">Website content</p>
          {contentLinks.map(({ to, label, Icon }) => (
            <NavLink key={to} to={`/admin/${to}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {admin && (
            <>
              <p className="sidebar-label">School office</p>
              <NavLink to="/admin/admissions">
                <UserRound size={18} />
                Admissions
              </NavLink>
              <NavLink to="/admin/messages">
                <Inbox size={18} />
                Messages
              </NavLink>
              <p className="sidebar-label">Administration</p>
              <NavLink to="/admin/users">
                <ShieldCheck size={18} />
                Staff accounts
              </NavLink>
              <NavLink to="/admin/settings">
                <Settings size={18} />
                School settings
              </NavLink>
              <NavLink to="/admin/audit">
                <ScrollText size={18} />
                Activity log
              </NavLink>
            </>
          )}
          <NavLink to="/admin/account">
            <UserRound size={18} />
            My account
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            View school website
          </Link>
          <button onClick={() => void signOut()} disabled={signingOut}>
            <LogOut size={17} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <button
              className="icon-button admin-menu-toggle"
              onClick={() => setOpen(!open)}
              aria-label="Toggle staff navigation"
              aria-expanded={open}
            >
              <Menu size={21} />
            </button>
            <span>School management</span>
          </div>
          <div className="admin-person">
            <span className="person-avatar">{user.name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <Badge>{admin ? 'Administrator' : 'Content editor'}</Badge>
            </div>
          </div>
        </header>
        <main className="admin-main" id="admin-main" tabIndex={-1}>
          {actionError && <Alert>{actionError}</Alert>}
          <Outlet />
        </main>
        <footer className="admin-footer">
          {settings.name}
          <span>School staff portal</span>
        </footer>
      </div>
    </div>
  );
}
