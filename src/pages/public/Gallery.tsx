import { useState } from 'react';
import { X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/api';
import { Badge, Empty, ErrorBox, Loading } from '@/components/ui';

export default function Gallery() {
  const { data, error, loading, reload } = useApi<any>('/api/public/gallery');
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<any>(null);
  const items: any[] = data?.items ?? [];
  const cats = ['All', ...Array.from(new Set(items.map((i) => i.category)))];
  const shown = cat === 'All' ? items : items.filter((i) => i.category === cat);
  return (
    <>
      <PageHeader eyebrow="Gallery" title="School gallery">Moments from school life.</PageHeader>
      <section className="section tight"><div className="container">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !items.length ? <Empty title="No photos yet" /> : (
          <>
            <div className="tabs">{cats.map((c) => <button key={c} className={`tab ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
            <div className="gallery-grid">
              {shown.map((i) => (
                <button className="gallery-item" key={i.id} onClick={() => setOpen(i)} aria-label={`View ${i.title}`}>
                  <img src={i.image} alt={i.title} loading="lazy" />
                  <div className="cap"><b>{i.title}</b><Badge>{i.category}</Badge></div>
                </button>
              ))}
            </div>
          </>
        )}
      </div></section>
      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button className="btn btn-ghost" onClick={() => setOpen(null)} aria-label="Close"><X size={18} /></button>
          <img src={open.image} alt={open.title} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
