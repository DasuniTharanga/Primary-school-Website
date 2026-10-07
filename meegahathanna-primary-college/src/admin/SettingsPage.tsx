import { useState, useEffect, type FormEvent } from 'react';
import { Save, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { useApi } from '@/lib/hooks';
import { api, messageOf } from '@/lib/api';
import { Alert, Loading, Field } from '@/components/ui';
import UploadField from './UploadField';
import type { Settings } from '@/types';

export default function SettingsPage() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN')
    return <Alert>Administrator access is required to change school settings.</Alert>;
  return <SettingsForm />;
}
function SettingsForm() {
  const resource = useApi<{ settings: Settings }>('/api/admin/settings'),
    school = useSchool();
  const [form, setForm] = useState<Settings | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [heroBusy, setHeroBusy] = useState(false),
    [logoBusy, setLogoBusy] = useState(false);
  useEffect(() => {
    if (resource.data) setForm(resource.data.settings);
  }, [resource.data]);
  const update = (key: keyof Settings, value: unknown) =>
    setForm((old) => (old ? { ...old, [key]: value } : old));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await api<{ settings: Settings }>('/api/admin/settings', {
        method: 'PATCH',
        body: form,
      });
      setForm(result.settings);
      school.reload();
      setSuccess('School settings saved. The public website is now up to date.');
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
          <div className="eyebrow">School administration</div>
          <h1>School settings</h1>
          <p>Keep your school’s identity, contact details and welcome message accurate.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="button secondary small">
          View website
          <ExternalLink size={16} />
        </a>
      </div>
      {resource.error ? (
        <Alert onRetry={resource.reload}>{resource.error}</Alert>
      ) : resource.loading || !form ? (
        <Loading />
      ) : (
        <form className="settings-form" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          {success && <Alert success>{success}</Alert>}
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>School identity</h2>
            </div>
            <div className="stack-form">
              <Field label="Official school name *">
                <input
                  required
                  minLength={2}
                  maxLength={250}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </Field>
              <div className="two-grid">
                <Field label="Display name *">
                  <input
                    required
                    maxLength={250}
                    value={form.shortName}
                    onChange={(e) => update('shortName', e.target.value)}
                  />
                </Field>
                <Field label="Sinhala school name">
                  <input
                    maxLength={250}
                    lang="si"
                    value={form.sinhalaName}
                    onChange={(e) => update('sinhalaName', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="School tagline">
                <input
                  maxLength={250}
                  value={form.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                />
              </Field>
              <div className="two-grid">
                <UploadField
                  label="Official school logo"
                  value={form.logoImage}
                  onChange={(v) => update('logoImage', v)}
                  onBusyChange={setLogoBusy}
                />
                <UploadField
                  label="School hero photograph"
                  value={form.heroImage}
                  onChange={(v) => update('heroImage', v)}
                  onBusyChange={setHeroBusy}
                />
              </div>
            </div>
          </div>
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>School office details</h2>
            </div>
            <div className="stack-form">
              <Field label="School address">
                <textarea
                  rows={2}
                  maxLength={250}
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                />
              </Field>
              <div className="two-grid">
                <Field label="Telephone">
                  <input
                    type="tel"
                    maxLength={25}
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </Field>
                <Field label="Email address">
                  <input
                    type="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="School office hours">
                <input
                  maxLength={250}
                  placeholder="Enter the confirmed office hours"
                  value={form.hours}
                  onChange={(e) => update('hours', e.target.value)}
                />
              </Field>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={form.admissionsOpen}
                  onChange={(e) => update('admissionsOpen', e.target.checked)}
                />
                <span>Accept admissions enquiries through the website.</span>
              </label>
            </div>
          </div>
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>About your school</h2>
            </div>
            <div className="stack-form">
              {(['about', 'vision', 'mission'] as const).map((key) => (
                <Field
                  key={key}
                  label={
                    key === 'about'
                      ? 'School introduction / history'
                      : key === 'vision'
                        ? 'School vision'
                        : 'School mission'
                  }
                >
                  <textarea
                    rows={4}
                    maxLength={6000}
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </div>
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>Principal’s welcome</h2>
            </div>
            <div className="stack-form">
              <Field label="Principal’s name">
                <input
                  maxLength={250}
                  value={form.principalName}
                  onChange={(e) => update('principalName', e.target.value)}
                />
              </Field>
              <Field
                label="Principal’s message"
                hint="This section appears on the About page when you add a name or message."
              >
                <textarea
                  rows={6}
                  maxLength={6000}
                  value={form.principalMessage}
                  onChange={(e) => update('principalMessage', e.target.value)}
                />
              </Field>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Reload settings and discard unsaved changes?'))
                  resource.reload();
              }}
            >
              Reload settings
            </button>
            <button className="button" disabled={busy || heroBusy || logoBusy}>
              <Save size={17} />
              {busy ? 'Saving…' : heroBusy || logoBusy ? 'Uploading…' : 'Save school settings'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
