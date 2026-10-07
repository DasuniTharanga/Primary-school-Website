import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  HeartHandshake,
  Sparkles,
  Bell,
  CalendarDays,
  GraduationCap,
  Sprout,
  ArrowRight,
} from 'lucide-react';
import { useSchool } from '@/context/SchoolContext';
import { useApi } from '@/lib/hooks';
import { Loading, Alert, Empty } from '@/components/ui';
import { NoticeCard, EventCard } from '@/components/ContentCards';
import type { ContentPage } from '@/types';

export default function Home() {
  const { settings } = useSchool(),
    notices = useApi<ContentPage>('/api/content/notices?limit=3'),
    events = useApi<ContentPage>('/api/content/events?limit=3&period=upcoming');
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-dot" />A warm welcome to our school
            </div>
            <h1>
              Small steps.
              <br />
              <em>Bright futures.</em>
            </h1>
            <p className="hero-school-name">{settings.name}</p>
            <p className="hero-description">
              A place to learn with curiosity, grow with kindness, and discover the joy in every new
              day.
            </p>
            <div className="button-row">
              <Link to="/about" className="button">
                Discover our school
                <ArrowUpRight size={18} />
              </Link>
              <Link
                to={settings.admissionsOpen ? '/admissions' : '/contact'}
                className="button secondary"
              >
                {settings.admissionsOpen ? 'Admissions enquiries' : 'Contact our school'}
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <HeartHandshake size={20} />
              <span>
                Children. Families. Teachers.
                <br />
                <strong>One caring school community.</strong>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src={settings.heroImage || '/school-illustration.svg'}
              alt={
                settings.heroImage
                  ? 'School photograph'
                  : 'Illustration of a welcoming school with books and trees'
              }
              width="620"
              height="560"
              fetchPriority="high"
              className={settings.heroImage ? 'hero-photo' : ''}
            />
            <div className="hero-sticker">
              <Sparkles size={23} />
              <span>
                A little curiosity.
                <br />
                <strong>A world of possibility.</strong>
              </span>
            </div>
            <div className="hero-label">
              <BookOpen size={16} />
              Learning begins here
            </div>
          </div>
        </div>
      </section>
      <div className="container quick-links">
        <Link to="/classes">
          <GraduationCap />
          <div>
            <strong>Grades 1–5</strong>
            <span>A foundation for every learner</span>
          </div>
          <ArrowUpRight size={19} />
        </Link>
        <Link to="/notices">
          <Bell />
          <div>
            <strong>School notice board</strong>
            <span>Stay close to the latest updates</span>
          </div>
          <ArrowUpRight size={19} />
        </Link>
        <Link to="/resources">
          <BookOpen />
          <div>
            <strong>Learning resources</strong>
            <span>Little tools for growing minds</span>
          </div>
          <ArrowUpRight size={19} />
        </Link>
      </div>
      <section className="section container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Growing together</div>
            <h2>More than a classroom.</h2>
          </div>
          <p>We bring learning, creativity and care together throughout the primary years.</p>
        </div>
        <div className="values-grid">
          {[
            {
              Icon: BookOpen,
              title: 'A love for learning',
              text: 'Reading, questions and discovery help children build strong foundations.',
            },
            {
              Icon: Sprout,
              title: 'Room to grow',
              text: 'Art, play and exploration give every child a chance to find their strengths.',
            },
            {
              Icon: HeartHandshake,
              title: 'A caring community',
              text: 'Families and teachers work together to support each child’s journey.',
            },
          ].map(({ Icon, title, text }, i) => (
            <article className="value-card" key={title}>
              <span className="value-number">0{i + 1}</span>
              <div className="icon-tile">
                <Icon size={27} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section tinted">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <Bell size={15} />
                The notice board
              </div>
              <h2>News for our families.</h2>
            </div>
            <Link to="/notices" className="text-link">
              All notices
              <ArrowUpRight size={17} />
            </Link>
          </div>
          {notices.error ? (
            <Alert onRetry={notices.reload}>{notices.error}</Alert>
          ) : notices.loading ? (
            <Loading />
          ) : notices.data?.items.length ? (
            <div className="card-grid">
              {notices.data.items.map((item) => (
                <NoticeCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Empty title="School updates will appear here">
              Check back for the latest messages from the school office.
            </Empty>
          )}
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <CalendarDays size={15} />
              School life
            </div>
            <h2>Dates to look forward to.</h2>
          </div>
          <Link to="/events" className="text-link">
            View events
            <ArrowUpRight size={17} />
          </Link>
        </div>
        {events.error ? (
          <Alert onRetry={events.reload}>{events.error}</Alert>
        ) : events.loading ? (
          <Loading />
        ) : events.data?.items.length ? (
          <div className="card-grid">
            {events.data.items.map((item) => (
              <EventCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="quiet-event">
            <div className="icon-tile">
              <CalendarDays size={26} />
            </div>
            <div>
              <h3>A new chapter is on its way.</h3>
              <p>
                Confirmed school events will be shared here. Explore our classes while you wait.
              </p>
            </div>
            <Link to="/classes" className="button secondary small">
              Our classes
              <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <section className="container family-callout">
        <div>
          <div className="eyebrow">Let’s start a conversation</div>
          <h2>
            Your child’s next chapter
            <br />
            starts with a little hello.
          </h2>
          <p>Get in touch with our school office about learning, admissions or school life.</p>
        </div>
        <Link to="/contact" className="button light">
          Say hello
          <ArrowUpRight size={19} />
        </Link>
      </section>
    </>
  );
}
