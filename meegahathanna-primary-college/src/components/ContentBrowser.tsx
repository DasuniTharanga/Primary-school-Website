import { useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useApi, useDebounce } from '@/lib/hooks';
import { Alert, Loading, Empty, Pagination } from './ui';
import type { ContentItem, ContentPage, Kind } from '@/types';

export default function ContentBrowser({
  kind,
  renderItem,
  emptyTitle,
  emptyText,
  gridClass = 'card-grid',
  period = false,
}: {
  kind: Kind;
  renderItem: (item: ContentItem) => ReactNode;
  emptyTitle: string;
  emptyText: string;
  gridClass?: string;
  period?: boolean;
}) {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [page, setPage] = useState(1),
    [selectedPeriod, setPeriod] = useState('upcoming');
  const query = new URLSearchParams({
    search: useDebounce(search),
    category,
    page: String(page),
    limit: '12',
    ...(period ? { period: selectedPeriod } : {}),
  });
  const { data, loading, error, reload } = useApi<ContentPage>(`/api/content/${kind}?${query}`);
  return (
    <>
      <div className="collection-tools">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label={`Search ${kind}`}
            placeholder={`Search ${kind}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="filters">
          {period && (
            <select
              aria-label="Event period"
              value={selectedPeriod}
              onChange={(e) => {
                setPeriod(e.target.value);
                setPage(1);
              }}
            >
              <option value="upcoming">Upcoming events</option>
              <option value="past">Past events</option>
              <option value="all">All events</option>
            </select>
          )}
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {data?.categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <Alert onRetry={reload}>{error}</Alert>
      ) : loading ? (
        <Loading />
      ) : data?.items.length ? (
        <>
          <div className={gridClass}>{data.items.map(renderItem)}</div>
          <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      ) : (
        <Empty title={search || category ? 'No matching results' : emptyTitle}>
          {search || category ? 'Try a different search or category.' : emptyText}
        </Empty>
      )}
    </>
  );
}
