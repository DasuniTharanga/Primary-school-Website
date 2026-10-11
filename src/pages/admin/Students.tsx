import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Empty, ErrorBox, Field, Loading, Modal, Notice, Toast } from '@/components/ui';
import { fmtDate } from '@/lib/format';

const blank = { id: 0, admissionNo: '', name: '', gender: 'Male', dateOfBirth: '', address: '', admittedDate: '', status: 'Active', classId: '', gName: '', gPhone: '', gEmail: '', gRel: 'Father' };

export default function Students() {
  const [q, setQ] = useState('');
  const [classId, setClassId] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<typeof blank | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      api(`/api/admin/students?q=${encodeURIComponent(q)}&classId=${classId}`).then(setData).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, classId, tick]);

  async function save(e: FormEvent) {
    e.preventDefault(); if (!edit) return;
    setBusy(true); setFormError('');
    const body: any = { admissionNo: edit.admissionNo, name: edit.name, gender: edit.gender, dateOfBirth: edit.dateOfBirth, address: edit.address, admittedDate: edit.admittedDate || undefined, status: edit.status };
    try {
      if (edit.id) await api(`/api/admin/students/${edit.id}`, { method: 'PUT', body });
      else {
        if (edit.classId) body.classId = Number(edit.classId);
        if (edit.gName) body.guardian = { name: edit.gName, phone: edit.gPhone, email: edit.gEmail, relationship: edit.gRel };
        await api('/api/admin/students', { method: 'POST', body });
      }
      setEdit(null); setToast('Student saved'); setTick((t) => t + 1);
    } catch (err: any) { setFormError(err.message); } finally { setBusy(false); }
  }
  const up = (k: keyof typeof blank, v: string) => setEdit((s) => (s ? { ...s, [k]: v } : s));

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 36 }} placeholder="Search name or admission no." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" /></div>
          <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Filter by class"><option value="">All classes</option>{data?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <div className="grow" />
          <button className="btn btn-primary" onClick={() => { setFormError(''); setEdit({ ...blank }); }}><Plus size={16} /> Add student</button>
        </div>
        {error ? <ErrorBox message={error} /> : !data ? <Loading /> : !data.students.length ? <Empty title="No students found" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Adm. no</th><th>Name</th><th>Class</th><th>Gender</th><th>Date of birth</th><th>Guardians</th><th>Status</th><th /></tr></thead><tbody>
            {data.students.map((s: any) => (
              <tr key={s.id}><td className="muted">{s.admissionNo}</td><td><b>{s.name}</b></td><td>{s.className ?? <span className="muted">–</span>}</td><td>{s.gender}</td><td>{fmtDate(s.dateOfBirth)}</td>
                <td className="small muted" style={{ maxWidth: 220 }}>{s.guardians ?? '–'}</td>
                <td><Badge tone={s.status === 'Active' ? 'green' : 'grey'}>{s.status}</Badge></td>
                <td><div className="actions"><button className="btn btn-ghost btn-sm" onClick={() => { setFormError(''); setEdit({ ...blank, ...s, address: s.address ?? '', classId: '' }); }}><Pencil size={13} /> Edit</button></div></td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit student' : 'Add student'} onClose={() => setEdit(null)} footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button form="student-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <form id="student-form" className="form" onSubmit={save}>
            {formError && <Notice kind="error">{formError}</Notice>}
            <div className="form-row"><Field label="Admission no."><input className="input" required maxLength={10} value={edit.admissionNo} onChange={(e) => up('admissionNo', e.target.value)} /></Field>
              <Field label="Full name"><input className="input" required maxLength={100} value={edit.name} onChange={(e) => up('name', e.target.value)} /></Field></div>
            <div className="form-row"><Field label="Gender"><select className="select" value={edit.gender} onChange={(e) => up('gender', e.target.value)}><option>Male</option><option>Female</option></select></Field>
              <Field label="Date of birth"><input className="input" type="date" required value={edit.dateOfBirth} onChange={(e) => up('dateOfBirth', e.target.value)} /></Field></div>
            <Field label="Address"><input className="input" maxLength={255} value={edit.address} onChange={(e) => up('address', e.target.value)} /></Field>
            <div className="form-row"><Field label="Admitted date"><input className="input" type="date" value={edit.admittedDate} onChange={(e) => up('admittedDate', e.target.value)} /></Field>
              {edit.id ? <Field label="Status"><select className="select" value={edit.status} onChange={(e) => up('status', e.target.value)}><option>Active</option><option>Transferred</option><option>Left</option></select></Field>
                : <Field label="Enrol in class"><select className="select" value={edit.classId} onChange={(e) => up('classId', e.target.value)}><option value="">Not now</option>{data?.classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}</div>
            {!edit.id && <fieldset style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}><legend className="small muted">Guardian (optional)</legend><div className="form">
              <div className="form-row"><Field label="Name"><input className="input" value={edit.gName} onChange={(e) => up('gName', e.target.value)} /></Field>
                <Field label="Relationship"><select className="select" value={edit.gRel} onChange={(e) => up('gRel', e.target.value)}><option>Father</option><option>Mother</option><option>Guardian</option></select></Field></div>
              <div className="form-row"><Field label="Phone"><input className="input" value={edit.gPhone} required={!!edit.gName} onChange={(e) => up('gPhone', e.target.value)} /></Field>
                <Field label="Email"><input className="input" type="email" value={edit.gEmail} onChange={(e) => up('gEmail', e.target.value)} /></Field></div></div></fieldset>}
          </form>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
