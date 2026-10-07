import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const kinds = ['notices', 'events', 'teachers', 'classes', 'gallery', 'resources'];
export const defaults = {
  name: 'WP/MT/MEEGAHATHANNA PRIMARY COLLEGE',
  sinhalaName: 'මීගහතැන්න ප්‍රාථමික විද්‍යාලය',
  shortName: 'Meegahathanna Primary College',
  tagline: 'Small steps. Bright futures.',
  address: 'Meegahathanna, Sri Lanka',
  phone: '',
  email: '',
  hours: '',
  about:
    'A place for young minds to learn, explore and grow. Our primary school community brings children, teachers and families together through the joy of learning.',
  vision: 'To help every child grow into a curious, caring and confident learner.',
  mission:
    'To nurture foundational learning, creativity, kindness and a sense of responsibility in a supportive school community.',
  principalName: '',
  principalMessage: '',
  heroImage: '',
  logoImage: '',
  admissionsOpen: true,
};

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path, { timeout: 5000 });
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT OR IGNORE INTO schema_migrations VALUES (1, ?)').run(new Date().toISOString());
  if (path !== ':memory:') chmodSync(path, 0o600);
  return db;
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function seedDatabase(db) {
  if (db.prepare('SELECT id FROM settings WHERE id=1').get()) return;
  transaction(db, () => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO settings(id,data_json,updated_at) VALUES(1,?,?)').run(
      JSON.stringify(defaults),
      now,
    );
    const descriptions = [
      'A gentle start to school life, with early reading, number work, stories and learning through play.',
      'Building confidence in reading, writing and everyday mathematics, while exploring the world around us.',
      'Developing independence through language, mathematics, environmental studies and creative activities.',
      'Strengthening problem solving, teamwork and expression through a balanced primary curriculum.',
      'Consolidating primary learning and helping children prepare confidently for their next stage of education.',
    ];
    const insert = db.prepare(`INSERT INTO content
      (id,kind,title,summary,body,category,status,image_path,data_json,sort_order,published_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?, ?,?,?,?,?,?)`);
    descriptions.forEach((summary, i) =>
      insert.run(
        randomUUID(),
        'classes',
        `Grade ${i + 1}`,
        summary,
        '',
        'Primary education',
        'published',
        '',
        JSON.stringify({
          grade: i + 1,
          sections: '',
          subjects: 'Language, Mathematics, Environmental Studies, Creative Arts',
        }),
        i + 1,
        now,
        now,
        now,
      ),
    );
    insert.run(
      randomUUID(),
      'notices',
      'Welcome to our school community',
      'Find school updates, learning information and ways to stay in touch, all in one place.',
      'Welcome to the school website. Families can use the contact form to ask a question or the admissions enquiry form to contact the school about joining. Confirmed school notices and events will be shared here by the school office.',
      'School news',
      'published',
      '',
      JSON.stringify({ pinned: true }),
      0,
      now,
      now,
      now,
    );
    for (const notice of [
      {
        title: 'Reach our school office',
        summary: 'Send a message, keep your reference number and stay connected with the school.',
        body: 'Use the Contact page for questions about school life, learning or visiting arrangements. Your message is stored for the school office to review. Keep the reference number shown after submission for any follow-up.',
      },
      {
        title: 'Planning your child’s next step?',
        summary:
          'Begin with an admissions enquiry and let the school guide you through the official process.',
        body: 'The Admissions page lets parents and guardians send a first enquiry. This is not an admission approval. The school office can explain the current process, eligibility and available places. Please do not send identity documents through the enquiry form.',
      },
    ])
      insert.run(
        randomUUID(),
        'notices',
        notice.title,
        notice.summary,
        notice.body,
        'For families',
        'published',
        '',
        JSON.stringify({ pinned: false }),
        0,
        now,
        now,
        now,
      );
    // Transcribed from the supplied 2026 staff sheet. Names must be checked against
    // the original by the school before publishing. Signatures are never imported.
    const roster = JSON.parse(
      readFileSync(new URL('../database/teacher-roster.json', import.meta.url), 'utf8'),
    );
    roster.forEach((teacher, i) =>
      insert.run(
        randomUUID(),
        'teachers',
        teacher.name,
        '',
        '',
        'Teaching staff',
        'draft',
        '',
        JSON.stringify({
          role: 'Teacher',
          grade: '',
          subject: '',
          reviewRequired: true,
          sourceRow: i + 1,
        }),
        i + 1,
        null,
        now,
        now,
      ),
    );
  });
}

export function contentRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category,
    status: row.status,
    imagePath: row.image_path,
    data: JSON.parse(row.data_json),
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}
export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: Boolean(user.active),
  };
}
export function settingsRecord(db) {
  const row = db.prepare('SELECT * FROM settings WHERE id=1').get();
  return { ...JSON.parse(row.data_json), version: row.version };
}
export function audit(db, user, action, subject = '') {
  db.prepare('INSERT INTO audit_log VALUES(?,?,?,?,?,?)').run(
    randomUUID(),
    user?.id || null,
    user?.name || 'System',
    action,
    subject,
    new Date().toISOString(),
  );
}
