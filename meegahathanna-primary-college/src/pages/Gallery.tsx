import { useState } from 'react';
import { Expand } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ContentBrowser from '@/components/ContentBrowser';
import { Modal, Badge } from '@/components/ui';
import type { ContentItem } from '@/types';
export default function Gallery() {
  const [selected, setSelected] = useState<ContentItem | null>(null);
  return (
    <>
      <PageHeader
        title="Small moments. Lasting memories."
        subtitle="A glimpse into the learning, creativity and friendships that make school life special."
        kicker="Our school gallery"
      />
      <section className="section container">
        <ContentBrowser
          kind="gallery"
          emptyTitle="Our school album is growing"
          emptyText="School photographs will be shared here as they are approved for publication."
          renderItem={(item) => (
            <button
              className="gallery-card"
              key={item.id}
              onClick={() => setSelected(item)}
              aria-label={`View ${item.title}`}
            >
              <img src={item.imagePath} alt={item.data.alt || item.title} loading="lazy" />
              <div>
                <Badge>{item.category || 'School life'}</Badge>
                <h3>{item.title}</h3>
                <Expand size={19} />
              </div>
            </button>
          )}
        />
      </section>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} wide>
          <img
            className="lightbox-image"
            src={selected.imagePath}
            alt={selected.data.alt || selected.title}
          />
          <p className="preserve-lines">
            {selected.summary}
            {selected.body ? '\n\n' + selected.body : ''}
          </p>
        </Modal>
      )}
    </>
  );
}
