import { CalendarCheck, GraduationCap, School, CalendarDays, Clock, MapPin, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useParent } from './ParentLayout';
import { Avatar, Badge, Empty, Progress, StatCard, categoryTone, pctTone } from '@/components/ui';
import { fmtDate, fmtDay, fmtMonth, fmtTime, plural } from '@/lib/format';

function ChildPicker() {
  const { data, child, setChildId } = useParent();
  if (!child) return null;
  return (
    <div className="welcome">
      <div className="row"><Avatar name={child.name} size="lg" />
        <div><h2>{child.name}</h2><p>{child.className ?? 'Not enrolled this year'} · Admission no. {child.admissionNo}</p></div></div>
      {data.children.length > 1 && (
        <select className="select" aria-label="Choose child" value={child.id} onChange={(e) => setChildId(Number(e.target.value))}>
          {data.children.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}

const NoChild = () => <div className="card"><Empty title="No children linked to your account" hint="Please contact the school office." /></div>;

export function ParentOverview() {
  const { data, child } = useParent();
  if (!child) return <NoChild />;
  const a = child.attendance;
  const recent = child.results.slice(-5).reverse();
  return (
    <>
      <p className="muted">Welcome back, {data.guardian?.name}.</p>
      <ChildPicker />
      <div className="grid c4">
        <StatCard icon={<CalendarCheck size={22} />} tone="green" value={a.percentage == null ? '–' : `${a.percentage}%`} label="Attendance" />
        <StatCard icon={<GraduationCap size={22} />} tone="blue" value={child.average == null ? '–' : `${child.average}`} label={child.averageGrade ? `Average marks (grade ${child.averageGrade})` : 'Average marks'} />
        <StatCard icon={<School size={22} />} value={child.className ?? '–'} label="Class" />
        <StatCard icon={<UserRound size={22} />} tone="amber" value={child.classTeacher?.replace(/^(Mrs?|Ms)\.\s*/, '') ?? '–'} label="Class teacher" />
      </div>
      <div className="grid c32">
        <div className="card">
          <div className="card-head"><h3>Recent results</h3><Link to="/parent/results" className="btn btn-soft btn-sm">All results</Link></div>
          {recent.length ? (
            <div className="table-wrap"><table className="table"><thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Grade</th></tr></thead><tbody>
              {recent.map((r: any, i: number) => <tr key={i}><td><b>{r.subject}</b></td><td>{r.exam}</td><td>{r.marks}</td><td><span className={`grade-chip ${r.grade}`}>{r.grade}</span></td></tr>)}
            </tbody></table></div>
          ) : <Empty title="No results published yet" />}
        </div>
        <div className="card">
          <div className="card-head"><h3>Upcoming events</h3></div>
          {data.events.length ? data.events.slice(0, 4).map((e: any) => (
            <div className="item" key={e.id}><div className="date-chip"><b>{fmtDay(e.date)}</b><span>{fmtMonth(e.date)}</span></div>
              <div><h3>{e.title}</h3><div className="meta"><span><Clock size={12} />{fmtTime(e.time)}</span></div></div></div>
          )) : <p className="muted">No upcoming events.</p>}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Recent announcements</h3><Link to="/parent/events" className="btn btn-soft btn-sm">View all</Link></div>
        <div className="grid c3">
          {data.news.slice(0, 3).map((n: any) => <div key={n.id}><Badge>{n.category}</Badge><h3 style={{ margin: '8px 0 4px' }}>{n.title}</h3><p className="small muted">{n.summary}</p></div>)}
        </div>
      </div>
    </>
  );
}

export function ParentResults() {
  const { child } = useParent();
  if (!child) return <NoChild />;
  const exams = Array.from(new Map<number, any>(child.results.map((r: any) => [r.examId, r])).values());
  return (
    <>
      <ChildPicker />
      {!exams.length ? <div className="card"><Empty title="No results published yet" /></div> : exams.map((ex: any) => {
        const rows = child.results.filter((r: any) => r.examId === ex.examId);
        const avg = Math.round((rows.reduce((n: number, r: any) => n + r.marks, 0) / rows.length) * 10) / 10;
        return (
          <div className="card" key={ex.examId}>
            <div className="card-head"><div><h3>{ex.exam}</h3><span className="small muted">{ex.examDate ? fmtDate(ex.examDate) : `Term ${ex.term}`}</span></div><Badge tone="blue">Average {avg}</Badge></div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Subject</th><th style={{ width: '40%' }}>Marks</th><th>Grade</th></tr></thead><tbody>
              {rows.map((r: any) => <tr key={r.subject}><td><b>{r.subject}</b></td>
                <td><div className="row" style={{ flexWrap: 'nowrap' }}><span style={{ width: 44 }}>{r.marks}</span><div className="grow"><Progress value={r.marks} tone={r.marks >= 75 ? 'green' : r.marks >= 55 ? '' : r.marks >= 35 ? 'amber' : 'red'} /></div></div></td>
                <td><span className={`grade-chip ${r.grade}`}>{r.grade}</span></td></tr>)}
            </tbody></table></div>
          </div>
        );
      })}
      <p className="small muted">Grades: A 75+ · B 65–74 · C 55–64 · S 35–54 · W below 35</p>
    </>
  );
}

export function ParentAttendance() {
  const { child } = useParent();
  if (!child) return <NoChild />;
  const a = child.attendance;
  return (
    <>
      <ChildPicker />
      <div className="grid c4">
        <StatCard icon={<CalendarCheck size={22} />} tone="green" value={a.percentage == null ? '–' : `${a.percentage}%`} label="Attendance rate" />
        <StatCard icon={<CalendarCheck size={22} />} value={a.present} label="Days present" />
        <StatCard icon={<Clock size={22} />} tone="amber" value={a.late} label="Days late" />
        <StatCard icon={<CalendarDays size={22} />} tone="red" value={a.absent} label="Days absent" />
      </div>
      <div className="card">
        <div className="card-head"><h3>Recent attendance</h3><span className="small muted">{plural(a.total, 'day')} recorded</span></div>
        {a.percentage != null && <div style={{ marginBottom: 16 }}><Progress value={a.percentage} tone={pctTone(a.percentage)} /></div>}
        {child.recentAttendance.length ? (
          <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead><tbody>
            {child.recentAttendance.map((r: any) => <tr key={r.date}><td>{fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td><Badge tone={r.status === 'Present' ? 'green' : r.status === 'Late' ? 'amber' : 'red'}>{r.status}</Badge></td><td className="muted">{r.remarks ?? ''}</td></tr>)}
          </tbody></table></div>
        ) : <Empty title="No attendance recorded yet" />}
      </div>
    </>
  );
}

export function ParentEvents() {
  const { data } = useParent();
  return (
    <div className="grid c2">
      <div className="card"><div className="card-head"><h3>Upcoming events</h3></div>
        {data.events.length ? data.events.map((e: any) => (
          <div className="item" key={e.id}><div className="date-chip"><b>{fmtDay(e.date)}</b><span>{fmtMonth(e.date)}</span></div>
            <div><div className="row"><h3>{e.title}</h3><Badge tone={categoryTone(e.category)}>{e.category}</Badge></div>
              <p className="small muted">{e.description}</p>
              <div className="meta"><span><Clock size={12} />{fmtTime(e.time)}</span><span><MapPin size={12} />{e.location}</span></div></div></div>
        )) : <Empty title="No upcoming events" />}
      </div>
      <div className="card"><div className="card-head"><h3>Announcements</h3></div>
        {data.news.map((n: any) => <div className="item" key={n.id}><div><Badge>{n.category}</Badge><h3 style={{ margin: '6px 0 2px' }}>{n.title}</h3><p className="small muted">{n.summary}</p><div className="meta"><span>{fmtDate(n.date)}</span></div></div></div>)}
      </div>
    </div>
  );
}
