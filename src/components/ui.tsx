import { useEffect, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Inbox, X } from 'lucide-react';
import { initials } from '@/lib/format';

export const Loading = () => <div className="spinner" role="status" aria-label="Loading" />;
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="alert error" role="alert">
    <AlertCircle size={18} /> <div>{message} {onRetry && <button className="btn btn-sm btn-ghost" onClick={onRetry}>Try again</button>}</div>
  </div>
);
export const Notice = ({ kind = 'ok', children }: { kind?: 'ok' | 'error' | 'info'; children: ReactNode }) => (
  <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    {kind === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} <div>{children}</div>
  </div>
);
export const Empty = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="empty"><Inbox size={34} /><div><b>{title}</b></div>{hint && <div className="small">{hint}</div>}</div>
);
export const Avatar = ({ name, size = '' }: { name: string; size?: '' | 'sm' | 'lg' }) => (
  <div className={`avatar ${size}`} aria-hidden="true">{initials(name)}</div>
);
export const Badge = ({ tone = '', children }: { tone?: '' | 'green' | 'amber' | 'red' | 'blue' | 'grey'; children: ReactNode }) => (
  <span className={`badge ${tone}`}>{children}</span>
);
export const StatCard = ({ icon, tone = '', value, label }: { icon: ReactNode; tone?: string; value: ReactNode; label: string }) => (
  <div className="card stat"><div className={`icon-box ${tone}`}>{icon}</div><div><b>{value}</b><span>{label}</span></div></div>
);
export const Progress = ({ value, tone = '' }: { value: number; tone?: '' | 'green' | 'amber' | 'red' }) => (
  <div className={`bar ${tone}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
);
export const pctTone = (p: number | null) => (p == null ? '' : p >= 90 ? 'green' : p >= 75 ? 'amber' : 'red') as '' | 'green' | 'amber' | 'red';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div className="field"><label>{label}</label>{children}{hint && <span className="small muted">{hint}</span>}</div>;
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [message, onDone]);
  return <div className="toast" role="status"><CheckCircle2 size={18} /> {message}</div>;
}

export const categoryTone = (c: string): '' | 'green' | 'amber' | 'red' | 'blue' =>
  ({ Sports: 'green', Celebration: 'amber', Arts: '', Educational: 'blue', Ceremony: 'red' } as Record<string, any>)[c] ?? '';
