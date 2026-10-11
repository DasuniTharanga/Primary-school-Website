import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { Badge, Empty, ErrorBox, Loading, Modal, Notice, Toast } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export function AdminAdmissions() {
  const { data, error, reload } = useApi<{ items: any[] }>('/api/admin/admissions');
  const [open, setOpen] = useState<any>(null);
  const [status, setStatus] = useState('New');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const show = (x: any) => { setOpen(x); setStatus(x.status); setNotes(x.notes ?? ''); setErr(''); };
  async function save() {
    setBusy(true); setErr('');
    try { await api(`/api/admin/admissions/${open.id}`, { method: 'PUT', body: { status, notes } }); setOpen(null); setToast('Updated'); reload(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="card">
        {error ? <ErrorBox message={error} /> : !data ? <Loading /> : !data.items.length ? <Empty title="No admission enquiries yet" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Reference</th><th>Child</th><th>Grade</th><th>Parent</th><th>Received</th><th>Status</th><th /></tr></thead><tbody>
            {data.items.map((x) => <tr key={x.id}><td className="muted">{x.reference}</td><td><b>{x.childName}</b></td><td>{x.grade}</td><td>{x.parentName}</td><td>{fmtDate(x.createdAt)}</td>
              <td><Badge tone={x.status === 'New' ? 'amber' : x.status === 'Contacted' ? 'blue' : 'grey'}>{x.status}</Badge></td>
              <td><div className="actions"><button className="btn btn-ghost btn-sm" onClick={() => show(x)}>Open</button></div></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      {open && (
        <Modal title={`Enquiry ${open.reference}`} onClose={() => setOpen(null)} footer={<><button className="btn btn-ghost" onClick={() => setOpen(null)}>Close</button><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <div className="stack">
            {err && <Notice kind="error">{err}</Notice>}
            <div className="kv" style={{ marginTop: 0 }}>
              <div><span>Child</span><span>{open.childName}</span></div><div><span>Date of birth</span><span>{fmtDate(open.dateOfBirth)}</span></div>
              <div><span>Grade</span><span>{open.grade}</span></div><div><span>Address</span><span>{open.address}</span></div><div><span>Parent</span><span>{open.parentName}</span></div></div>
            <div className="row"><a className="btn btn-soft btn-sm" href={`mailto:${open.parentEmail}`}><Mail size={14} /> {open.parentEmail}</a><a className="btn btn-soft btn-sm" href={`tel:${open.phone}`}><Phone size={14} /> {open.phone}</a></div>
            {open.message && <div className="card flat"><p className="small">{open.message}</p></div>}
            <div className="field"><label>Status</label><select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option>New</option><option>Contacted</option><option>Closed</option></select></div>
            <div className="field"><label>Internal notes</label><textarea className="textarea" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} /></div>
            <p className="small muted">An enquiry is not an admission approval. Emails are not sent automatically.</p>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}

export function AdminMessages() {
  const { data, error, reload } = useApi<{ items: any[] }>('/api/admin/messages');
  const [open, setOpen] = useState<any>(null);
  const [toast, setToast] = useState('');
  async function setStatus(m: any, status: string) {
    await api(`/api/admin/messages/${m.id}`, { method: 'PUT', body: { status } });
    setOpen({ ...m, status }); setToast('Updated'); reload();
  }
  return (
    <>
      <div className="card">
        {error ? <ErrorBox message={error} /> : !data ? <Loading /> : !data.items.length ? <Empty title="No messages yet" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Reference</th><th>From</th><th>Subject</th><th>Received</th><th>Status</th><th /></tr></thead><tbody>
            {data.items.map((m) => <tr key={m.id}><td className="muted">{m.reference}</td><td><b>{m.name}</b><div className="small muted">{m.email}</div></td><td>{m.subject}</td><td>{fmtDate(m.createdAt)}</td>
              <td><Badge tone={m.status === 'New' ? 'amber' : m.status === 'Read' ? 'blue' : 'green'}>{m.status}</Badge></td>
              <td><div className="actions"><button className="btn btn-ghost btn-sm" onClick={() => { setOpen(m); if (m.status === 'New') setStatus(m, 'Read'); }}>Open</button></div></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      {open && (
        <Modal title={open.subject} onClose={() => setOpen(null)} footer={<>
          <a className="btn btn-soft" href={`mailto:${open.email}?subject=${encodeURIComponent('Re: ' + open.subject)}`}><Mail size={15} /> Reply by email</a>
          {open.status !== 'Resolved' && <button className="btn btn-primary" onClick={() => setStatus(open, 'Resolved')}>Mark resolved</button>}</>}>
          <div className="stack">
            <div className="row spread"><div><b>{open.name}</b><div className="small muted">{open.email}{open.phone ? ` · ${open.phone}` : ''}</div></div><Badge>{open.reference}</Badge></div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{open.message}</p>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
