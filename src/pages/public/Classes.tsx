import { Link } from 'react-router-dom';
import { Users, UserCheck, BookOpen } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/api';
import { Empty, ErrorBox, Loading } from '@/components/ui';

export default function Classes() {
  const { data, error, loading, reload } = useApi<any>('/api/public/classes');
  return (
    <>
      <PageHeader eyebrow="Classes" title="Our classes">From Grade 1 to Grade 5 — a joyful path through primary school.</PageHeader>
      <section className="section tight"><div className="container">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.classes.length ? <Empty title="No classes yet" /> : (
          <div className="grid c3">
            {data.classes.map((g: any) => (
              <article className="card class-card" key={g.id}>
                <div className="row spread"><h3>{g.name}</h3><span className="badge"><Users size={12} /> {g.students} students</span></div>
                <p className="muted small" style={{ marginTop: 6 }}>{g.description}</p>
                <div className="kv">
                  <div><span><UserCheck size={13} style={{ verticalAlign: -2 }} /> Class teachers</span><span>{g.sections.length ? g.sections.map((s: any) => `${s.section}: ${s.classTeacher}`).join(' · ') : 'To be announced'}</span></div>
                  <div><span>Sections</span><span>{g.sections.length || '–'}</span></div>
                  <div><span><BookOpen size={13} style={{ verticalAlign: -2 }} /> Subjects</span><span>{g.subjects.join(', ') || '–'}</span></div>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="center" style={{ marginTop: 32 }}><Link to="/admissions" className="btn btn-primary">Enquire about admission</Link></div>
      </div></section>
    </>
  );
}
