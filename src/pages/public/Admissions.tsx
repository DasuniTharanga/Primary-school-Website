import { useState, type FormEvent } from 'react';
import { CheckCircle2, ClipboardList, PhoneCall, CalendarCheck, Smile, Info } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api, useApi } from '@/lib/api';
import { Field, Notice } from '@/components/ui';
import { useSettings } from '@/context/SchoolContext';

export default function Admissions() {
  const s = useSettings();
  const { data } = useApi<any>('/api/public/classes');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setError('');
    try {
      const r = await api<{ reference: string }>('/api/public/admissions', { method: 'POST', body: { ...f, gradeId: Number(f.gradeId), consent: f.consent === 'on' } });
      setRef(r.reference);
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }
  return (
    <>
      <PageHeader eyebrow="Admissions" title="Admissions">Begin your child's journey with us. Send an enquiry and the school office will guide you through the process.</PageHeader>
      <section className="section tight"><div className="container">
        <div className="section-title"><h2>Admission process</h2></div>
        <div className="steps">
          {[{ i: <ClipboardList />, t: 'Send an enquiry', p: 'Fill in the form below with your child\u2019s details.' },
            { i: <PhoneCall />, t: 'Office contacts you', p: 'The school office calls or emails you to discuss next steps.' },
            { i: <CalendarCheck />, t: 'Visit & documents', p: 'Meet the school and provide the documents the office requests.' },
            { i: <Smile />, t: 'Confirmation', p: 'You are told officially whether a place is available.' }].map((x) => (
            <div className="card step" key={x.t}><h3>{x.t}</h3><p className="small muted" style={{ marginTop: 6 }}>{x.p}</p></div>
          ))}
        </div>
      </div></section>

      <section className="section"><div className="container grid c32">
        <div className="card">
          <div className="card-head"><h3>Admission enquiry form</h3></div>
          {s.admissions_open !== '1' ? <Notice kind="info">Admissions are currently closed. Please contact the school office for more information.</Notice>
          : ref ? (
            <div className="stack center" style={{ padding: 20 }}>
              <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto' }} />
              <h2>Enquiry received</h2>
              <p>Your reference number is</p><div><span className="badge green" style={{ fontSize: '1.1rem', padding: '8px 16px' }}>{ref}</span></div>
              <p className="muted small">Please keep this number. The school office will contact you. This enquiry is not an admission approval.</p>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              {error && <Notice kind="error">{error}</Notice>}
              <div className="form-row">
                <Field label="Parent / guardian name"><input className="input" name="parentName" required maxLength={100} autoComplete="name" /></Field>
                <Field label="Phone"><input className="input" name="phone" required maxLength={20} inputMode="tel" autoComplete="tel" /></Field>
              </div>
              <Field label="Email"><input className="input" type="email" name="parentEmail" required maxLength={100} autoComplete="email" /></Field>
              <div className="form-row">
                <Field label="Child's full name"><input className="input" name="childName" required maxLength={100} /></Field>
                <Field label="Date of birth"><input className="input" type="date" name="dateOfBirth" required max={new Date().toISOString().slice(0, 10)} /></Field>
              </div>
              <Field label="Grade applying for">
                <select className="select" name="gradeId" required defaultValue="">
                  <option value="" disabled>Select grade</option>
                  {data?.classes?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
              <Field label="Home address"><input className="input" name="address" required maxLength={255} autoComplete="street-address" /></Field>
              <Field label="Message (optional)"><textarea className="textarea" name="message" maxLength={2000} /></Field>
              <label className="checkbox"><input type="checkbox" name="consent" required /> I agree that the school may store these details to respond to my enquiry.</label>
              <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Sending…' : 'Submit enquiry'}</button>
            </form>
          )}
        </div>
        <div className="stack">
          <div className="card"><h3>Requirements</h3>
            <ul className="check-list">
              <li><CheckCircle2 size={18} /> The child's age must suit the grade applied for.</li>
              <li><CheckCircle2 size={18} /> Parent or guardian contact details.</li>
              <li><CheckCircle2 size={18} /> Documents requested by the school office during your visit.</li>
            </ul></div>
          <div className="card"><div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><Info size={20} color="var(--primary)" />
            <p className="small muted">Please do not upload or send identity documents through this form. The office will tell you which documents to bring.</p></div></div>
        </div>
      </div></section>
    </>
  );
}
