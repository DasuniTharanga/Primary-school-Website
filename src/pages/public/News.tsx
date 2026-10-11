import { useState } from 'react';
import { CalendarDays, Pin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/api';
import { Badge, Empty, ErrorBox, Loading } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export default function News() {
  const { data, error, loading, reload } = useApi<any>('/api/public/news');
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <>
      <PageHeader eyebrow="News & announcements" title="News & announcements">Stay up to date with what is happening at school.</PageHeader>
      <section className="section tight"><div className="container">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.news.length ? <Empty title="No news yet" /> : (
          <div className="stack">
            {data.news.map((n: any) => (
              <article className="card news-card" key={n.id}>
                <div className="row"><Badge>{n.category}</Badge>{n.pinned && <Badge tone="amber"><Pin size={11} /> Pinned</Badge>}<span className="meta"><span><CalendarDays size={13} />{fmtDate(n.date)}</span></span></div>
                <h3>{n.title}</h3>
                <p>{n.summary}</p>
                {openId === n.id && n.body && <p style={{ marginTop: 10, color: 'var(--text)' }}>{n.body}</p>}
                {n.body && <button className="btn btn-soft btn-sm" style={{ marginTop: 12 }} onClick={() => setOpenId(openId === n.id ? null : n.id)}>{openId === n.id ? 'Show less' : 'Read more'}</button>}
              </article>
            ))}
          </div>
        )}
      </div></section>
    </>
  );
}
