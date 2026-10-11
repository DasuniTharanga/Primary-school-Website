import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { Badge, Empty, ErrorBox, Field, Loading, Modal, Notice, Toast, categoryTone } from '@/components/ui';
import { fmtDate, fmtTime, today } from '@/lib/format';

type FieldDef = { key: string; label: string; type?: 'text' | 'date' | 'time' | 'textarea' | 'select' | 'checkbox'; options?: string[]; required?: boolean; max?: number; hint?: string; half?: boolean };
interface Cfg { endpoint: string; singular: string; fields: FieldDef[]; blank: Record<string, any>; columns: { label: string; render: (i: any) => React.ReactNode }[] }

const CONFIGS: Record<string, Cfg> = {
  events: {
    endpoint: 'events', singular: 'event',
    blank: { title: '', category: 'Sports', date: today(), time: '09:00', location: '', description: '' },
    fields: [
      { key: 'title', label: 'Title', required: true, max: 120 },
      { key: 'category', label: 'Category', type: 'select', options: ['Sports', 'Celebration', 'Arts', 'Educational', 'Ceremony'], half: true },
      { key: 'date', label: 'Date', type: 'date', required: true, half: true },
      { key: 'time', label: 'Time', type: 'time', half: true },
      { key: 'location', label: 'Location', max: 100, half: true },
      { key: 'description', label: 'Description', type: 'textarea', max: 2000 },
    ],
    columns: [
      { label: 'Event', render: (i) => <><b>{i.title}</b><div className="small muted">{i.location}</div></> },
      { label: 'Category', render: (i) => <Badge tone={categoryTone(i.category)}>{i.category}</Badge> },
      { label: 'When', render: (i) => <>{fmtDate(i.date)}<div className="small muted">{fmtTime(i.time)}</div></> },
    ],
  },
  news: {
    endpoint: 'news', singular: 'news item',
    blank: { title: '', category: 'General', summary: '', body: '', date: today(), pinned: false, published: true },
    fields: [
      { key: 'title', label: 'Headline', required: true, max: 150 },
      { key: 'category', label: 'Category', max: 40, half: true },
      { key: 'date', label: 'Date', type: 'date', half: true },
      { key: 'summary', label: 'Summary', type: 'textarea', required: true, max: 300, hint: 'Shown in lists (max 300 characters).' },
      { key: 'body', label: 'Full text', type: 'textarea', max: 8000 },
      { key: 'pinned', label: 'Pin to the top', type: 'checkbox' },
      { key: 'published', label: 'Published (visible on the website)', type: 'checkbox' },
    ],
    columns: [
      { label: 'Headline', render: (i) => <><b>{i.title}</b><div className="small muted">{i.summary}</div></> },
      { label: 'Category', render: (i) => <Badge>{i.category}</Badge> },
      { label: 'Date', render: (i) => fmtDate(i.date) },
      { label: 'Status', render: (i) => <>{i.published ? <Badge tone="green">Published</Badge> : <Badge tone="grey">Draft</Badge>} {i.pinned && <Badge tone="amber">Pinned</Badge>}</> },
    ],
  },
  gallery: {
    endpoint: 'gallery', singular: 'photo',
    blank: { title: '', category: 'School life', image: '/gallery/', date: '', published: true },
    fields: [
      { key: 'title', label: 'Title', required: true, max: 120 },
      { key: 'category', label: 'Category', max: 40, half: true },
      { key: 'date', label: 'Date taken', type: 'date', half: true },
      { key: 'image', label: 'Image path', required: true, max: 255, hint: 'Copy the photo into the project\u2019s public/gallery folder, then enter /gallery/filename.jpg (or an https:// link).' },
      { key: 'published', label: 'Published (visible on the website)', type: 'checkbox' },
    ],
    columns: [
      { label: 'Photo', render: (i) => <img src={i.image} alt="" style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 8 }} /> },
      { label: 'Title', render: (i) => <b>{i.title}</b> },
      { label: 'Category', render: (i) => <Badge>{i.category}</Badge> },
      { label: 'Status', render: (i) => (i.published ? <Badge tone="green">Published</Badge> : <Badge tone="grey">Hidden</Badge>) },
    ],
  },
};

