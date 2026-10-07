import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';

export default function PageHeader({
  title,
  subtitle,
  kicker = 'Our school community',
}: {
  title: string;
  subtitle: string;
  kicker?: string;
}) {
  return (
    <section className="page-heading">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={13} />
          <span>{title}</span>
        </nav>
        <div className="eyebrow">
          <Sparkles size={15} />
          {kicker}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}
