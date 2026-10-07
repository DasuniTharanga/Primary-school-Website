import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/hooks';
import { api, messageOf, formatDate } from '@/lib/api';
import { Alert, Loading, Badge, Empty, Modal, Field, Pagination } from '@/components/ui';
import type { User, AuditItem, Page } from '@/types';

export function UsersPage() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN')
    return <Alert>Administrator access is required to manage staff accounts.</Alert>;
  return <UserList />;
}
function UserList() {
  const resource = useApi<{ items: User[] }>('/api/admin/users'),
    [editing, setEditing] = useState<User | 'new' | null>(null),
    [success, setSuccess] = useState('');
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">School administration</div>
          <h1>Staff accounts</h1>
          <p>Choose who can manage website content and who can access the school office.</p>
        </div>
        <button className="button small" onClick={() => setEditing('new')}>
          <Plus size={17} />
          Add staff account
        </button>
      </div>
      {success && <Alert success>{success}</Alert>}
      <div className="admin-tip compact">
        <ShieldCheck size={22} />
        <p>
          <strong>Administrators</strong> can manage all sections and private enquiries.{' '}
          <strong>Content editors</strong> can manage published website content only.
        </p>
      </div>
      <div className="admin-panel">
        {resource.error ? (
          <Alert onRetry={resource.reload}>{resource.error}</Alert>
        ) : resource.loading ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {resource.data?.items.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <strong>{person.name}</strong>
                    </td>
                    <td>{person.email}</td>
                    <td>
                      <Badge>{person.role === 'ADMIN' ? 'Administrator' : 'Content editor'}</Badge>
                    </td>
                    <td>
                      <Badge tone={person.active ? 'published' : 'draft'}>
                        {person.active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${person.name}`}
                        onClick={() => setEditing(person)}
                      >
                        <Pencil size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <UserEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            resource.reload();
            setSuccess('Staff account saved.');
          }}
        />
      )}
    </>
  );
}
function UserEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth(),
    [name, setName] = useState(initial?.name || ''),
    [email, setEmail] = useState(initial?.email || ''),
    [password, setPassword] = useState(''),
    [role, setRole] = useState(initial?.role || 'EDITOR'),
    [active, setActive] = useState(initial?.active ?? true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/users${initial ? '/' + initial.id : ''}`, {
        method: initial ? 'PATCH' : 'POST',
        body: initial ? { name, role, active } : { name, email, password, role },
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
      title={initial ? 'Edit staff account' : 'Add staff account'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <Field label="Name *">
          <input
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email address *">
          <input
            type="email"
            required
            disabled={Boolean(initial)}
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {!initial && (
          <Field
            label="Initial password *"
            hint="Use 12–128 characters with letters and numbers. Share it directly with the staff member."
          >
            <input
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        <Field label="Account permissions">
          <select
            disabled={initial?.id === user?.id}
            value={role}
            onChange={(e) => setRole(e.target.value as User['role'])}
          >
            <option value="EDITOR">Content editor</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </Field>
        {initial && (
          <label className="checkbox-line">
            <input
              type="checkbox"
              disabled={initial.id === user?.id}
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Account is active. Disabling an account also signs it out.</span>
          </label>
        )}
        <div className="form-actions">
          <button className="button secondary" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Save account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function AuditPage() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN')
    return <Alert>Administrator access is required to view the activity log.</Alert>;
  return <AuditList />;
}
function AuditList() {
  const [page, setPage] = useState(1),
    resource = useApi<Page<AuditItem>>(`/api/admin/audit?page=${page}&limit=20`);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">School administration</div>
          <h1>Activity log</h1>
          <p>See sign-ins and changes made by school staff.</p>
        </div>
      </div>
      <div className="admin-panel">
        {resource.error ? (
          <Alert onRetry={resource.reload}>{resource.error}</Alert>
        ) : resource.loading ? (
          <Loading />
        ) : !resource.data?.items.length ? (
          <Empty title="No activity recorded yet" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Staff member</th>
                    <th>Activity</th>
                    <th>Date & time</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.actor}</strong>
                      </td>
                      <td>
                        {item.action}
                        {item.subject && (
                          <small className="audit-reference">Record: {item.subject}</small>
                        )}
                      </td>
                      <td>{formatDate(item.createdAt, { hour: '2-digit', minute: '2-digit' })}</td>
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
    </>
  );
}
export function AccountPage() {
  const { user, refresh } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (values.newPassword !== values.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/password', {
        method: 'POST',
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      });
      await refresh();
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password was changed. Sign in again with your new password.' },
      });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">My staff account</div>
          <h1>Keep your account secure.</h1>
          <p>Update your password whenever you need to.</p>
        </div>
      </div>
      <div className="two-grid">
        <div className="admin-panel account-info">
          <div className="icon-tile">
            <ShieldCheck size={27} />
          </div>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <Badge>{user?.role === 'ADMIN' ? 'Administrator' : 'Content editor'}</Badge>
          <p>
            Signing in is required to access staff tools. After a password change, all sessions for
            your account are signed out.
          </p>
        </div>
        <div className="admin-panel">
          <h2>
            <KeyRound size={21} />
            Change password
          </h2>
          <form className="stack-form" onSubmit={submit}>
            {error && <Alert>{error}</Alert>}
            <Field label="Current password">
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </Field>
            <Field label="New password" hint="Use 12–128 characters with letters and numbers.">
              <input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </Field>
            <button className="button" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