export default function ManageContent({ kind }: { kind: 'events' | 'news' | 'gallery' }) {
  const cfg = CONFIGS[kind];
  const { data, error, reload } = useApi<{ items: any[] }>(`/api/admin/${cfg.endpoint}`);
  const [edit, setEdit] = useState<Record<string, any> | null>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault(); if (!edit) return;
    setBusy(true); setFormError('');
    try {
      await api(`/api/admin/${cfg.endpoint}${edit.id ? '/' + edit.id : ''}`, { method: edit.id ? 'PUT' : 'POST', body: edit });
      setEdit(null); setToast('Saved'); reload();
    } catch (err: any) { setFormError(err.message); } finally { setBusy(false); }
  }
  async function remove() {
    try { await api(`/api/admin/${cfg.endpoint}/${confirmDel.id}`, { method: 'DELETE' }); setConfirmDel(null); setToast('Deleted'); reload(); }
    catch (err: any) { setFormError(err.message); }
  }
  return (
    <>
      <div className="card">
        <div className="toolbar"><div className="grow" /><button className="btn btn-primary" onClick={() => { setFormError(''); setEdit({ ...cfg.blank }); }}><Plus size={16} /> Add {cfg.singular}</button></div>
        {error ? <ErrorBox message={error} /> : !data ? <Loading /> : !data.items.length ? <Empty title={`No ${cfg.endpoint} yet`} /> : (
          <div className="table-wrap"><table className="table"><thead><tr>{cfg.columns.map((c) => <th key={c.label}>{c.label}</th>)}<th /></tr></thead><tbody>
            {data.items.map((it) => (
              <tr key={it.id}>{cfg.columns.map((c) => <td key={c.label}>{c.render(it)}</td>)}
                <td><div className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFormError(''); setEdit({ ...cfg.blank, ...Object.fromEntries(Object.entries(it).map(([k, v]) => [k, v ?? ''])) }); }}><Pencil size={13} /> Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { setFormError(''); setConfirmDel(it); }} aria-label={`Delete ${it.title}`}><Trash2 size={13} /></button></div></td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {edit && (
        <Modal title={`${edit.id ? 'Edit' : 'Add'} ${cfg.singular}`} onClose={() => setEdit(null)} footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button form="content-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <form id="content-form" className="form" onSubmit={save}>
            {formError && <Notice kind="error">{formError}</Notice>}
            <div className="form-row">
              {cfg.fields.map((f) => {
                const wrap = (n: React.ReactNode) => <div key={f.key} style={f.half ? undefined : { gridColumn: '1 / -1' }}>{n}</div>;
                if (f.type === 'checkbox') return wrap(<label className="checkbox"><input type="checkbox" checked={!!edit[f.key]} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.checked })} /> {f.label}</label>);
                return wrap(<Field label={f.label} hint={f.hint}>
                  {f.type === 'textarea' ? <textarea className="textarea" required={f.required} maxLength={f.max} value={edit[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                  : f.type === 'select' ? <select className="select" value={edit[f.key]} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                  : <input className="input" type={f.type ?? 'text'} required={f.required} maxLength={f.max} value={edit[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />}
                </Field>);
              })}
            </div>
          </form>
        </Modal>
      )}
      {confirmDel && (
        <Modal title="Delete this item?" onClose={() => setConfirmDel(null)} footer={<><button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button><button className="btn btn-danger" onClick={remove}>Delete</button></>}>
          <p>“{confirmDel.title}” will be permanently removed from the website.</p>
          {formError && <Notice kind="error">{formError}</Notice>}
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
