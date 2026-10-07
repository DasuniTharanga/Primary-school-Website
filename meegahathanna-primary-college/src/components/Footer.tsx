import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react';
import { useSchool } from '@/context/SchoolContext';

export default function Footer() {
  const { settings } = useSchool();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <img src={settings.logoImage || '/crest.svg'} alt="" width="45" height="52" />
          <h2>{settings.shortName}</h2>
          <p>{settings.tagline}</p>
          <small>{settings.name}</small>
        </div>
        <div>
          <h3>Explore our school</h3>
          <Link to="/about">About us</Link>
          <Link to="/classes">Our classes</Link>
          <Link to="/teachers">Our teachers</Link>
          <Link to="/gallery">School gallery</Link>
        </div>
        <div>
          <h3>For families</h3>
          <Link to="/notices">Notice board</Link>
          <Link to="/events">School events</Link>
          <Link to="/resources">Learning resources</Link>
          <Link to="/admissions">Admissions enquiries</Link>
        </div>
        <div>
          <h3>Stay in touch</h3>
          <p className="footer-line">
            <MapPin size={16} />
            {settings.address}
          </p>
          {settings.phone && (
            <a className="footer-line" href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>
              <Phone size={16} />
              {settings.phone}
            </a>
          )}
          {settings.email && (
            <a className="footer-line" href={`mailto:${settings.email}`}>
              <Mail size={16} />
              {settings.email}
            </a>
          )}
          {settings.hours && <p>{settings.hours}</p>}
          <Link className="footer-link" to="/contact">
            Send a message
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {settings.shortName}
        </span>
        <div>
          <Link to="/privacy">Privacy notice</Link>
          <Link to="/login">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}
