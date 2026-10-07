import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Alert, Field, Loading } from '@/components/ui';
import { useSchool } from '@/context/SchoolContext';
import { api, messageOf } from '@/lib/api';

export default function Admissions() {
  const { settings, loading } = useSchool(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reference, setReference] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const result = await api<{ reference: string }>('/api/admissions', {
        method: 'POST',
        body: { ...values, grade: Number(values.grade), consent: values.consent === 'on' },
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
        title="A bright beginning starts here."
        subtitle="Connect with the school office about joining our primary school community."
        kicker="Admissions enquiries"
      />
      <section className="section container contact-grid">
        <aside>
          <div className="eyebrow">For parents & guardians</div>
          <h2>
            Let’s take the
            <br />
            first step together.
          </h2>
          <p>
            This form is an enquiry. The school office will guide you through official requirements,
            eligibility and available places.
          </p>
          <ol className="steps">
            <li>
              <span>01</span>
              <div>
                <h3>Tell us a little about you</h3>
                <p>Share the basic details needed for the school office to follow up.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Speak with the school</h3>
                <p>The office can explain current admissions arrangements.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Follow the official process</h3>
                <p>Submit documents directly as advised by the school.</p>
              </div>
            </li>
          </ol>
          <div className="contact-note">
            Please keep identity documents and sensitive medical details out of this online enquiry.
          </div>
        </aside>
        <div className="form-panel">
          {loading ? (
            <Loading />
          ) : reference ? (
            <div className="submission-success" role="status">
              <CheckCircle2 size={50} />
              <h2>A little hello received.</h2>
              <p>Your enquiry is with the school office. It does not confirm a school place.</p>
              <span className="reference-label">Your reference number</span>
              <strong className="reference">{reference}</strong>
              <Link className="button secondary" to="/">
                Back to home
                <ArrowUpRight size={17} />
              </Link>
            </div>
          ) : !settings.admissionsOpen ? (
            <div className="submission-success">
              <h2>Enquiries are currently closed.</h2>
              <p>Please contact our school office for current admissions information.</p>
              <Link className="button" to="/contact">
                Contact the school
                <ArrowUpRight size={17} />
              </Link>
            </div>
          ) : (
            <>
              <h2>Admissions enquiry</h2>
              <p className="muted">Fields marked * are required.</p>
              <form className="stack-form" onSubmit={submit}>
                {error && <Alert>{error}</Alert>}
                <Field label="Parent / guardian name *">
                  <input
                    name="parentName"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                  />
                </Field>
                <div className="two-grid">
                  <Field label="Parent / guardian email *">
                    <input
                      name="parentEmail"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Contact number *">
                    <input
                      name="phone"
                      type="tel"
                      required
                      minLength={7}
                      maxLength={25}
                      autoComplete="tel"
                    />
                  </Field>
                </div>
                <Field label="Child’s full name *">
                  <input name="childName" required minLength={2} maxLength={100} />
                </Field>
                <div className="two-grid">
                  <Field label="Child’s date of birth *">
                    <input
                      name="dateOfBirth"
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </Field>
                  <Field label="Enquiry for grade *">
                    <select name="grade" required defaultValue="">
                      <option value="" disabled>
                        Select a grade
                      </option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          Grade {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Home address *">
                  <textarea
                    name="address"
                    required
                    minLength={5}
                    maxLength={600}
                    rows={2}
                    autoComplete="street-address"
                  />
                </Field>
                <Field
                  label="Anything you’d like to ask?"
                  hint="Optional. Please avoid identity numbers, documents or sensitive health information."
                >
                  <textarea name="message" maxLength={3000} rows={3} />
                </Field>
                <label className="honeypot" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                <label className="checkbox-line">
                  <input name="consent" type="checkbox" required />
                  <span>
                    I am the child’s parent or guardian. I agree to the{' '}
                    <Link to="/privacy" target="_blank" rel="noreferrer">
                      privacy notice
                    </Link>{' '}
                    and to the school contacting me about this enquiry.
                  </span>
                </label>
                <button className="button" disabled={busy}>
                  {busy ? 'Submitting…' : 'Send enquiry'}
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
