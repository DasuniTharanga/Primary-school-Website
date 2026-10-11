import { Link } from 'react-router-dom';
import { Award, GraduationCap } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/api';
import { Avatar, Badge, Empty, ErrorBox, Loading } from '@/components/ui';

export default function Teachers() {
  const { data, error, loading, reload } = useApi<any>('/api/public/teachers');
  return (
    <>
      <PageHeader eyebrow="Our teachers" title="Meet our teachers">Dedicated, qualified and caring — the people who guide our children every day.</PageHeader>
      <section className="section tight"><div className="container">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.teachers.length ? <Empty title="No teachers listed yet" /> : (
          <div className="grid c3">
            {data.teachers.map((t: any) => (
              <article className="card teacher-card" key={t.id}>
                <Avatar name={t.name} />
                <h3>{t.name}</h3>
                <p className="small muted">{t.classTeacherOf ? `Class teacher · ${t.classTeacherOf}` : 'Teaching staff'}</p>
                <div className="meta" style={{ justifyContent: 'center' }}>
                  {t.qualification && <span><GraduationCap size={14} />{t.qualification}</span>}
                  <span><Award size={14} />{t.experience} yrs experience</span>
                </div>
                <div className="chips">{t.subjects.map((x: string) => <Badge key={x}>{x}</Badge>)}</div>
                <Link to="/contact" className="btn btn-soft btn-sm" style={{ marginTop: 16 }}>Contact via office</Link>
              </article>
            ))}
          </div>
        )}
      </div></section>
    </>
  );
}
