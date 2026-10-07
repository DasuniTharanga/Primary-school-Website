import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, ArrowUpRight, Send, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Alert, Field } from '@/components/ui';
import { useSchool } from '@/context/SchoolContext';
import { api, messageOf } from '@/lib/api';

export default function Contact() {
  const { settings } = useSchool(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reference, setReference] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const result = await api<{ reference: string }>('/api/contact', {
        method: 'POST',
        body: { ...values, consent: values.consent === 'on' },
      });
      setReference(result.reference);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Every conversation begins with hello."
        subtitle="Questions about our school, learning or admissions? Our school office is here to help."
        kicker="Contact our school"
      />
      <section className="section container contact-grid">
        <aside>
          <div className="eyebrow">We’d love to hear from you</div>
          <h2>Let’s stay in touch.</h2>
          <p>
            Use the form to reach our school office. Keep your reference number for any follow-up.
          </p>
          <div className="contact-details">
            <div>
              <MapPin />
              <span>
                <strong>Our location</strong>
                {settings.address}
              </span>
            </div>
            {settings.phone && (
              <div>
                <Phone />
                <span>
                  <strong>Telephone</strong>
                  <a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>{settings.phone}</a>
                </span>
              </div>
            )}
            {settings.email && (
              <div>
                <Mail />
                <span>
                  <strong>Email</strong>
                  <a href={`mailto:${settings.email}`}>{settings.email}</a>
                </span>
              </div>
            )}
            {settings.hours && (
              <div>
                <Clock />
                <span>
                  <strong>School office hours</strong>
                  {settings.hours}
                </span>
              </div>
            )}
          </div>
          <a
            className="text-link"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.name + ' Sri Lanka')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Find the school on a map
            <ArrowUpRight size={17} />
          </a>
          <div className="contact-note">
            <BookNote />
            For admissions questions, you can also use our{' '}
            <Link to="/admissions">admissions enquiry form</Link>.
          </div>
        </aside>
        <div className="form-panel">
          {reference ? (
            <div className="submission-success" role="status">
              <CheckCircle2 size={50} />
              <h2>Your message is with us.</h2>
              <p>The school office can now review your enquiry.</p>
              <span className="reference-label">Your reference number</span>
              <strong className="reference">{reference}</strong>
              <button className="button secondary" onClick={() => setReference('')}>
                Send another message
              </button>
            </div>
          ) : (
            <>
              <h2>Send a little hello.</h2>
              <p className="muted">Fields marked * are required.</p>
              <form onSubmit={submit} className="stack-form">
                {error && <Alert>{error}</Alert>}
                <Field label="Full name *">
                  <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
                </Field>
                <div className="two-grid">
                  <Field label="Email address *">
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                    />
                  </Field>
                  <Field label="Phone number">
                    <input name="phone" type="tel" autoComplete="tel" maxLength={25} />
                  </Field>
                </div>
                <Field label="Subject *">
                  <select name="subject" required defaultValue="">
                    <option value="" disabled>
                      Choose a subject
                    </option>
                    <option>General enquiry</option>
                    <option>Admissions enquiry</option>
                    <option>School visit</option>
                    <option>Feedback</option>
                    <option>Learning support</option>
                  </select>
                </Field>
                <Field label="Your message *">
                  <textarea name="message" required minLength={10} maxLength={4000} rows={5} />
                </Field>
                <label className="honeypot" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                <label className="checkbox-line">
                  <input name="consent" type="checkbox" required />
                  <span>
                    I agree to the{' '}
                    <Link to="/privacy" target="_blank" rel="noreferrer">
                      privacy notice
                    </Link>{' '}
                    and to the school contacting me about this message.
                  </span>
                </label>
                <button className="button" disabled={busy}>
                  {busy ? 'Sending…' : 'Send message'}
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}
function BookNote() {
  return <span className="note-dot" />;
}
