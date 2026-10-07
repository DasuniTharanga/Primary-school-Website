import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Users,
  Image,
  Inbox,
  UserRound,
  Plus,
  FileText,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/hooks';
import { formatDate } from '@/lib/api';
import { Alert, Loading, Badge } from '@/components/ui';
import type { DashboardData, Kind } from '@/types';
const tiles: [Kind, string, typeof Bell][] = [
  ['notices', 'School notices', Bell],
  ['events', 'School events', CalendarDays],
  ['teachers', 'Teacher profiles', Users],
  ['classes', 'Class pages', BookOpen],
  ['gallery', 'Gallery photos', Image],
  ['resources', 'Learning resources', FileText],
];
export default function Dashboard() {
  const { user } = useAuth(),
    { data, loading, error, reload } = useApi<DashboardData>('/api/admin/dashboard');
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">A little care, every day</div>
          <h1>Hello, {user?.name.split(' ')[0]}.</h1>
          <p>Here’s what’s happening across your school website.</p>
        </div>
        <Link className="button small" to="/admin/content/notices">
          <Plus size={17} />
          Manage notices
        </Link>
      </div>
      {error ? (
        <Alert onRetry={reload}>{error}</Alert>
      ) : loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="stat-grid">
              {tiles.map(([kind, title, Icon]) => (
                <Link key={kind} to={`/admin/content/${kind}`} className="stat-card">
                  <div className="stat-title">
                    <span>{title}</span>
                    <Icon size={19} />
                  </div>
                  <strong>{data.contentCounts[kind].total}</strong>
                  <span className="muted">
                    {data.contentCounts[kind].published || 0} published ·{' '}
                    {data.contentCounts[kind].total - (data.contentCounts[kind].published || 0)}{' '}
                    drafts
                  </span>
                </Link>
              ))}
            </div>
            {data.inbox && (
              <div className="two-grid inbox-shortcuts">
                <Link to="/admin/admissions">
                  <UserRound size={26} />
                  <div>
                    <strong>{data.inbox.admissions} new admissions enquiries</strong>
                    <span>Review and follow up with families</span>
                  </div>
                  <ArrowUpRight size={21} />
                </Link>
                <Link to="/admin/messages">
                  <Inbox size={26} />
                  <div>
                    <strong>{data.inbox.messages} new messages</strong>
                    <span>Keep conversations moving</span>
                  </div>
                  <ArrowUpRight size={21} />
                </Link>
              </div>
            )}
            <div className="admin-panel">
              <div className="panel-heading">
                <h2>Recently updated content</h2>
                <span className="muted">Latest 5 items</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Content</th>
                      <th>Section</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                        </td>
                        <td className="capitalize">{item.kind}</td>
                        <td>
                          <Badge tone={item.status}>{item.status}</Badge>
                        </td>
                        <td>{formatDate(item.updatedAt)}</td>
                        <td>
                          <Link className="text-link" to={`/admin/content/${item.kind}`}>
                            Manage
                            <ArrowUpRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="admin-tip">
              <BookOpen size={23} />
              <div>
                <h3>Make it your school.</h3>
                <p>
                  {user?.role === 'ADMIN'
                    ? 'Add confirmed contact details and your principal’s message in School settings. '
                    : ''}
                  Check the imported teacher names, then publish the profiles you want families to
                  see.
                </p>
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}
