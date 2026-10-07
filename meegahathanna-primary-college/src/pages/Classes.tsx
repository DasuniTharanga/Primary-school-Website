import { BookOpen } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ContentBrowser from '@/components/ContentBrowser';
import { Badge } from '@/components/ui';
export default function Classes() {
  return (
    <>
      <PageHeader
        title="Little learners. Big possibilities."
        subtitle="Explore the primary years, from a gentle first step to a confident next chapter."
        kicker="Our classes · Grades 1–5"
      />
      <section className="section container">
        <ContentBrowser
          kind="classes"
          emptyTitle="Class information is being updated"
          emptyText="Please contact the school office for current class information."
          renderItem={(item) => (
            <article className="class-card" key={item.id}>
              {item.imagePath ? (
                <img className="card-image" src={item.imagePath} alt={item.title} loading="lazy" />
              ) : (
                <div className="class-art">
                  <span>{item.data.grade}</span>
                  <BookOpen size={50} />
                </div>
              )}
              <div className="card-content">
                <Badge>Primary education</Badge>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                {item.body && <p className="preserve-lines">{item.body}</p>}
                {item.data.sections && (
                  <div className="detail-line">
                    <strong>Sections</strong>
                    <span>{item.data.sections}</span>
                  </div>
                )}
                {item.data.subjects && (
                  <div className="detail-line">
                    <strong>Learning areas</strong>
                    <span>{item.data.subjects}</span>
                  </div>
                )}
              </div>
            </article>
          )}
        />
      </section>
    </>
  );
}
