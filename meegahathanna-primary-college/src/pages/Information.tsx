import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, FileText, Download, MapPin, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ContentBrowser from '@/components/ContentBrowser';
import { NoticeCard } from '@/components/ContentCards';
import { Alert, Loading, Badge } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import { formatDate } from '@/lib/api';
import { useSchool } from '@/context/SchoolContext';
import type { ContentItem } from '@/types';

export function Notices() {
  return (
    <>
      <PageHeader
        title="A little news from our school."
        subtitle="Updates, important information and messages for the school community."
        kicker="The school notice board"
      />
      <section className="section container">
        <ContentBrowser
          kind="notices"
          emptyTitle="No notices published yet"
          emptyText="The latest messages from the school office will appear here."
          renderItem={(item) => <NoticeCard key={item.id} item={item} />}
        />
      </section>
    </>
  );
}
export function Resources() {
  return (
    <>
      <PageHeader
        title="A little help for learning."
        subtitle="School downloads and useful learning links, brought together for our families."
        kicker="Resources & downloads"
      />
      <section className="section container">
        <ContentBrowser
          kind="resources"
          emptyTitle="Learning resources are on the way"
          emptyText="School-approved downloads and links will be shared here."
          renderItem={(item) => (
            <article className="resource-card" key={item.id}>
              <div className="icon-tile">
                <FileText />
              </div>
              <Badge>{item.category || 'School resource'}</Badge>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              {item.body && <p className="preserve-lines">{item.body}</p>}
              {item.data.grade && <small className="muted">For {item.data.grade}</small>}
              <a
                className="button secondary small"
                href={item.data.filePath || item.data.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.data.filePath ? 'Download PDF' : 'Open resource'}
                {item.data.filePath ? <Download size={16} /> : <ArrowUpRight size={16} />}
              </a>
            </article>
          )}
        />
      </section>
    </>
  );
}
export function ContentDetails({ kind }: { kind: 'notices' | 'events' }) {
  const { id } = useParams(),
    { data, loading, error, reload } = useApi<{ item: ContentItem }>(`/api/content/${kind}/${id}`);
  if (loading)
    return (
      <section className="section container">
        <Loading />
      </section>
    );
  if (error)
    return (
      <section className="section container">
        <Alert onRetry={reload}>{error}</Alert>
        <Link to={`/${kind}`} className="text-link">
          Back to {kind}
        </Link>
      </section>
    );
  const item = data?.item;
  if (!item) return null;
  return (
    <>
      <PageHeader
        title={item.title}
        subtitle={item.summary}
        kicker={item.category || 'School update'}
      />
      <article className="section container article-width">
        <div className="article-meta">
          <Badge>
            {kind === 'events' ? formatDate(item.data.date) : formatDate(item.publishedAt)}
          </Badge>
          {item.data.time && (
            <span className="icon-line">
              <Clock size={16} />
              {item.data.time}
            </span>
          )}
          {item.data.location && (
            <span className="icon-line">
              <MapPin size={16} />
              {item.data.location}
            </span>
          )}
        </div>
        {item.imagePath && <img src={item.imagePath} alt={item.title} className="article-image" />}
        <div className="prose preserve-lines">{item.body || item.summary}</div>
        <Link to={`/${kind}`} className="text-link">
          <ArrowLeft size={16} />
          Back to {kind}
        </Link>
      </article>
    </>
  );
}
export function Privacy() {
  const { settings } = useSchool();
  return (
    <>
      <PageHeader
        title="Your information, handled with care."
        subtitle="How information submitted through this school website is used."
        kicker="Privacy notice"
      />
      <article className="section container article-width prose">
        <h2>Contact and admissions enquiries</h2>
        <p>
          When you send a message, the website stores your name, email, optional phone number and
          message. An admissions enquiry also stores the child’s name, date of birth, requested
          grade and your home address. These details help the school office review and respond to
          your enquiry.
        </p>
        <h2>Who can access your enquiry?</h2>
        <p>
          Enquiries are available to school administrators who have access to this website. Staff
          with content editor accounts can manage website content but cannot view contact messages
          or admissions enquiries.
        </p>
        <h2>Cookies and staff accounts</h2>
        <p>
          Staff sign-in uses a session cookie to keep the account authenticated. The website does
          not use advertising cookies. Staff accounts store a password hash rather than a readable
          password. Basic request counters help limit repeated sign-in attempts and spam.
        </p>
        <h2>Photographs</h2>
        <p>
          School staff should only publish photographs after confirming permission. Uploaded images
          are resized and their embedded location metadata is removed before they are stored.
        </p>
        <h2>Corrections and deletion</h2>
        <p>
          Contact the school office to request a correction or deletion of information you
          submitted. Include your enquiry reference number so the office can locate it. The school
          administrators are responsible for reviewing retention and deleting records that are no
          longer needed, including relevant backups.
        </p>
        <h2>External links</h2>
        <p>
          Map and learning resource links may open other websites. Their privacy policies apply when
          you visit them.
        </p>
        <p>
          <strong>{settings.name}</strong>
          <br />
          {settings.address}
        </p>
        <Link to="/contact" className="button secondary">
          Contact the school
          <ArrowUpRight size={17} />
        </Link>
      </article>
    </>
  );
}
export function NotFound() {
  return (
    <section className="section container not-found">
      <div className="eyebrow">404 · Page not found</div>
      <h1>A little turn in the wrong direction.</h1>
      <p>Let’s get you back to our school’s home page.</p>
      <Link to="/" className="button">
        Back to home
        <ArrowUpRight size={18} />
      </Link>
    </section>
  );
}
