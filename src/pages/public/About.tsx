import { Link } from 'react-router-dom';
import { Eye, Target, Heart, Lightbulb, ShieldCheck, Handshake, Sparkles } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useSettings } from '@/context/SchoolContext';
import { useApi } from '@/lib/api';

export default function About() {
  const s = useSettings();
  const { data } = useApi<any>('/api/public/overview');
  const st = data?.stats;
  return (
    <>
      <PageHeader eyebrow="About us" title="About our school">A place for young minds to learn, explore and grow — together with their teachers and families.</PageHeader>
      <section className="section tight">
        <div className="container hero-grid">
          <div className="stack">
            <h2>{s.school_name}</h2>
            <p>{s.school_name_si}. Our primary school brings children, teachers and families together through the joy of learning. We focus on strong foundations in language and mathematics, curiosity about the world around us, and kindness in everyday school life.</p>
            <div className="row">
              <Link to="/classes" className="btn btn-primary">Our classes</Link>
              <Link to="/teachers" className="btn btn-ghost">Meet the teachers</Link>
            </div>
            {st && <div className="mini-stats"><div><strong>{st.students}</strong><span>Students</span></div><div><strong>{st.teachers}</strong><span>Teachers</span></div><div><strong>{st.classes}</strong><span>Classes</span></div></div>}
          </div>
          <div className="hero-photo"><img src="/gallery/students.jpg" alt="Students of the school" /></div>
        </div>
      </section>
      <section className="section">
        <div className="container grid c2">
          <div className="card feature"><div className="icon-box"><Eye /></div><h3>Our vision</h3><p>To help every child grow into a curious, caring and confident learner.</p></div>
          <div className="card feature"><div className="icon-box green"><Target /></div><h3>Our mission</h3><p>To nurture foundational learning, creativity, kindness and a sense of responsibility in a supportive school community.</p></div>
        </div>
      </section>
      <section className="section white">
        <div className="container">
          <div className="section-title"><h2>Our values</h2></div>
          <div className="grid c4">
            {[{ i: <Heart />, t: 'Respect', p: 'We treat everyone with kindness.' }, { i: <Lightbulb />, t: 'Curiosity', p: 'We ask questions and love to learn.' },
              { i: <ShieldCheck />, t: 'Integrity', p: 'We are honest and responsible.' }, { i: <Handshake />, t: 'Community', p: 'We grow together with families.' }].map((v) => (
              <div className="card feature" key={v.t}><div className="icon-box blue">{v.i}</div><h3>{v.t}</h3><p>{v.p}</p></div>
            ))}
          </div>
        </div>
      </section>
      {s.principal && (
        <section className="section"><div className="container"><div className="card row"><div className="icon-box amber"><Sparkles /></div><div><h3>Principal</h3><p className="muted">{s.principal}</p></div></div></div></section>
      )}
    </>
  );
}
