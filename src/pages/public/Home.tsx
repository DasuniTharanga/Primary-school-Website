import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart, Sprout, Users, GraduationCap, CalendarDays, MapPin, Clock, Newspaper } from 'lucide-react';
import { useApi } from '@/lib/api';
import { useSettings } from '@/context/SchoolContext';
import { Badge, ErrorBox, Loading, categoryTone } from '@/components/ui';
import { fmtDate, fmtDay, fmtMonth, fmtTime } from '@/lib/format';

export default function Home() {
  const s = useSettings();
  const { data, error, loading, reload } = useApi<any>('/api/public/overview');
  const st = data?.stats;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
                    <div className="hero-logo">
            <img src="/logo.png" alt="Meegahathanna Primary College crest" />
          </div>
          <div>
            <span className="eyebrow"><GraduationCap size={14} /> {s.admissions_open === '1' ? 'Admissions are open' : 'Welcome'}</span>
            <h1 className="hero-title"><small>Welcome to</small><span>{s.school_name.replace(/^W\/?P\/MT\//i, '')}</span></h1>
            <p className="lead">{s.school_name_si} — {s.tagline} A caring primary school where every child from Grade 1 to Grade 5 learns, explores and grows.</p>
            <div className="row" style={{ marginTop: 26 }}>
              <Link to="/admissions" className="btn btn-primary btn-lg">Apply now <ArrowRight size={18} /></Link>
              <Link to="/about" className="btn btn-ghost btn-lg">Learn more</Link>
              <Link to="/admission-map" className="btn btn-ghost btn-lg"><MapPin size={18} /> Admission area map</Link>
            </div>
            <div className="mini-stats">
              <div><strong>{st?.students ?? '–'}</strong><span>Students</span></div>
              <div><strong>{st?.teachers ?? '–'}</strong><span>Teachers</span></div>
              <div><strong>{st?.classes ?? '–'}</strong><span>Classes</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-title"><h2>Why choose our school?</h2><p>A warm, safe place where learning feels joyful.</p></div>
          <div className="grid c3">
            {[
              { i: <BookOpen />, t: 'Quality education', p: 'Language, mathematics, environmental studies, science and the arts taught by dedicated class teachers.' },
              { i: <Users />, t: 'Activities & sports', p: 'Sports meets, celebrations, art exhibitions and educational trips that build confidence and friendships.' },
              { i: <Sprout />, t: 'Safe environment', p: 'Small classes, caring staff and close contact with parents through our school portal.' },
            ].map((f) => (
              <div className="card feature" key={f.t}><div className="icon-box">{f.i}</div><h3>{f.t}</h3><p>{f.p}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <div className="section-title"><h2>School at a glance</h2></div>
          {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
            <div className="band">
              <div><strong>{st.students}</strong><span>Students enrolled</span></div>
              <div><strong>{st.teachers}</strong><span>Teaching staff</span></div>
              <div><strong>{st.classes}</strong><span>Classes this year</span></div>
              <div><strong>{st.grades}</strong><span>Grades (1 to {st.grades})</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container grid c2">
          <div>
            <div className="card-head"><h2>Upcoming events</h2><Link to="/events" className="btn btn-soft btn-sm">View all</Link></div>
            <div className="card">
              {data?.events?.length ? data.events.map((e: any) => (
                <div className="item" key={e.id}>
                  <div className="date-chip"><b>{fmtDay(e.date)}</b><span>{fmtMonth(e.date)}</span></div>
                  <div><h3>{e.title}</h3>
                    <div className="meta">{e.time && <span><Clock size={13} />{fmtTime(e.time)}</span>}{e.location && <span><MapPin size={13} />{e.location}</span>}</div>
                  </div>
                  <Badge tone={categoryTone(e.category)}>{e.category}</Badge>
                </div>
              )) : <p className="muted">No upcoming events right now.</p>}
            </div>
          </div>
          <div>
            <div className="card-head"><h2>Latest news</h2><Link to="/news" className="btn btn-soft btn-sm">View all</Link></div>
            <div className="card">
              {data?.news?.length ? data.news.map((n: any) => (
                <div className="item" key={n.id}>
                  <div className="icon-box"><Newspaper size={20} /></div>
                  <div><h3>{n.title}</h3><p className="small muted">{n.summary}</p><div className="meta"><span><CalendarDays size={13} />{fmtDate(n.date)}</span></div></div>
                </div>
              )) : <p className="muted">No news yet.</p>}
            </div>
          </div>
        </div>
      </section>

            <section className="section tight">
        <div className="container">
          <div className="card row spread" style={{ padding: 28 }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <div className="icon-box"><MapPin size={22} /></div>
              <div>
                <h3>Do you live near our school?</h3>
                <p className="muted small">Check on the map whether your home is inside our 3 km admission area.</p>
              </div>
            </div>
            <Link to="/admission-map" className="btn btn-primary">View admission area map <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <div className="cta">
            <div><h2>Ready to join our school family?</h2><p>Send an admission enquiry and our office will contact you.</p></div>
            <Link to="/admissions" className="btn btn-lg">Start your enquiry <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
