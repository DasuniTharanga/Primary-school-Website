import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSchool } from '@/context/SchoolContext';
export default function ScrollToTop() {
  const { pathname } = useLocation(),
    { settings } = useSchool();
  useEffect(() => {
    window.scrollTo(0, 0);
    const title =
      pathname === '/'
        ? 'Welcome'
        : pathname.split('/').filter(Boolean).join(' · ').replace(/-/g, ' ');
    document.title = `${title.charAt(0).toUpperCase() + title.slice(1)} | ${settings.shortName}`;
  }, [pathname, settings.shortName]);
  return null;
}
