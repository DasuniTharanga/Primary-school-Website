import { useState, type FormEvent } from 'react';
import { Plus, KeyRound, Power } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { Badge, Empty, ErrorBox, Field, Loading, Modal, Notice, Toast } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export default function Accounts() {
  const { data, error, reload } = useApi<any>('/api/admin/accounts');
  const [create, setCreate] = useState<any>(null);
  const [reset, setReset] = useState<any>(null);
  const [pw, setPw] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  async function submitCreate(e: FormEvent) {
    e.preventDefault(); setBusy(true); setFormError('');
    try {
      await api('/api/admin/accounts', { method: 'POST', body: { ...create, teacherId: create.teacherId ? Number(create.teacherId) : undefined, guardianId: create.guardianId ? Number(create.guardianId) : undefined } });
      setCreate(null); setToast('Account created'); reload();
    } catch (err: any) { setFormError(err.message); } finally { setBusy(false); }
  }
  async function submitReset(e: FormEvent) {
    e.preventDefault(); setBusy(true); setFormError('');
    try { await api(`/api/admin/accounts/${reset.id}`, { method: 'PUT', body: { password: pw } }); setReset(null); setPw(''); setToast('Password changed. User was signed out.'); }
    catch (err: any) { setFormError(err.message); } finally { setBusy(false); }
  }
  async function toggle(a: any) {
    try { await api(`/api/admin/accounts/${a.id}`, { method: 'PUT', body: { active: !a.active } }); reload(); } catch (err: any) { setFormError(err.message); }
  }
  return (
    <>
      <div className="card">
        <div className="toolbar"><div className="grow" /><button className="btn btn-primary" onClick={() => { setFormError(''); setCreate({ role: 'Parent', email: '', password: '', name: '', teacherId: '', guardianId: '' }); }}><Plus size={16} /> New account</button></div>
        {formError && !create && !reset && <ErrorBox message={formError} />}
        {error ? <ErrorBox message={error} /> : !data ? <Loading /> : !data.items.length ? <Empty title="No accounts" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th>Status</th><th /></tr></thead><tbody>
            {data.items.map((a: any) => <tr key={a.id}><td><b>{a.name}</b></td><td>{a.email}</td><td><Badge tone={a.role === 'Admin' ? 'red' : a.role === 'Teacher' ? 'blue' : ''}>{a.role}</Badge></td><td className="muted">{a.lastLogin ? fmtDate(a.lastLogin) : 'Never'}</td>
              <td><Badge tone={a.active ? 'green' : 'grey'}>{a.active ? 'Active' : 'Disabled'}</Badge></td>
              <td><div className="actions"><button className="btn btn-ghost btn-sm" onClick={() => { setFormError(''); setReset(a); }}><KeyRound size={13} /> Password</button><button className="btn btn-ghost btn-sm" onClick={() => toggle(a)}><Power size={13} /> {a.active ? 'Disable' : 'Enable'}</button></div></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      {create && (
        <Modal title="New account" onClose={() => setCreate(null)} footer={<><button className="btn btn-ghost" onClick={() => setCreate(null)}>Cancel</button><button form="acc-form" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button></>}>
          <form id="acc-form" className="form" onSubmit={submitCreate}>
            {formError && <Notice kind="error">{formError}</Notice>}
            <Field label="Role"><select className="select" value={create.role} onChange={(e) => setCreate({ ...create, role: e.target.value })}><option>Parent</option><option>Teacher</option><option>Admin</option></select></Field>
            {create.role === 'Teacher' && <Field label="Teacher"><select className="select" required value={create.teacherId} onChange={(e) => setCreate({ ...create, teacherId: e.target.value })}><option value="">Select…</option>{data.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>}
            {create.role === 'Parent' && <Field label="Guardian"><select className="select" required value={create.guardianId} onChange={(e) => setCreate({ ...create, guardianId: e.target.value })}><option value="">Select…</option>{data.guardians.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>}
            {create.role === 'Admin' && <Field label="Name"><input className="input" required value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} /></Field>}
            <Field label="Email (login)"><input className="input" type="email" required value={create.email} onChange={(e) => setCreate({ ...create, email: e.target.value })} /></Field>
            <Field label="Temporary password" hint="At least 10 characters. Share it privately."><input className="input" type="password" required minLength={10} autoComplete="new-password" value={create.password} onChange={(e) => setCreate({ ...create, password: e.target.value })} /></Field>
          </form>
        </Modal>
      )}
      {reset && (
        <Modal title={`Set new password — ${reset.email}`} onClose={() => setReset(null)} footer={<><button className="btn btn-ghost" onClick={() => setReset(null)}>Cancel</button><button form="pw-form" className="btn btn-primary" disabled={busy}>Change password</button></>}>
          <form id="pw-form" className="form" onSubmit={submitReset}>
            {formError && <Notice kind="error">{formError}</Notice>}
            <Field label="New password" hint="At least 10 characters. The user will be signed out everywhere."><input className="input" type="password" required minLength={10} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          </form>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
