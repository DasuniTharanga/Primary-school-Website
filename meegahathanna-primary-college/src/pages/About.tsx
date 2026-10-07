import { Heart, Eye, Target, BookOpen, Sprout, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useSchool } from '@/context/SchoolContext';
import { Loading } from '@/components/ui';
export default function About() {
  const { settings, loading } = useSchool();
  return (
    <>
      <PageHeader
        title="A school. A community."
        subtitle="A little closer to the people and values at the heart of Meegahathanna Primary College."
        kicker="About our college"
      />
      <section className="section container about-grid">
        <div>
          <div className="eyebrow">Our story</div>
          <h2>
            A place for young
            <br />
            minds to bloom.
          </h2>
          {loading ? <Loading /> : <p className="prose preserve-lines">{settings.about}</p>}
          <p className="muted">{settings.name}</p>
          <p lang="si" className="sinhala-text">
            {settings.sinhalaName}
          </p>
        </div>
        <img
          src={settings.heroImage || '/school-illustration.svg'}
          alt={
            settings.heroImage
              ? 'Our school'
              : 'Illustration of a school surrounded by trees and books'
          }
          className="about-image"
          width="620"
          height="560"
        />
      </section>
      <section className="tinted section">
        <div className="container two-grid">
          <article className="panel">
            <div className="icon-tile">
              <Eye />
            </div>
            <div className="eyebrow">Looking ahead</div>
            <h2>Our vision</h2>
            <p className="preserve-lines">{settings.vision}</p>
          </article>
          <article className="panel">
            <div className="icon-tile">
              <Target />
            </div>
            <div className="eyebrow">Every little day</div>
            <h2>Our mission</h2>
            <p className="preserve-lines">{settings.mission}</p>
          </article>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">What matters to us</div>
            <h2>Good roots. Bright growth.</h2>
          </div>
        </div>
        <div className="four-grid">
          {[
            { Icon: Heart, title: 'Kindness', text: 'Care for ourselves and one another.' },
            { Icon: BookOpen, title: 'Curiosity', text: 'Ask, explore and enjoy finding out.' },
            {
              Icon: Sprout,
              title: 'Confidence',
              text: 'Try, practise and grow a little each day.',
            },
            { Icon: Users, title: 'Togetherness', text: 'Learn and celebrate as a community.' },
          ].map(({ Icon, title, text }) => (
            <article className="simple-card" key={title}>
              <Icon size={27} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        {(settings.principalName || settings.principalMessage) && (
          <article className="principal-panel">
            <div className="eyebrow">From the principal’s desk</div>
            <h2>A message to our families.</h2>
            <p className="preserve-lines">{settings.principalMessage}</p>
            {settings.principalName && <strong>{settings.principalName}</strong>}
          </article>
        )}
      </section>
    </>
  );
}
