import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Users, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { useAuth, homeFor } from '@/context/AuthContext';
import { Field, Notice } from '@/components/ui';

const DEMO = [
  { label: 'Admin', email: 'admin@abcprimary.edu', password: 'Admin@123' },
  { label: 'Teacher', email: 'sarah@abcprimary.edu', password: 'Pass@123' },
  { label: 'Parent', email: 'nimal.p@mail.com', password: 'Pass@123' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const u = await login(email, password); navigate(loc.state?.from?.startsWith(homeFor(u.role)) ? loc.state.from : homeFor(u.role), { replace: true }); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }
  return (
    <div className="login-wrap">
      <aside className="login-side">
        <div><h1>School Portal</h1><p style={{ marginTop: 10 }}>One secure place for parents, teachers and the school office.</p></div>
        {[{ i: <Users />, t: 'Parents', p: 'See your child\u2019s attendance, results and school news.' },
          { i: <BookOpenCheck />, t: 'Teachers', p: 'Mark attendance and enter term marks in minutes.' },
          { i: <ShieldCheck />, t: 'Administrators', p: 'Manage students, teachers, events and admissions.' }].map((f) => (
          <div className="login-feature" key={f.t}>{f.i}<div><b>{f.t}</b><span>{f.p}</span></div></div>
        ))}
      </aside>
      <div className="login-main">
        <div className="card login-card" style={{ padding: 32 }}>
          <img className="logo" src="/logo.png" alt="" />
          <h2>Welcome back</h2><p className="muted" style={{ margin: '6px 0 20px' }}>Sign in to your school account.</p>
          <form className="form" onSubmit={submit}>
            {error && <Notice kind="error">{error}</Notice>}
            <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></Field>
            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input className="input" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={{ paddingRight: 44 }} />
                <button type="button" className="icon-btn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} style={{ position: 'absolute', right: 6, top: 6 }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </Field>
            <button className="btn btn-primary btn-lg btn-block" disabled={busy}><LogIn size={18} /> {busy ? 'Signing in…' : 'Login'}</button>
          </form>
          {import.meta.env.DEV && (
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px dashed var(--line)' }}>
              <p className="small muted" style={{ marginBottom: 8 }}>Demo accounts (shown only while developing)</p>
              <div className="row">{DEMO.map((d) => <button key={d.label} type="button" className="btn btn-soft btn-sm" onClick={() => { setEmail(d.email); setPassword(d.password); }}>{d.label}</button>)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
