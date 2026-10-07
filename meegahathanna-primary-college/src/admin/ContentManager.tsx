import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, CheckCircle2, Eye } from 'lucide-react';
import { useApi, useDebounce } from '@/lib/hooks';
import { api, messageOf, formatDate } from '@/lib/api';
import { Alert, Loading, Empty, Badge, Pagination, Modal, Field } from '@/components/ui';
import UploadField from './UploadField';
import type { ContentItem, ContentPage, Kind, ContentData } from '@/types';

const kinds: Kind[] = ['notices', 'events', 'teachers', 'classes', 'gallery', 'resources'];
const labels: Record<Kind, { title: string; singular: string; description: string }> = {
  notices: {
    title: 'School notices',
    singular: 'notice',
    description: 'Share important updates with the school community.',
  },
  events: {
    title: 'School events',
    singular: 'event',
    description: 'Manage school activities, dates and event details.',
  },
  teachers: {
    title: 'Teacher directory',
    singular: 'teacher',
    description: 'Check staff names and publish the profiles families can see.',
  },
  classes: {
    title: 'Our classes',
    singular: 'class',
    description: 'Keep class descriptions and learning areas up to date.',
  },
  gallery: {
    title: 'School gallery',
    singular: 'photograph',
    description: 'Publish school photographs with appropriate permission.',
  },
  resources: {
    title: 'Learning resources',
    singular: 'resource',
    description: 'Share useful PDFs and links with families.',
  },
};
function blank(kind: Kind): ContentItem {
  const data: ContentData =
    kind === 'teachers'
      ? { role: 'Teacher', grade: '', subject: '', reviewRequired: false }
      : kind === 'classes'
        ? { grade: 1, sections: '', subjects: '' }
        : kind === 'events'
          ? { date: '', time: '', location: '' }
          : kind === 'gallery'
            ? { alt: '', consentConfirmed: false }
            : kind === 'resources'
              ? { filePath: '', link: '', grade: '' }
              : { pinned: false };
  return {
    id: '',
    kind,
    title: '',
    summary: '',
    body: '',
    category: '',
    status: 'draft',
    imagePath: '',
    data,
    sortOrder: 0,
    publishedAt: null,
    createdAt: '',
    updatedAt: '',
    version: 1,
  };
}
export default function ContentManager() {
  const { kind: routeKind } = useParams();
  if (!kinds.includes(routeKind as Kind)) return <Empty title="Unknown content section" />;
  return <Manager key={routeKind} kind={routeKind as Kind} />;
}
function Manager({ kind }: { kind: Kind }) {
  const label = labels[kind],
    [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<ContentItem | null>(null),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [deleting, setDeleting] = useState('');
  const query = new URLSearchParams({
      search: useDebounce(search),
      status,
      page: String(page),
      limit: '12',
    }),
    resource = useApi<ContentPage>(`/api/admin/content/${kind}?${query}`);
  async function remove(item: ContentItem) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setDeleting(item.id);
    setError('');
    setSuccess('');
    try {
      await api(`/api/admin/content/${kind}/${item.id}`, {
        method: 'DELETE',
        body: { version: item.version },
      });
      setSuccess('Item deleted.');
      if (resource.data?.items.length === 1 && page > 1) setPage(page - 1);
      else resource.reload();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setDeleting('');
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">Website content</div>
          <h1>{label.title}</h1>
          <p>{label.description}</p>
        </div>
        <button
          className="button small"
          onClick={() => {
            setEditing(blank(kind));
            setSuccess('');
          }}
        >
          <Plus size={17} />
          Add {label.singular}
        </button>
      </div>
      {success && <Alert success>{success}</Alert>}
      {error && <Alert>{error}</Alert>}
      {kind === 'teachers' && (
        <div className="admin-tip compact">
          <CheckCircle2 size={22} />
          <p>
            The supplied staff sheet was transcribed into drafts. Check each name against the school
            record, add the correct role / grade, and confirm it before publishing.
          </p>
        </div>
      )}
      <div className="admin-panel">
        <div className="collection-tools">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label={`Search ${kind}`}
              placeholder={`Search ${label.title.toLowerCase()}…`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Publication status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          <span className="muted">{resource.data?.total ?? 0} items</span>
        </div>
        {resource.error ? (
          <Alert onRetry={resource.reload}>{resource.error}</Alert>
        ) : resource.loading ? (
          <Loading />
        ) : resource.data?.items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{kind === 'teachers' ? 'Teacher' : 'Title'}</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-title">
                          {item.imagePath && <img src={item.imagePath} alt="" />}
                          <div>
                            <strong>{item.title}</strong>
                            {item.data.reviewRequired && (
                              <small className="review-label">Name needs checking</small>
                            )}
                            {kind === 'events' && <small>{formatDate(item.data.date)}</small>}
                          </div>
                        </div>
                      </td>
                      <td>{item.category || '—'}</td>
                      <td>
                        <Badge tone={item.status}>{item.status}</Badge>
                      </td>
                      <td>{formatDate(item.updatedAt)}</td>
                      <td>
                        <div className="table-actions">
                          {item.status === 'published' && ['notices', 'events'].includes(kind) && (
                            <a
                              className="icon-button"
                              href={`/${kind}/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`View ${item.title}`}
                            >
                              <Eye size={17} />
                            </a>
                          )}
                          <button
                            className="icon-button"
                            onClick={() => setEditing(item)}
                            aria-label={`Edit ${item.title}`}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            className="icon-button danger"
                            disabled={deleting === item.id}
                            onClick={() => void remove(item)}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
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
        ) : (
          <Empty title={search || status ? 'No matching items' : `No ${kind} yet`}>
            Use the add button to create a new {label.singular}.
          </Empty>
        )}
      </div>
      {editing && (
        <ContentEditor
          key={editing.id || 'new'}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setSuccess('Content saved successfully.');
            resource.reload();
          }}
        />
      )}
    </>
  );
}
function ContentEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: ContentItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [item, setItem] = useState(initial),
    [busy, setBusy] = useState(false),
    [uploadBusy, setUploadBusy] = useState(false),
    [error, setError] = useState(''),
    kind = initial.kind;
  const update = (key: keyof ContentItem, value: unknown) =>
    setItem((current) => ({ ...current, [key]: value }));
  const data = (key: keyof ContentData, value: unknown) =>
    setItem((current) => ({ ...current, data: { ...current.data, [key]: value } }));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/content/${kind}${item.id ? '/' + item.id : ''}`, {
        method: item.id ? 'PATCH' : 'POST',
        body: item,
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
      title={`${initial.id ? 'Edit' : 'Add'} ${labels[kind].singular}`}
      onClose={() => {
        if (!busy && !uploadBusy) onClose();
      }}
      wide
    >
      <form className="stack-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <Field label={kind === 'teachers' ? 'Teacher name *' : 'Title *'}>
          <input
            required
            minLength={2}
            maxLength={180}
            value={item.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </Field>
        <div className="two-grid">
          <Field label="Category">
            <input
              maxLength={60}
              value={item.category}
              onChange={(e) => update('category', e.target.value)}
            />
          </Field>
          <Field label="Publication status">
            <select value={item.status} onChange={(e) => update('status', e.target.value)}>
              <option value="draft">Draft — visible to staff only</option>
              <option value="published">Published — visible to everyone</option>
            </select>
          </Field>
        </div>
        {kind === 'events' && (
          <>
            <div className="two-grid">
              <Field label="Event date *">
                <input
                  type="date"
                  required
                  value={item.data.date || ''}
                  onChange={(e) => data('date', e.target.value)}
                />
              </Field>
              <Field label="Time (Sri Lanka)">
                <input
                  type="time"
                  value={item.data.time || ''}
                  onChange={(e) => data('time', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Location">
              <input
                maxLength={180}
                value={item.data.location || ''}
                onChange={(e) => data('location', e.target.value)}
              />
            </Field>
          </>
        )}
        {kind === 'teachers' && (
          <>
            <div className="two-grid">
              <Field label="Role *">
                <input
                  required
                  maxLength={100}
                  value={item.data.role || ''}
                  onChange={(e) => data('role', e.target.value)}
                />
              </Field>
              <Field label="Grade / class">
                <input
                  maxLength={80}
                  value={item.data.grade || ''}
                  onChange={(e) => data('grade', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Subject / learning area">
              <input
                maxLength={150}
                value={item.data.subject || ''}
                onChange={(e) => data('subject', e.target.value)}
              />
            </Field>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={!item.data.reviewRequired}
                onChange={(e) => data('reviewRequired', !e.target.checked)}
              />
              <span>I have checked this teacher’s name and details against the school record.</span>
            </label>
          </>
        )}
        {kind === 'classes' && (
          <>
            <div className="two-grid">
              <Field label="Grade *">
                <select
                  value={item.data.grade || 1}
                  onChange={(e) => data('grade', Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Grade {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sections">
                <input
                  placeholder="e.g. 1A, 1B"
                  maxLength={120}
                  value={item.data.sections || ''}
                  onChange={(e) => data('sections', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Learning areas">
              <input
                maxLength={500}
                value={item.data.subjects || ''}
                onChange={(e) => data('subjects', e.target.value)}
              />
            </Field>
          </>
        )}
        <Field label="Short description">
          <textarea
            rows={2}
            maxLength={600}
            value={item.summary}
            onChange={(e) => update('summary', e.target.value)}
          />
        </Field>
        <Field
          label={kind === 'teachers' ? 'Biography / details' : 'Full details'}
          hint="Plain text. Paragraphs and Sinhala text are supported."
        >
          <textarea
            rows={5}
            maxLength={12000}
            value={item.body}
            onChange={(e) => update('body', e.target.value)}
          />
        </Field>
        {kind !== 'resources' && (
          <UploadField
            label={kind === 'gallery' ? 'Photograph *' : 'Photograph (optional)'}
            value={item.imagePath}
            onChange={(value) => update('imagePath', value)}
            onBusyChange={setUploadBusy}
          />
        )}
        {kind === 'notices' && (
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={Boolean(item.data.pinned)}
              onChange={(e) => data('pinned', e.target.checked)}
            />
            <span>Pin this notice to the top of the notice board.</span>
          </label>
        )}
        {kind === 'gallery' && (
          <>
            <Field
              label="Image description"
              hint="Describe the photograph for people using screen readers."
            >
              <input
                maxLength={250}
                value={item.data.alt || ''}
                onChange={(e) => data('alt', e.target.value)}
              />
            </Field>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={Boolean(item.data.consentConfirmed)}
                onChange={(e) => data('consentConfirmed', e.target.checked)}
              />
              <span>
                The school has permission to publish this photograph and the people shown in it.
              </span>
            </label>
          </>
        )}
        {kind === 'resources' && (
          <>
            <UploadField
              label="Downloadable PDF"
              pdf
              value={item.data.filePath || ''}
              onChange={(value) => data('filePath', value)}
              onBusyChange={setUploadBusy}
            />
            <Field
              label="External learning link"
              hint="Use an HTTPS link. If a PDF is attached, the public download button will use the PDF."
            >
              <input
                type="url"
                maxLength={1500}
                value={item.data.link || ''}
                onChange={(e) => data('link', e.target.value)}
              />
            </Field>
            <Field label="Grade / audience">
              <input
                placeholder="e.g. Grade 3 or All families"
                maxLength={30}
                value={item.data.grade || ''}
                onChange={(e) => data('grade', e.target.value)}
              />
            </Field>
          </>
        )}
        <Field
          label="Display order"
          hint="Lower numbers appear first in the class, teacher, gallery and resource lists."
        >
          <input
            type="number"
            min={0}
            max={9999}
            value={item.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
          />
        </Field>
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy || uploadBusy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button" disabled={busy || uploadBusy}>
            {busy ? 'Saving…' : uploadBusy ? 'Uploading…' : 'Save content'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
