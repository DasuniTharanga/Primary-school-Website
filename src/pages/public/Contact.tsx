import { useState, type FormEvent } from 'react';
import { Clock, Mail, MapPin, Phone, CheckCircle2, ExternalLink } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api } from '@/lib/api';
import { Field, Notice } from '@/components/ui';
import { useSettings } from '@/context/SchoolContext';

export default function Contact() {
  const s = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setError('');
    try { setRef((await api<{ reference: string }>('/api/public/contact', { method: 'POST', body: f })).reference); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }
  const info = [
    { i: <MapPin size={20} />, t: 'Address', v: s.address },
    s.phone && { i: <Phone size={20} />, t: 'Phone', v: s.phone },
    s.email && { i: <Mail size={20} />, t: 'Email', v: s.email },
    s.contact_person && { i: <Phone size={20} />, t: 'Contact person / mobile', v: s.contact_person },
    { i: <Clock size={20} />, t: 'Office hours', v: s.office_hours },
  ].filter(Boolean) as { i: any; t: string; v: string }[];
  return (
    <>
      <PageHeader eyebrow="Contact" title="Contact us">Questions about school life, learning or visiting? Send us a message.</PageHeader>
      <section className="section tight"><div className="container grid c32">
        <div className="card">
          <div className="card-head"><h3>Send a message</h3></div>
          {ref ? (
            <div className="stack center" style={{ padding: 20 }}>
              <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto' }} />
              <h2>Message sent</h2><div><span className="badge green" style={{ fontSize: '1.05rem', padding: '8px 16px' }}>{ref}</span></div>
              <p className="muted small">Keep this reference number for any follow-up.</p>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              {error && <Notice kind="error">{error}</Notice>}
              <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <div className="form-row">
                <Field label="Your name"><input className="input" name="name" required maxLength={100} autoComplete="name" /></Field>
                <Field label="Email"><input className="input" type="email" name="email" required maxLength={100} autoComplete="email" /></Field>
              </div>
              <div className="form-row">
                <Field label="Phone (optional)"><input className="input" name="phone" maxLength={20} inputMode="tel" /></Field>
                <Field label="Subject"><input className="input" name="subject" required maxLength={150} /></Field>
              </div>
              <Field label="Message"><textarea className="textarea" name="message" required minLength={10} maxLength={3000} /></Field>
              <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
            </form>
          )}
        </div>
        <div className="stack">
          <div className="card stack">
            <h3>School information</h3>
            {info.map((x) => <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }} key={x.t}><div className="icon-box">{x.i}</div><div><b style={{ color: 'var(--ink)' }}>{x.t}</b><div className="muted">{x.v}</div></div></div>)}
            {!s.phone && !s.email && <p className="small muted">Phone and email will appear here once the school office adds them.</p>}
          </div>
          <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent('Meegahathanna Primary College, ' + s.address)}`}>
            <ExternalLink size={16} /> Open in Google Maps</a>
        </div>
      </div></section>
    </>
  );
}
