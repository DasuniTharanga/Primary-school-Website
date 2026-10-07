import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { Alert, Field } from '@/components/ui';
import { messageOf } from '@/lib/api';
export default function Login() {
  const { user, login } = useAuth(),
    { settings } = useSchool(),
    navigate = useNavigate(),
    location = useLocation();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await login(String(values.get('email')), String(values.get('password')));
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  if (user) return <Navigate to="/admin" replace />;
  return (
    <section className="login-section container">
      <div className="login-intro">
        <img src="/crest.svg" alt="" width="68" height="78" />
        <div className="eyebrow">Our school, together</div>
        <h1>
          A little care
          <br />
          behind the scenes.
        </h1>
        <p>
          Welcome to the staff space for {settings.shortName}. Keep our school community informed,
          connected and supported.
        </p>
        <div className="login-security">
          <ShieldCheck size={21} />
          For authorised school staff
        </div>
      </div>
      <div className="form-panel login-form">
        <div className="eyebrow">School staff portal</div>
        <h2>Welcome back.</h2>
        <p>Sign in using the account provided by your school administrator.</p>
        <form className="stack-form" onSubmit={submit}>
          {typeof location.state?.notice === 'string' && (
            <Alert success>{location.state.notice}</Alert>
          )}
          {error && <Alert>{error}</Alert>}
          <Field label="Email address">
            <input name="email" type="email" required autoComplete="username" maxLength={254} />
          </Field>
          <Field label="Password">
            <div className="password-input">
              <input
                name="password"
                type={show ? 'text' : 'password'}
                required
                maxLength={128}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </Field>
          <button className="button" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="login-help">
          Forgot your password? Please contact your school administrator.
        </p>
        <Link to="/" className="text-link">
          Back to the school website
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
