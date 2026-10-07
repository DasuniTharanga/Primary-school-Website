import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, MapPin, Pin } from 'lucide-react';
import { Badge } from './ui';
import { formatDate } from '@/lib/api';
import type { ContentItem } from '@/types';

export function NoticeCard({ item }: { item: ContentItem }) {
  return (
    <article className="notice-card">
      <div className="card-meta">
        <Badge>{item.category || 'School news'}</Badge>
        {item.data.pinned && <Pin size={15} aria-label="Pinned notice" />}
      </div>
      <h3>
        <Link to={`/notices/${item.id}`}>{item.title}</Link>
      </h3>
      <p>{item.summary}</p>
      <div className="card-bottom">
        <time dateTime={item.publishedAt || undefined}>{formatDate(item.publishedAt)}</time>
        <Link to={`/notices/${item.id}`} className="round-link" aria-label={`Read ${item.title}`}>
          <ArrowUpRight size={20} />
        </Link>
      </div>
    </article>
  );
}
export function EventCard({ item }: { item: ContentItem }) {
  return (
    <article className="event-card">
      {item.imagePath ? (
        <img src={item.imagePath} alt={item.title} loading="lazy" className="card-image" />
      ) : (
        <div className="event-art">
          <CalendarDays size={42} />
          <span>{item.category || 'School event'}</span>
        </div>
      )}
      <div className="card-content">
        <Badge>
          {formatDate(item.data.date)}
          {item.data.time ? ` · ${item.data.time}` : ''}
        </Badge>
        <h3>
          <Link to={`/events/${item.id}`}>{item.title}</Link>
        </h3>
        <p>{item.summary}</p>
        {item.data.location && (
          <span className="muted icon-line">
            <MapPin size={15} />
            {item.data.location}
          </span>
        )}
        <Link to={`/events/${item.id}`} className="text-link">
          Event details
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
