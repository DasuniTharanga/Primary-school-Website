import { useEffect, useState, type FormEvent } from 'react';
import { api, useApi } from '@/lib/api';
import { ErrorBox, Field, Loading, Notice, Toast } from '@/components/ui';

const FIELDS: [string, string][] = [
  ['school_name', 'School name'], ['school_name_si', 'School name (Sinhala)'], ['tagline', 'Tagline'], ['address', 'Address'],
  ['phone', 'Phone'], ['email', 'Email'], ['office_hours', 'Office hours'], ['principal', 'Principal'],['principal', 'Principal'], ['contact_person', 'Contact person / mobile'],
];

export default function SettingsPage() {
  const { data, error } = useApi<{ settings: Record<string, string> }>('/api/admin/settings');
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  useEffect(() => { if (data) setForm(data.settings); }, [data]);
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/admin/settings', { method: 'PUT', body: { ...form, admissions_open: form.admissions_open === '1' } }); setToast('Settings saved. Refresh the public site to see changes.'); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  return (
    <form className="card form" onSubmit={save} style={{ maxWidth: 760 }}>
      <h3>School details</h3><p className="small muted">These appear on the Contact page and in the footer.</p>
      {err && <Notice kind="error">{err}</Notice>}
      <div className="form-row">{FIELDS.map(([k, l]) => <Field key={k} label={l}><input className="input" value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>)}</div>
      <label className="checkbox"><input type="checkbox" checked={form.admissions_open === '1'} onChange={(e) => setForm({ ...form, admissions_open: e.target.checked ? '1' : '0' })} /> Admissions are open (shows the enquiry form)</label>
      <div><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </form>
  );
}
