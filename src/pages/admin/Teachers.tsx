import { useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { Avatar, Badge, Empty, ErrorBox, Field, Loading, Modal, Notice, Toast } from '@/components/ui';

const blank = { id: 0, name: '', gender: 'Female', phone: '', email: '', qualification: '', experience: 0, joined: '', status: 'Active' };

export default function AdminTeachers() {
  const { data, error, reload } = useApi<any>('/api/admin/teachers');
  const [edit, setEdit] = useState<typeof blank | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const up = (k: keyof typeof blank, v: any) => setEdit((s) => (s ? { ...s, [k]: v } : s));
  async function save(e: FormEvent) {
    e.preventDefault(); if (!edit) return;
    setBusy(true); setFormError('');
    try {
      const body = { ...edit, experience: Number(edit.experience), joined: edit.joined || undefined };
      await api(edit.id ? `/api/admin/teachers/${edit.id}` : '/api/admin/teachers', { method: edit.id ? 'PUT' : 'POST', body });
      setEdit(null); setToast('Teacher saved'); reload();
    } catch (err: any) { setFormError(err.message); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="card">
        <div className="toolbar"><div className="grow" /><button className="btn btn-primary" onClick={() => { setFormError(''); setEdit({ ...blank }); }}><Plus size={16} /> Add teacher</button></div>
        {error ? <ErrorBox message={error} /> : !data ? <Loading /> : !data.teachers.length ? <Empty title="No teachers yet" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Teacher</th><th>Class</th><th>Qualification</th><th>Experience</th><th>Contact</th><th>Status</th><th /></tr></thead><tbody>
            {data.teachers.map((t: any) => (
              <tr key={t.id}><td><div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={t.name} size="sm" /><b>{t.name}</b></div></td><td>{t.className ?? <span className="muted">–</span>}</td><td>{t.qualification ?? '–'}</td><td>{t.experience} yrs</td>
                <td className="small muted">{t.email}<br />{t.phone}</td><td><Badge tone={t.status === 'Active' ? 'green' : 'grey'}>{t.status}</Badge></td>
                <td><div className="actions"><button className="btn btn-ghost btn-sm" onClick={() => { setFormError(''); setEdit({ ...blank, ...t, phone: t.phone ?? '', email: t.email ?? '', qualification: t.qualification ?? '', joined: t.joined ?? '' }); }}><Pencil size={13} /> Edit</button></div></td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit teacher' : 'Add teacher'} onClose={() => setEdit(null)} footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button form="teacher-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <form id="teacher-form" className="form" onSubmit={save}>
            {formError && <Notice kind="error">{formError}</Notice>}
            <div className="form-row"><Field label="Full name"><input className="input" required maxLength={100} value={edit.name} onChange={(e) => up('name', e.target.value)} /></Field>
              <Field label="Gender"><select className="select" value={edit.gender} onChange={(e) => up('gender', e.target.value)}><option>Female</option><option>Male</option></select></Field></div>
            <div className="form-row"><Field label="Email"><input className="input" type="email" value={edit.email} onChange={(e) => up('email', e.target.value)} /></Field>
              <Field label="Phone"><input className="input" value={edit.phone} onChange={(e) => up('phone', e.target.value)} /></Field></div>
            <div className="form-row"><Field label="Qualification"><input className="input" value={edit.qualification} onChange={(e) => up('qualification', e.target.value)} /></Field>
              <Field label="Years of experience"><input className="input" type="number" min={0} max={60} value={edit.experience} onChange={(e) => up('experience', e.target.value)} /></Field></div>
            <div className="form-row"><Field label="Joined date"><input className="input" type="date" value={edit.joined} onChange={(e) => up('joined', e.target.value)} /></Field>
              <Field label="Status"><select className="select" value={edit.status} onChange={(e) => up('status', e.target.value)}><option>Active</option><option>Retired</option><option>Resigned</option></select></Field></div>
          </form>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
