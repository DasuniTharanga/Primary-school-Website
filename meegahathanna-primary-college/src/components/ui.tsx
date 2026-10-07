import {
  useEffect,
  useRef,
  useId,
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  X,
  BookOpen,
} from 'lucide-react';

export function Alert({
  children,
  success = false,
  onRetry,
}: {
  children: ReactNode;
  success?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className={`alert ${success ? 'success' : 'error'}`} role={success ? 'status' : 'alert'}>
      {success ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
      <span>{children}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  title = 'Nothing here yet',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="icon-tile">
        <BookOpen size={24} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (n: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="button secondary small"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ArrowLeft size={16} />
        Previous
      </button>
      <span>
        Page {page} of {pages} · {total} items
      </span>
      <button
        className="button secondary small"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ArrowRight size={16} />
      </button>
    </nav>
  );
}
export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.classList.add('modal-open');
    ref.current?.querySelector<HTMLElement>('button,input,textarea,select,a')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea,select,a[href],[tabindex="0"]',
          ) || [],
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-top">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  function connect(node: ReactNode): ReactNode {
    if (!isValidElement<HTMLAttributes<HTMLElement>>(node)) return node;
    if (typeof node.type === 'string' && ['input', 'select', 'textarea'].includes(node.type)) {
      return cloneElement(node, { id, 'aria-describedby': hint ? `${id}-hint` : undefined });
    }
    return node.props.children
      ? cloneElement(node, { children: Children.map(node.props.children, connect) })
      : node;
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, connect)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
