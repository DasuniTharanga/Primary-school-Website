import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, GraduationCap, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useAuth, homeFor } from '@/context/AuthContext';
import { useSettings } from '@/context/SchoolContext';

export const NAV = [
  { label: 'Home', to: '/' }, { label: 'About', to: '/about' }, { label: 'Classes', to: '/classes' },
  { label: 'Teachers', to: '/teachers' }, { label: 'Events', to: '/events' }, { label: 'Gallery', to: '/gallery' },
  { label: 'News', to: '/news' }, { label: 'Admissions', to: '/admissions' }, { label: 'Area Map', to: '/admission-map' }, { label: 'Contact', to: '/contact' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const s = useSettings();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const portal = user ? { to: homeFor(user.role), label: 'My dashboard' } : { to: '/login', label: 'Login' };
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label={s.school_name}>
            <img src="/logo.png" alt="" />
            <div><strong>Meegahathanna</strong><small>Primary College</small></div>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{n.label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <Link to={portal.to} className="btn btn-ghost btn-sm"><LogIn size={15} /> {portal.label}</Link>
            {s.admissions_open === '1' && <Link to="/admissions" className="btn btn-primary btn-sm">Apply now</Link>}
          </div>
          <button className="menu-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label="Mobile">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{n.label}</NavLink>)}
            <Link to={portal.to} className="btn btn-primary">{portal.label}</Link>
          </nav>
        )}
      </header>
      <main id="main"><Outlet /></main>
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="brand"><GraduationCap color="#fff" /><div><strong>{s.school_name}</strong></div></div>
              <p style={{ marginTop: 14, maxWidth: 320 }}>{s.school_name_si}<br />{s.tagline}</p>
            </div>
            <div><h4>Explore</h4><ul>{NAV.slice(1, 6).map((n) => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}</ul></div>
            <div><h4>For families</h4><ul><li><Link to="/admissions">Admissions</Link></li><li><Link to="/admission-map">Admission area map</Link></li><li><Link to="/news">News</Link></li><li><Link to="/contact">Contact</Link></li><li><Link to="/login">School portal</Link></li></ul></div>
            <div><h4>Visit us</h4><ul>
              <li className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><MapPin size={16} /> {s.address}</li>
              {s.phone && <li className="row"><Phone size={16} /> {s.phone}</li>}
              {s.email && <li className="row"><Mail size={16} /> {s.email}</li>}
              <li className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><Clock size={16} /> {s.office_hours}</li>
            </ul></div>
          </div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} {s.school_name}</span><span>School management system</span></div>
        </div>
      </footer>
    </>
  );
}
