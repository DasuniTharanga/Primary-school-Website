import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { NAV_LINKS } from '@/data';
import { useSchool } from '@/context/SchoolContext';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false),
    { settings } = useSchool(),
    { user } = useAuth(),
    location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="topbar">
        <div className="container">
          <span>{settings.sinhalaName}</span>
          <Link to={user ? '/admin' : '/login'}>
            <ShieldCheck size={13} />
            {user ? 'Staff dashboard' : 'Staff login'}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="school-mark" aria-label={settings.name}>
            <img src={settings.logoImage || '/crest.svg'} alt="" width="48" height="56" />
            <div>
              <span className="school-prefix">WP / MT</span>
              <strong>{settings.shortName}</strong>
            </div>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <NavLink end={link.path === '/'} key={link.path} to={link.path}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Link className="header-contact" to="/admissions">
            Admissions
            <ArrowUpRight size={15} />
          </Link>
          <button
            className="icon-button menu-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav
            className="mobile-nav container"
            id="mobile-navigation"
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink key={link.path} end={link.path === '/'} to={link.path}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/notices">School notices</NavLink>
            <NavLink to="/resources">Resources</NavLink>
            <NavLink to="/admissions">Admissions</NavLink>
          </nav>
        )}
      </header>
    </>
  );
}
