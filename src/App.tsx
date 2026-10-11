import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, type Role } from '@/context/AuthContext';
import { SchoolProvider } from '@/context/SchoolContext';
import PublicLayout from '@/components/PublicLayout';
import { Loading } from '@/components/ui';
import Home from '@/pages/public/Home';
import About from '@/pages/public/About';
import Classes from '@/pages/public/Classes';
import Teachers from '@/pages/public/Teachers';
import Events from '@/pages/public/Events';
import Gallery from '@/pages/public/Gallery';
import News from '@/pages/public/News';
import Admissions from '@/pages/public/Admissions';
import AdmissionMap from '@/pages/public/AdmissionMap';
import Contact from '@/pages/public/Contact';
import Login from '@/pages/public/Login';
import ParentLayout, { ParentBody } from '@/pages/parent/ParentLayout';
import { ParentOverview, ParentResults, ParentAttendance, ParentEvents } from '@/pages/parent/ParentPages';
import TeacherLayout, { TeacherBody } from '@/pages/teacher/TeacherLayout';
import { TeacherOverview, TeacherAttendance, TeacherResults } from '@/pages/teacher/TeacherPages';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverview from '@/pages/admin/AdminOverview';
import Students from '@/pages/admin/Students';
import AdminTeachers from '@/pages/admin/Teachers';
import ManageContent from '@/pages/admin/ManageContent';
import { AdminAdmissions, AdminMessages } from '@/pages/admin/Inbox';
import Accounts from '@/pages/admin/Accounts';
import SettingsPage from '@/pages/admin/SettingsPage';

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SchoolProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="classes" element={<Classes />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="events" element={<Events />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="news" element={<News />} />
              <Route path="admissions" element={<Admissions />} />
              <Route path="admission-map" element={<AdmissionMap />} />
              <Route path="contact" element={<Contact />} />
              <Route path="login" element={<Login />} />
            </Route>

            <Route path="/parent" element={<RequireRole role="Parent"><ParentLayout /></RequireRole>}>
              <Route element={<ParentBody />}>
                <Route index element={<ParentOverview />} />
                <Route path="results" element={<ParentResults />} />
                <Route path="attendance" element={<ParentAttendance />} />
                <Route path="events" element={<ParentEvents />} />
              </Route>
            </Route>

            <Route path="/teacher" element={<RequireRole role="Teacher"><TeacherLayout /></RequireRole>}>
              <Route element={<TeacherBody />}>
                <Route index element={<TeacherOverview />} />
                <Route path="attendance" element={<TeacherAttendance />} />
                <Route path="results" element={<TeacherResults />} />
              </Route>
            </Route>

            <Route path="/admin" element={<RequireRole role="Admin"><AdminLayout /></RequireRole>}>
              <Route index element={<AdminOverview />} />
              <Route path="students" element={<Students />} />
              <Route path="teachers" element={<AdminTeachers />} />
              <Route path="events" element={<ManageContent kind="events" />} />
              <Route path="news" element={<ManageContent kind="news" />} />
              <Route path="gallery" element={<ManageContent kind="gallery" />} />
              <Route path="admissions" element={<AdminAdmissions />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SchoolProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
