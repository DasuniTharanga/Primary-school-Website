import { Link } from 'react-router-dom';
import { Users, GraduationCap, School, ClipboardList, MessageSquare, CalendarDays, AlertTriangle } from 'lucide-react';
import { useAdmin } from './AdminLayout';
import { Badge, Empty, ErrorBox, Loading, Progress, StatCard, categoryTone, pctTone } from '@/components/ui';
import { fmtDate, fmtDay, fmtMonth } from '@/lib/format';

export default function AdminOverview() {
  const { data, error, loading, reload } = useAdmin();
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Loading />;
  const c = data.counts, a = data.attendance;
  const rate = a && a.total ? Math.round((1000 * (a.present + a.late)) / a.total) / 10 : null;
  return (
    <>
      <div className="grid c4">
        <StatCard icon={<Users size={22} />} value={c.students} label="Students" />
        <StatCard icon={<GraduationCap size={22} />} tone="green" value={c.teachers} label="Teachers" />
        <StatCard icon={<School size={22} />} tone="blue" value={c.classes} label="Classes" />
        <StatCard icon={<CalendarDays size={22} />} tone="amber" value={c.upcomingEvents} label="Upcoming events" />
      </div>
      <div className="grid c32">
        <div className="card">
          <div className="card-head"><h3>Class occupancy</h3><Link to="/admin/students" className="btn btn-soft btn-sm">View students</Link></div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Class</th><th>Class teacher</th><th style={{ width: '32%' }}>Students</th></tr></thead><tbody>
            {data.occupancy.map((o: any) => <tr key={o.name}><td><b>{o.name}</b></td><td>{o.teacher}</td>
              <td><div className="row" style={{ flexWrap: 'nowrap' }}><span style={{ width: 54 }}>{o.students}/{o.capacity}</span><div className="grow"><Progress value={(100 * o.students) / o.capacity} /></div></div></td></tr>)}
          </tbody></table></div>
        </div>
        <div className="stack">
          <div className="card"><div className="card-head"><h3>Latest attendance</h3>{a && <span className="small muted">{fmtDate(a.date)}</span>}</div>
            {a ? <><div className="stat"><b>{rate}%</b><span>attended ({a.present} present, {a.late} late, {a.absent} absent)</span></div><div style={{ marginTop: 12 }}><Progress value={rate ?? 0} tone={pctTone(rate)} /></div></> : <p className="muted">No attendance recorded yet.</p>}
          </div>
          <div className="card"><div className="card-head"><h3>Needs attention</h3></div>
            <div className="stack">
              <Link to="/admin/admissions" className="row"><div className="icon-box amber"><ClipboardList size={18} /></div><div><b style={{ color: 'var(--ink)' }}>{c.newAdmissions} new admission enquiries</b></div></Link>
              <Link to="/admin/messages" className="row"><div className="icon-box blue"><MessageSquare size={18} /></div><div><b style={{ color: 'var(--ink)' }}>{c.newMessages} unread messages</b></div></Link>
            </div></div>
        </div>
      </div>
      <div className="grid c2">
        <div className="card"><div className="card-head"><h3>Recent admission enquiries</h3><Link to="/admin/admissions" className="btn btn-soft btn-sm">View all</Link></div>
          {data.admissions.length ? data.admissions.map((x: any) => (
            <div className="item" key={x.id}><div className="grow"><h3>{x.childName}</h3><p className="small muted">{x.grade} · {x.parentName} · {fmtDate(x.createdAt)}</p></div><Badge tone={x.status === 'New' ? 'amber' : x.status === 'Contacted' ? 'blue' : 'grey'}>{x.status}</Badge></div>
          )) : <Empty title="No enquiries yet" />}
        </div>
        <div className="card"><div className="card-head"><h3>Upcoming events</h3><Link to="/admin/events" className="btn btn-soft btn-sm">Manage</Link></div>
          {data.events.map((e: any) => <div className="item" key={e.id}><div className="date-chip"><b>{fmtDay(e.date)}</b><span>{fmtMonth(e.date)}</span></div><div className="grow"><h3>{e.title}</h3><p className="small muted">{e.location}</p></div><Badge tone={categoryTone(e.category)}>{e.category}</Badge></div>)}
        </div>
      </div>
      <div className="grid c2">
        <div className="card"><div className="card-head"><h3>Average marks by subject</h3></div>
          {data.subjects.length ? data.subjects.map((s: any) => <div key={s.name} style={{ marginBottom: 12 }}><div className="row spread small"><b>{s.name}</b><span>{s.average}</span></div><Progress value={s.average} /></div>) : <Empty title="No results entered yet" />}
        </div>
        <div className="card"><div className="card-head"><h3>Students needing extra support</h3></div>
          {data.support.length ? data.support.map((s: any) => <div className="item" key={s.name}><div className="icon-box red"><AlertTriangle size={18} /></div><div><h3>{s.name}</h3><p className="small muted">Average marks {s.average}</p></div></div>) : <p className="muted">No students are currently averaging below 50.</p>}
        </div>
      </div>
    </>
  );
}
