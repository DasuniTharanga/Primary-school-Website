import { useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/api';
import { Badge, Empty, ErrorBox, Loading, categoryTone } from '@/components/ui';
import { fmtDate, fmtDay, fmtMonth, fmtTime } from '@/lib/format';

export default function Events() {
  const [period, setPeriod] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const { data, error, loading, reload } = useApi<any>(`/api/public/events?period=${period}`);
  return (
    <>
      <PageHeader eyebrow="School events" title="School events">Sports, celebrations, exhibitions and trips — mark your calendar.</PageHeader>
      <section className="section tight"><div className="container">
        <div className="tabs" role="tablist">
          {(['upcoming', 'past', 'all'] as const).map((p) => <button key={p} role="tab" aria-selected={period === p} className={`tab ${period === p ? 'on' : ''}`} onClick={() => setPeriod(p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}
        </div>
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.events.length ? <Empty title="No events to show" /> : (
          <div className="stack">
            {data.events.map((e: any) => (
              <article className="card event-card" key={e.id}>
                <div className="date-chip"><b>{fmtDay(e.date)}</b><span>{fmtMonth(e.date)}</span></div>
                <div className="body">
                  <div className="row"><h3>{e.title}</h3><Badge tone={categoryTone(e.category)}>{e.category}</Badge></div>
                  <p className="muted small" style={{ margin: '6px 0' }}>{e.description}</p>
                  <div className="meta"><span>{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>{e.time && <span><Clock size={13} />{fmtTime(e.time)}</span>}{e.location && <span><MapPin size={13} />{e.location}</span>}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div></section>
    </>
  );
}
