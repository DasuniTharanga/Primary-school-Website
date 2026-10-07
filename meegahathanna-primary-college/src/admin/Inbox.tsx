import { useState, type FormEvent } from 'react';
import { Mail, Search, ArrowUpRight, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi, useDebounce } from '@/lib/hooks';
import { api, messageOf, formatDate } from '@/lib/api';
import { Alert, Loading, Empty, Pagination, Badge, Modal, Field } from '@/components/ui';
import type { InboxItem, Page } from '@/types';

export default function Inbox({ type }: { type: 'messages' | 'admissions' }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN')
    return <Alert>Administrator access is required to view enquiries.</Alert>;
  return <InboxList key={type} type={type} />;
}
function InboxList({ type }: { type: 'messages' | 'admissions' }) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<InboxItem | null>(null),
    [success, setSuccess] = useState(''),
    [error, setError] = useState('');
  const states = type === 'messages' ? ['NEW', 'READ', 'RESOLVED'] : ['NEW', 'CONTACTED', 'CLOSED'];
  const query = new URLSearchParams({
      search: useDebounce(search),
      status,
      page: String(page),
      limit: '12',
    }),
    resource = useApi<Page<InboxItem>>(`/api/admin/${type}?${query}`);
  async function remove(item: InboxItem) {
    if (!window.confirm(`Permanently delete enquiry ${item.reference} and its personal details?`))
      return;
    setError('');
    try {
      await api(`/api/admin/${type}/${item.id}`, {
        method: 'DELETE',
        body: { version: item.version },
      });
      setSelected(null);
      setSuccess('Enquiry deleted.');
      if (resource.data?.items.length === 1 && page > 1) setPage(page - 1);
      else resource.reload();
    } catch (e) {
      setError(messageOf(e));
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">School office · Private enquiries</div>
          <h1>{type === 'messages' ? 'Contact messages' : 'Admissions enquiries'}</h1>
          <p>
            {type === 'messages'
              ? 'Review messages and record your follow-up.'
              : 'Review family enquiries and guide them through the official process.'}
          </p>
        </div>
      </div>
      {success && <Alert success>{success}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="admin-panel">
        <div className="collection-tools">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search enquiries"
              placeholder="Search names or reference numbers…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Enquiry status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="muted">{resource.data?.total || 0} enquiries</span>
        </div>
        {resource.error ? (
          <Alert onRetry={resource.reload}>{resource.error}</Alert>
        ) : resource.loading ? (
          <Loading />
        ) : !resource.data?.items.length ? (
          <Empty title="No enquiries found">
            New submissions from the website will appear here.
          </Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{type === 'messages' ? 'Sender' : 'Child / guardian'}</th>
                    <th>{type === 'messages' ? 'Subject' : 'Grade'}</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-title">
                          <div>
                            <strong>{type === 'messages' ? item.name : item.childName}</strong>
                            <small>{type === 'messages' ? item.email : item.parentName}</small>
                            <small className="reference-small">{item.reference}</small>
                          </div>
                        </div>
                      </td>
                      <td>{type === 'messages' ? item.subject : `Grade ${item.grade}`}</td>
                      <td>
                        <Badge tone={item.status.toLowerCase()}>{item.status}</Badge>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <button className="text-button text-link" onClick={() => setSelected(item)}>
                          Review
                          <ArrowUpRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pages={resource.data.pages}
              total={resource.data.total}
              onChange={setPage}
            />
          </>
        )}
      </div>
      {selected && (
        <EnquiryEditor
          key={selected.id}
          initial={selected}
          type={type}
          states={states}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            setSuccess('Enquiry updated.');
            resource.reload();
          }}
          onDelete={() => void remove(selected)}
        />
      )}
    </>
  );
}
function EnquiryEditor({
  initial,
  type,
  states,
  onClose,
  onSaved,
  onDelete,
}: {
  initial: InboxItem;
  type: 'messages' | 'admissions';
  states: string[];
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState(initial.status),
    [notes, setNotes] = useState(initial.internalNotes),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/${type}/${initial.id}`, {
        method: 'PATCH',
        body: { status, internalNotes: notes, version: initial.version },
      });
      onSaved();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial.reference}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="enquiry-details">
        {type === 'messages' ? (
          <>
            <h3>{initial.subject}</h3>
            <dl>
              <dt>From</dt>
              <dd>{initial.name}</dd>
              <dt>Email</dt>
              <dd>{initial.email}</dd>
              <dt>Phone</dt>
              <dd>{initial.phone || 'Not provided'}</dd>
            </dl>
          </>
        ) : (
          <>
            <h3>
              {initial.childName} · Grade {initial.grade}
            </h3>
            <dl>
              <dt>Parent / guardian</dt>
              <dd>{initial.parentName}</dd>
              <dt>Email</dt>
              <dd>{initial.parentEmail}</dd>
              <dt>Phone</dt>
              <dd>{initial.phone}</dd>
              <dt>Date of birth</dt>
              <dd>{formatDate(initial.dateOfBirth)}</dd>
              <dt>Home address</dt>
              <dd className="preserve-lines">{initial.address}</dd>
            </dl>
          </>
        )}
        <div className="enquiry-message preserve-lines">
          {initial.message || 'No additional message.'}
        </div>
        <span className="muted">Received {formatDate(initial.createdAt)}</span>
        <a
          className="text-link"
          href={`mailto:${initial.email || initial.parentEmail}?subject=${encodeURIComponent(`Re: ${initial.reference}`)}`}
        >
          <Mail size={16} />
          Open an email reply
        </a>
      </div>
      <form className="stack-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="two-grid">
          <Field label="Follow-up status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {states.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Internal follow-up notes"
          hint="These notes are visible to school administrators only. Saving does not send an email."
        >
          <textarea
            maxLength={4000}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div className="form-actions">
          <button
            type="button"
            className="button danger secondary small"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={16} />
            Delete enquiry
          </button>
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Save follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
