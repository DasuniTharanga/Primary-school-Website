import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Clock, BookOpen, CalendarDays, Save, CheckCheck } from 'lucide-react';
import { useTeacher } from './TeacherLayout';
import { api } from '@/lib/api';
import { Badge, Empty, ErrorBox, Field, Loading, Notice, Progress, StatCard, Toast, categoryTone } from '@/components/ui';
import { fmtDate, fmtDay, fmtMonth, fmtTime, gradeOf, today } from '@/lib/format';

export function TeacherOverview() {
  const { data } = useTeacher();
  const t = data.todayStats;
  const total = data.totalStudents;
  return (
    <>
      <div className="welcome"><div><h2>Good day, {data.teacher.name}</h2><p>{fmtDate(data.today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        {data.myClasses.length > 0 && <Link to="/teacher/attendance" className="btn" style={{ background: '#fff', color: 'var(--primary)' }}>Mark today's attendance</Link>}</div>
      <div className="grid c4">
        <StatCard icon={<Users size={22} />} value={total} label="My students" />
        <StatCard icon={<UserCheck size={22} />} tone="green" value={t.present} label="Present today" />
        <StatCard icon={<Clock size={22} />} tone="amber" value={t.late} label="Late today" />
        <StatCard icon={<UserX size={22} />} tone="red" value={t.absent} label="Absent today" />
      </div>
      {total > 0 && t.marked < total && <div className="alert info">Attendance has been marked for {t.marked} of {total} students today.</div>}
      <div className="grid c2">
        <div className="card"><div className="card-head"><h3>My classes</h3></div>
          {data.myClasses.length ? data.myClasses.map((c: any) => (
            <div className="item" key={c.id}><div className="icon-box"><Users size={20} /></div>
              <div className="grow"><h3>{c.name}</h3><p className="small muted">Class teacher · {c.students} of {c.capacity} students</p><div style={{ marginTop: 8 }}><Progress value={(100 * c.students) / c.capacity} /></div></div></div>
          )) : <Empty title="You are not a class teacher this year" />}
        </div>
        <div className="card"><div className="card-head"><h3>Subjects I teach</h3></div>
          {data.teaching.length ? data.teaching.map((x: any) => (
            <div className="item" key={`${x.classId}-${x.subjectId}`}><div className="icon-box blue"><BookOpen size={20} /></div>
              <div><h3>{x.subject}</h3><p className="small muted">{x.className} · {x.students} students</p></div></div>
          )) : <Empty title="No subjects assigned" />}
          {data.teaching.length > 0 && <Link to="/teacher/results" className="btn btn-soft btn-sm" style={{ marginTop: 14 }}>Enter marks</Link>}
        </div>
      </div>
      <div className="grid c2">
        <div className="card"><div className="card-head"><h3>Recent activity</h3></div>
          {data.activity.length ? data.activity.map((a: any) => (
            <div className="item" key={a.date}><div className="icon-box green"><CheckCheck size={20} /></div>
              <div><h3>Attendance marked</h3><p className="small muted">{fmtDate(a.date)} · {a.records} records · {a.absent} absent</p></div></div>
          )) : <p className="muted">No attendance marked yet.</p>}
        </div>
        <div className="card"><div className="card-head"><h3>Upcoming events</h3></div>
          {data.events.map((e: any) => (
            <div className="item" key={e.id}><div className="date-chip"><b>{fmtDay(e.date)}</b><span>{fmtMonth(e.date)}</span></div>
              <div className="grow"><h3>{e.title}</h3><div className="meta"><span><CalendarDays size={12} />{fmtTime(e.time)}</span><span>{e.location}</span></div></div><Badge tone={categoryTone(e.category)}>{e.category}</Badge></div>
          ))}
        </div>
      </div>
    </>
  );
}

type Status = 'Present' | 'Absent' | 'Late';
interface Row { id: number; admissionNo: string; name: string; status: Status | null; remarks: string }

export function TeacherAttendance() {
  const { data, reload } = useTeacher();
  const classes: any[] = data.myClasses;
  const [classId, setClassId] = useState<number | null>(classes[0]?.id ?? null);
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!classId) return;
    setLoading(true); setError('');
    api<{ students: Row[] }>(`/api/teacher/classes/${classId}/attendance?date=${date}`)
      .then((r) => setRows(r.students)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [classId, date]);

  const set = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const counts = useMemo(() => ({ p: rows.filter((r) => r.status === 'Present').length, l: rows.filter((r) => r.status === 'Late').length, a: rows.filter((r) => r.status === 'Absent').length, n: rows.filter((r) => !r.status).length }), [rows]);

  async function save() {
    const records = rows.filter((r) => r.status).map((r) => ({ studentId: r.id, status: r.status, remarks: r.remarks }));
    if (!records.length) { setError('Mark at least one student first.'); return; }
    setSaving(true); setError('');
    try { await api(`/api/teacher/classes/${classId}/attendance`, { method: 'POST', body: { date, records } }); setToast(`Attendance saved for ${records.length} students`); reload(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (!classes.length) return <div className="card"><Empty title="You are not a class teacher this year" hint="Only class teachers mark daily attendance." /></div>;
  return (
    <>
      <div className="card">
        <div className="toolbar">
          {classes.length > 1 && <select className="select" value={classId ?? ''} onChange={(e) => setClassId(Number(e.target.value))} aria-label="Class">{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          {classes.length === 1 && <Badge tone="blue">{classes[0].name}</Badge>}
          <input className="input" type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          <button className="btn btn-soft" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, status: 'Present' })))}><CheckCheck size={16} /> Mark all present</button>
          <div className="grow" />
          <span className="small muted">{counts.p} present · {counts.l} late · {counts.a} absent · {counts.n} unmarked</span>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}><Save size={16} /> {saving ? 'Saving…' : 'Save attendance'}</button>
        </div>
        {error && <ErrorBox message={error} />}
        {loading ? <Loading /> : !rows.length ? <Empty title="No students in this class" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Adm. no</th><th>Student</th><th>Status</th><th>Remarks</th></tr></thead><tbody>
            {rows.map((r) => (
              <tr key={r.id}><td className="muted">{r.admissionNo}</td><td><b>{r.name}</b></td>
                <td><div className="seg" role="group" aria-label={`Attendance for ${r.name}`}>
                  <button className={r.status === 'Present' ? 'on p' : ''} onClick={() => set(r.id, { status: 'Present' })}>Present</button>
                  <button className={r.status === 'Late' ? 'on l' : ''} onClick={() => set(r.id, { status: 'Late' })}>Late</button>
                  <button className={r.status === 'Absent' ? 'on a' : ''} onClick={() => set(r.id, { status: 'Absent' })}>Absent</button></div></td>
                <td><input className="input" style={{ minWidth: 180 }} value={r.remarks} maxLength={150} placeholder="Optional note" onChange={(e) => set(r.id, { remarks: e.target.value })} aria-label={`Remarks for ${r.name}`} /></td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}

interface MarkRow { id: number; admissionNo: string; name: string; marks: number | null }

export function TeacherResults() {
  const { data } = useTeacher();
  const teaching: any[] = data.teaching, exams: any[] = data.exams;
  const [pick, setPick] = useState(teaching.length ? `${teaching[0].classId}:${teaching[0].subjectId}` : '');
  const [examId, setExamId] = useState<number | null>(exams[0]?.id ?? null);
  const [rows, setRows] = useState<{ id: number; admissionNo: string; name: string; marks: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [classId, subjectId] = pick.split(':').map(Number);

  useEffect(() => {
    if (!pick || !examId) return;
    setLoading(true); setError('');
    api<{ students: MarkRow[] }>(`/api/teacher/classes/${classId}/results?examId=${examId}&subjectId=${subjectId}`)
      .then((r) => setRows(r.students.map((s) => ({ ...s, marks: s.marks == null ? '' : String(s.marks) }))))
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [pick, examId, classId, subjectId]);

  const invalid = rows.some((r) => r.marks !== '' && (isNaN(Number(r.marks)) || Number(r.marks) < 0 || Number(r.marks) > 100));
  async function save() {
    setSaving(true); setError('');
    try {
      const r = await api<{ saved: number }>(`/api/teacher/classes/${classId}/results`, { method: 'POST', body: { examId, subjectId, marks: rows.map((x) => ({ studentId: x.id, marks: x.marks === '' ? null : Number(x.marks) })) } });
      setToast(`Saved marks for ${r.saved} students`);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (!teaching.length) return <div className="card"><Empty title="No subjects assigned to you" hint="Ask the school office to assign your subjects." /></div>;
  return (
    <>
      <div className="card">
        <div className="toolbar">
          <Field label="Class & subject"><select className="select" value={pick} onChange={(e) => setPick(e.target.value)}>{teaching.map((x) => <option key={`${x.classId}:${x.subjectId}`} value={`${x.classId}:${x.subjectId}`}>{x.className} — {x.subject}</option>)}</select></Field>
          <Field label="Exam"><select className="select" value={examId ?? ''} onChange={(e) => setExamId(Number(e.target.value))}>{exams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <div className="grow" />
          <button className="btn btn-primary" onClick={save} disabled={saving || loading || invalid}><Save size={16} /> {saving ? 'Saving…' : 'Save marks'}</button>
        </div>
        {invalid && <Notice kind="error">Marks must be numbers between 0 and 100.</Notice>}
        {error && <ErrorBox message={error} />}
        {loading ? <Loading /> : !rows.length ? <Empty title="No students in this class" /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Adm. no</th><th>Student</th><th>Marks (0–100)</th><th>Grade</th></tr></thead><tbody>
            {rows.map((r, i) => {
              const n = Number(r.marks);
              return (
                <tr key={r.id}><td className="muted">{r.admissionNo}</td><td><b>{r.name}</b></td>
                  <td><input className="input mark-input" inputMode="decimal" value={r.marks} aria-label={`Marks for ${r.name}`} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, marks: e.target.value } : x)))} /></td>
                  <td>{r.marks !== '' && !isNaN(n) && n >= 0 && n <= 100 ? <span className={`grade-chip ${gradeOf(n)}`}>{gradeOf(n)}</span> : <span className="muted">–</span>}</td></tr>
              );
            })}
          </tbody></table></div>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
