import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from './ui';

export interface SideItem { to: string; label: string; icon: ReactNode; end?: boolean; count?: number }
export interface SideGroup { label?: string; items: SideItem[] }

export default function DashboardShell({ groups, roleLabel, context }: { groups: SideGroup[]; roleLabel: string; context?: unknown }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { pathname: rawPath } = useLocation();
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const current = groups.flatMap((g) => g.items).filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to))).sort((a, b) => b.to.length - a.to.length)[0];
  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={`${roleLabel} navigation`}>
        <Link to="/" className="brand"><img src="/logo.png" alt="" /><div><strong>Meegahathanna</strong><small>{roleLabel}</small></div></Link>
        {groups.map((g, i) => (
          <div key={i}>
            {g.label && <div className="side-label">{g.label}</div>}
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
                {it.icon}<span>{it.label}</span>{!!it.count && <span className="count">{it.count}</span>}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="side-foot">
          <Link to="/" className="side-link"><Globe size={18} /> Public website</Link>
          <button className="side-link" style={{ border: 0, background: 'none', cursor: 'pointer', width: '100%' }}
            onClick={async () => { await logout(); navigate('/login'); }}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="side-toggle" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <h1>{current?.label ?? roleLabel}</h1>
          <div className="user"><div><b>{user?.name}</b><small>{roleLabel}</small></div><Avatar name={user?.name ?? '?'} size="sm" /></div>
        </header>
        <div className="content"><Outlet context={context} /></div>
      </div>
    </div>
  );
}
