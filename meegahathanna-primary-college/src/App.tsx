import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import ScrollToTop from '@/components/ScrollToTop';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Classes from '@/pages/Classes';
import Teachers from '@/pages/Teachers';
import Events from '@/pages/Events';
import Gallery from '@/pages/Gallery';
import Contact from '@/pages/Contact';
import Login from '@/pages/Login';
import Admissions from '@/pages/Admissions';
import { Notices, Resources, ContentDetails, Privacy, NotFound } from '@/pages/Information';
import { SchoolProvider } from '@/context/SchoolContext';
import { AuthProvider } from '@/context/AuthContext';
import AdminLayout from '@/admin/AdminLayout';
import Dashboard from '@/admin/Dashboard';
import ContentManager from '@/admin/ContentManager';
import Inbox from '@/admin/Inbox';
import SettingsPage from '@/admin/SettingsPage';
import { UsersPage, AuditPage, AccountPage } from '@/admin/Staff';

export default function App() {
  return (
    <BrowserRouter>
      <SchoolProvider>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<ContentDetails kind="events" />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/notices/:id" element={<ContentDetails kind="notices" />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="content/:kind" element={<ContentManager />} />
              <Route path="messages" element={<Inbox type="messages" />} />
              <Route path="admissions" element={<Inbox type="admissions" />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </SchoolProvider>
    </BrowserRouter>
  );
}
