import { GraduationCap } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ContentBrowser from '@/components/ContentBrowser';
import { Badge } from '@/components/ui';
export default function Teachers() {
  return (
    <>
      <PageHeader
        title="The people behind every little step."
        subtitle="Meet the teachers who guide, encourage and inspire our young learners."
        kicker="Our teaching community"
      />
      <section className="section container">
        <ContentBrowser
          kind="teachers"
          emptyTitle="Our teacher directory is being updated"
          emptyText="The school will share confirmed teacher profiles here. Contact the school office for staff enquiries."
          renderItem={(item) => (
            <article className="teacher-card" key={item.id}>
              {item.imagePath ? (
                <img
                  className="teacher-photo"
                  src={item.imagePath}
                  alt={item.title}
                  loading="lazy"
                />
              ) : (
                <div className="teacher-avatar">
                  <GraduationCap size={48} />
                  <span>Our teaching community</span>
                </div>
              )}
              <div className="card-content">
                <Badge>{item.data.role || 'Teacher'}</Badge>
                <h3 lang={/[\u0D80-\u0DFF]/.test(item.title) ? 'si' : undefined}>{item.title}</h3>
                {item.data.subject && <p>{item.data.subject}</p>}
                {item.data.grade && <span className="muted">{item.data.grade}</span>}
                {item.summary && <p>{item.summary}</p>}
                {item.body && <p className="preserve-lines">{item.body}</p>}
              </div>
            </article>
          )}
        />
      </section>
    </>
  );
}
