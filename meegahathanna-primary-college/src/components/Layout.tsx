import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { Alert } from './ui';
import { useSchool } from '@/context/SchoolContext';

export default function Layout() {
  const { error, reload } = useSchool();
  return (
    <div className="site-layout">
      <Navbar />
      {error && (
        <div className="container global-alert">
          <Alert onRetry={reload}>{error}</Alert>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
