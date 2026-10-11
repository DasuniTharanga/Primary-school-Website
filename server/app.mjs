import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { createPool, withTransaction, currentYearId, colomboToday, letterGrade, reference } from './db.mjs';
import {
  HttpError, assert, sha256, newToken, hashPassword, verifyPassword, COOKIE, sessionCookie, readCookie,
} from './auth.mjs';
import * as v from './validation.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon',
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function readJson(req, max = 64000) {
  assert((req.headers['content-type'] || '').startsWith('application/json'), 415, 'Send application/json.');
  const chunks = []; let size = 0;
  for await (const c of req) {
    size += c.length;
    assert(size <= max, 413, 'The request is too large.');
    chunks.push(c);
  }
  try { return v.obj(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch (e) { throw e instanceof HttpError ? e : new HttpError(400, 'Invalid JSON.'); }
}

export async function createApplication(cfg) {
  const pool = createPool();
  await pool.query('SELECT 1'); // fail fast with a clear message if MySQL is unreachable

  /* ---------- sessions ---------- */
  async function authenticate(req) {
    const raw = readCookie(req, COOKIE);
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const [rows] = await pool.query(
      `SELECT u.user_id, u.email, u.role, u.teacher_id, u.guardian_id, u.is_active,
              COALESCE(u.display_name, t.full_name, g.full_name, u.email) AS name,
              s.expires_at < NOW() AS expired
       FROM web_session s JOIN user_account u ON u.user_id = s.user_id
       LEFT JOIN teacher t ON t.teacher_id = u.teacher_id
       LEFT JOIN guardian g ON g.guardian_id = u.guardian_id
       WHERE s.token_hash = ?`, [sha256(raw)]);
    const u = rows[0];
    if (!u) return null;
    if (u.expired || !u.is_active) { await pool.query('DELETE FROM web_session WHERE token_hash=?', [sha256(raw)]); return null; }
    await pool.query('UPDATE web_session SET last_seen=NOW() WHERE token_hash=?', [sha256(raw)]);
    return { id: u.user_id, email: u.email, role: u.role, name: u.name, teacherId: u.teacher_id, guardianId: u.guardian_id };
  }

  async function rateLimit(key, max, windowMs) {
    const now = Date.now();
    const [rows] = await pool.query('SELECT hits, reset_at FROM rate_limit WHERE key_name=?', [key]);
    if (rows[0] && Number(rows[0].reset_at) > now) {
      assert(rows[0].hits < max, 429, 'Too many attempts. Please try again later.');
      await pool.query('UPDATE rate_limit SET hits=hits+1 WHERE key_name=?', [key]);
    } else {
      await pool.query(
        'INSERT INTO rate_limit(key_name,hits,reset_at) VALUES(?,1,?) ON DUPLICATE KEY UPDATE hits=1, reset_at=VALUES(reset_at)',
        [key, now + windowMs]);
    }
    if (Math.random() < 0.05) await pool.query('DELETE FROM rate_limit WHERE reset_at < ?', [now]);
  }

  function checkMutation(req) {
    const origin = req.headers.origin;
    assert(!origin || origin === cfg.origin, 403, 'This request did not come from the school website.');
    assert(req.headers['x-school-request'] === '1', 403, 'Missing request header.');
  }

  const clientIp = (req) => req.socket.remoteAddress || 'unknown';
  const requireRole = (auth, ...roles) => {
    assert(auth, 401, 'Please sign in to continue.');
    assert(roles.includes(auth.role), 403, 'You do not have access to this area.');
  };

  /* ---------- shared queries ---------- */
  const upcomingEvents = async (limit = 5) => {
    const [rows] = await pool.query(
      `SELECT event_id AS id, title, category, event_date AS date, event_time AS time, location, description
       FROM school_event WHERE event_date >= ? ORDER BY event_date, event_time LIMIT ?`, [colomboToday(), limit]);
    return rows;
  };
  const latestNews = async (limit = 5) => {
    const [rows] = await pool.query(
      `SELECT news_id AS id, title, category, summary, published_on AS date, is_pinned AS pinned
       FROM news WHERE is_published = 1 ORDER BY is_pinned DESC, published_on DESC, news_id DESC LIMIT ?`, [limit]);
    return rows.map((r) => ({ ...r, pinned: !!r.pinned }));
  };
  const siteSettings = async () => {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM site_setting');
    return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  };
  const teacherOwnsClass = async (teacherId, classId, mode) => {
    const [rows] = await pool.query(
      mode === 'attendance'
        ? 'SELECT 1 FROM class_section WHERE class_id=? AND class_teacher_id=?'
        : 'SELECT 1 FROM teaching_assignment WHERE class_id=? AND teacher_id=? LIMIT 1',
      [classId, teacherId]);
    return rows.length > 0;
  };

  /* ---------- route table ---------- */
  const routes = [];
  const route = (method, pattern, handler, status = 200) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, re, keys, handler, status });
  };

  /* ================= PUBLIC ================= */
  route('GET', '/api/public/overview', async () => {
    const yearId = await currentYearId(pool);
    const [[stats]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM student WHERE status='Active') AS students,
              (SELECT COUNT(*) FROM teacher WHERE status='Active') AS teachers,
              (SELECT COUNT(*) FROM class_section WHERE year_id=?) AS classes,
              (SELECT COUNT(*) FROM grade) AS grades`, [yearId]);
    const [[sports]] = await pool.query("SELECT COUNT(*) AS n FROM school_event WHERE category='Sports' AND event_date >= ?", [colomboToday()]);
    return { stats: { ...stats, upcomingSports: sports.n }, events: await upcomingEvents(3), news: await latestNews(3), settings: await siteSettings() };
  });

  route('GET', '/api/public/settings', async () => ({ settings: await siteSettings() }));

  route('GET', '/api/public/classes', async () => {
    const yearId = await currentYearId(pool);
    const [grades] = await pool.query('SELECT grade_id AS id, grade_name AS name, description FROM grade ORDER BY grade_id');
    const [sections] = await pool.query(
      `SELECT c.class_id AS id, c.grade_id AS gradeId, c.section_name AS section, c.capacity, t.full_name AS classTeacher,
              (SELECT COUNT(*) FROM enrollment e WHERE e.class_id = c.class_id) AS students
       FROM class_section c JOIN teacher t ON t.teacher_id = c.class_teacher_id
       WHERE c.year_id = ? ORDER BY c.grade_id, c.section_name`, [yearId]);
    const [subjects] = await pool.query(
      `SELECT DISTINCT c.grade_id AS gradeId, sb.subject_name AS name
       FROM teaching_assignment ta JOIN class_section c ON c.class_id = ta.class_id
       JOIN subject sb ON sb.subject_id = ta.subject_id WHERE c.year_id = ?`, [yearId]);
    return {
      classes: grades.map((g) => {
        const secs = sections.filter((s) => s.gradeId === g.id);
        return {
          ...g, sections: secs,
          students: secs.reduce((n, s) => n + s.students, 0),
          subjects: subjects.filter((s) => s.gradeId === g.id).map((s) => s.name),
        };
      }),
    };
  });

  route('GET', '/api/public/teachers', async () => {
    const yearId = await currentYearId(pool);
    const [teachers] = await pool.query(
      `SELECT teacher_id AS id, full_name AS name, gender, qualification, experience_yrs AS experience, joined_date AS joined
       FROM teacher WHERE status='Active' ORDER BY full_name`);
    const [classes] = await pool.query(
      `SELECT c.class_teacher_id AS teacherId, CONCAT(g.grade_name,' - ',c.section_name) AS className
       FROM class_section c JOIN grade g ON g.grade_id=c.grade_id WHERE c.year_id=?`, [yearId]);
    const [subjects] = await pool.query(
      `SELECT DISTINCT ta.teacher_id AS teacherId, sb.subject_name AS name
       FROM teaching_assignment ta JOIN subject sb ON sb.subject_id=ta.subject_id`);
    return {
      teachers: teachers.map((t) => ({
        ...t,
        classTeacherOf: classes.find((c) => c.teacherId === t.id)?.className ?? null,
        subjects: subjects.filter((s) => s.teacherId === t.id).map((s) => s.name),
      })),
    };
  });

  route('GET', '/api/public/events', async ({ url }) => {
    const period = url.searchParams.get('period') || 'all';
    v.choice(period, 'period', ['all', 'upcoming', 'past']);
    const cond = period === 'upcoming' ? 'WHERE event_date >= ?' : period === 'past' ? 'WHERE event_date < ?' : 'WHERE ? IS NOT NULL';
    const [rows] = await pool.query(
      `SELECT event_id AS id, title, category, event_date AS date, event_time AS time, location, description
       FROM school_event ${cond} ORDER BY event_date ${period === 'past' ? 'DESC' : 'ASC'}`, [colomboToday()]);
    return { events: rows };
  });

  route('GET', '/api/public/news', async () => {
    const [rows] = await pool.query(
      `SELECT news_id AS id, title, category, summary, body, published_on AS date, is_pinned AS pinned
       FROM news WHERE is_published=1 ORDER BY is_pinned DESC, published_on DESC, news_id DESC`);
    return { news: rows.map((r) => ({ ...r, pinned: !!r.pinned })) };
  });

  route('GET', '/api/public/gallery', async () => {
    const [rows] = await pool.query(
      `SELECT gallery_id AS id, title, category, image_path AS image, taken_on AS date
       FROM gallery_item WHERE is_published=1 ORDER BY gallery_id DESC`);
    return { items: rows };
  });

  route('POST', '/api/public/contact', async ({ req, body }) => {
    await rateLimit(`contact:${clientIp(req)}`, 5, 3600000);
    if (body.website) return { reference: 'OK' }; // honeypot field: bots fill it, people do not
    const ref = reference('MSG');
    await pool.query(
      'INSERT INTO contact_message(reference,name,email,phone,subject,message) VALUES(?,?,?,?,?,?)',
      [ref, v.str(body.name, 'Name', { max: 100 }), v.email(body.email), v.phone(body.phone, 'Phone', true) || null,
       v.str(body.subject, 'Subject', { max: 150 }), v.str(body.message, 'Message', { min: 10, max: 3000 })]);
    return { reference: ref };
  }, 201);

  route('POST', '/api/public/admissions', async ({ req, body }) => {
    await rateLimit(`admissions:${clientIp(req)}`, 5, 3600000);
    assert(v.bool(body.consent), 400, 'Please confirm the consent box.');
    const gradeId = v.int(body.gradeId, 'Grade', { min: 1 });
    const [g] = await pool.query('SELECT 1 FROM grade WHERE grade_id=?', [gradeId]);
    assert(g.length, 400, 'Please choose a valid grade.');
    const dob = v.date(body.dateOfBirth, 'Date of birth');
    assert(dob <= colomboToday(), 400, 'Date of birth cannot be in the future.');
    const ref = reference('ADM');
    await pool.query(
      `INSERT INTO admission_enquiry(reference,parent_name,parent_email,phone,child_name,date_of_birth,grade_id,address,message)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [ref, v.str(body.parentName, 'Parent name', { max: 100 }), v.email(body.parentEmail, 'Email'),
       v.phone(body.phone), v.str(body.childName, 'Child name', { max: 100 }), dob, gradeId,
       v.str(body.address, 'Address', { max: 255 }), v.str(body.message, 'Message', { optional: true, max: 2000 })]);
    return { reference: ref };
  }, 201);

  /* ================= AUTH ================= */
  route('POST', '/api/auth/login', async ({ req, res, body }) => {
    const email = v.email(body.email).toLowerCase();
    assert(typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 100, 400, 'Enter your password.');
    await rateLimit(`login:${clientIp(req)}`, 20, 15 * 60000);
    await rateLimit(`login:${email}`, 8, 15 * 60000);
    const [rows] = await pool.query('SELECT user_id, password_hash, is_active FROM user_account WHERE email=?', [email]);
    const user = rows[0];
    // Always run a verification so response time does not reveal whether the email exists.
    const check = await verifyPassword(body.password, user?.password_hash ?? 'scrypt$00$00');
    assert(user && user.is_active && check.ok, 401, 'Incorrect email or password.');
    if (check.legacy) await pool.query('UPDATE user_account SET password_hash=? WHERE user_id=?', [await hashPassword(body.password), user.user_id]);
    const token = newToken();
    await pool.query('DELETE FROM web_session WHERE user_id=? AND expires_at < NOW()', [user.user_id]);
    await pool.query('INSERT INTO web_session(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(NOW(), INTERVAL ? SECOND))',
      [sha256(token), user.user_id, Math.floor(cfg.sessionMs / 1000)]);
    await pool.query('UPDATE user_account SET last_login=NOW() WHERE user_id=?', [user.user_id]);
    res.setHeader('Set-Cookie', sessionCookie(cfg, token, Math.floor(cfg.sessionMs / 1000)));
    const auth = await authenticate({ headers: { cookie: `${COOKIE}=${token}` } });
    return { user: auth };
  });

  route('POST', '/api/auth/logout', async ({ req, res }) => {
    const raw = readCookie(req, COOKIE);
    if (raw) await pool.query('DELETE FROM web_session WHERE token_hash=?', [sha256(raw)]);
    res.setHeader('Set-Cookie', sessionCookie(cfg, '', 0));
    return { ok: true };
  });

  route('GET', '/api/auth/me', async ({ auth }) => ({ user: auth }));

  /* ================= PARENT ================= */
  route('GET', '/api/parent/dashboard', async ({ auth }) => {
    requireRole(auth, 'Parent');
    const yearId = await currentYearId(pool);
    const [[guardian]] = await pool.query('SELECT guardian_id AS id, full_name AS name, phone, email, occupation FROM guardian WHERE guardian_id=?', [auth.guardianId]);
    const [kids] = await pool.query(
      `SELECT s.student_id AS id, s.admission_no AS admissionNo, s.full_name AS name, s.gender, s.date_of_birth AS dateOfBirth,
              sg.relationship, cl.className, cl.classTeacher
       FROM student_guardian sg JOIN student s ON s.student_id = sg.student_id
       LEFT JOIN (SELECT e.student_id, CONCAT(g.grade_name,' - ',c.section_name) AS className, t.full_name AS classTeacher
                  FROM enrollment e JOIN class_section c ON c.class_id=e.class_id AND c.year_id=?
                  JOIN grade g ON g.grade_id=c.grade_id JOIN teacher t ON t.teacher_id=c.class_teacher_id) cl ON cl.student_id = s.student_id
       WHERE sg.guardian_id = ? ORDER BY s.full_name`, [yearId, auth.guardianId]);
    const ids = kids.map((k) => k.id);
    let att = [], recent = [], results = [];
    if (ids.length) {
      [att] = await pool.query(
        `SELECT student_id AS studentId, SUM(status='Present') AS present, SUM(status='Late') AS late,
                SUM(status='Absent') AS absent, COUNT(*) AS total FROM attendance WHERE student_id IN (?) GROUP BY student_id`, [ids]);
      [recent] = await pool.query(
        `SELECT student_id AS studentId, att_date AS date, status, remarks FROM attendance
         WHERE student_id IN (?) ORDER BY att_date DESC LIMIT 60`, [ids]);
      [results] = await pool.query(
        `SELECT r.student_id AS studentId, ex.exam_id AS examId, ex.exam_name AS exam, ex.term_no AS term, ex.exam_date AS examDate,
                sb.subject_name AS subject, r.marks FROM result r
         JOIN exam ex ON ex.exam_id=r.exam_id JOIN subject sb ON sb.subject_id=r.subject_id
         WHERE r.student_id IN (?) ORDER BY ex.term_no, sb.subject_name`, [ids]);
    }
    const children = kids.map((k) => {
      const a = att.find((x) => x.studentId === k.id);
      const present = Number(a?.present || 0), late = Number(a?.late || 0), absent = Number(a?.absent || 0), total = Number(a?.total || 0);
      const res = results.filter((r) => r.studentId === k.id).map((r) => ({ ...r, grade: letterGrade(r.marks) }));
      const avg = res.length ? Math.round((res.reduce((n, r) => n + r.marks, 0) / res.length) * 10) / 10 : null;
      return {
        ...k,
        attendance: { present, late, absent, total, percentage: total ? Math.round((1000 * (present + late)) / total) / 10 : null },
        recentAttendance: recent.filter((r) => r.studentId === k.id).slice(0, 15),
        results: res, average: avg, averageGrade: avg == null ? null : letterGrade(avg),
      };
    });
    return { guardian, children, events: await upcomingEvents(5), news: await latestNews(4) };
  });

  /* ================= TEACHER ================= */
  route('GET', '/api/teacher/dashboard', async ({ auth }) => {
    requireRole(auth, 'Teacher');
    const yearId = await currentYearId(pool);
    const today = colomboToday();
    const [[teacher]] = await pool.query(
      'SELECT teacher_id AS id, full_name AS name, qualification, experience_yrs AS experience, email FROM teacher WHERE teacher_id=?', [auth.teacherId]);
    const [myClasses] = await pool.query(
      `SELECT c.class_id AS id, CONCAT(g.grade_name,' - ',c.section_name) AS name, c.capacity,
              (SELECT COUNT(*) FROM enrollment e WHERE e.class_id=c.class_id) AS students
       FROM class_section c JOIN grade g ON g.grade_id=c.grade_id WHERE c.class_teacher_id=? AND c.year_id=?`, [auth.teacherId, yearId]);
    const [teaching] = await pool.query(
      `SELECT ta.class_id AS classId, CONCAT(g.grade_name,' - ',c.section_name) AS className, sb.subject_id AS subjectId, sb.subject_name AS subject,
              (SELECT COUNT(*) FROM enrollment e WHERE e.class_id=c.class_id) AS students
       FROM teaching_assignment ta JOIN class_section c ON c.class_id=ta.class_id AND c.year_id=?
       JOIN grade g ON g.grade_id=c.grade_id JOIN subject sb ON sb.subject_id=ta.subject_id
       WHERE ta.teacher_id=? ORDER BY className, subject`, [yearId, auth.teacherId]);
    const classIds = myClasses.map((c) => c.id);
    let todayStats = { present: 0, late: 0, absent: 0, marked: 0 };
    if (classIds.length) {
      const [[t]] = await pool.query(
        `SELECT COALESCE(SUM(a.status='Present'),0) AS present, COALESCE(SUM(a.status='Late'),0) AS late,
                COALESCE(SUM(a.status='Absent'),0) AS absent, COUNT(a.attendance_id) AS marked
         FROM attendance a JOIN enrollment e ON e.student_id=a.student_id WHERE e.class_id IN (?) AND a.att_date=?`, [classIds, today]);
      todayStats = { present: Number(t.present), late: Number(t.late), absent: Number(t.absent), marked: Number(t.marked) };
    }
    const [activity] = await pool.query(
      `SELECT att_date AS date, COUNT(*) AS records, SUM(status='Absent') AS absent
       FROM attendance WHERE marked_by=? GROUP BY att_date ORDER BY att_date DESC LIMIT 5`, [auth.teacherId]);
    const [exams] = await pool.query('SELECT exam_id AS id, exam_name AS name, term_no AS term, exam_date AS date FROM exam WHERE year_id=? ORDER BY term_no', [yearId]);
    return {
      teacher, myClasses, teaching, exams, today,
      totalStudents: myClasses.reduce((n, c) => n + c.students, 0),
      todayStats, activity: activity.map((a) => ({ ...a, absent: Number(a.absent) })),
      events: await upcomingEvents(4), news: await latestNews(3),
    };
  });

  route('GET', '/api/teacher/classes/:classId/attendance', async ({ auth, params, url }) => {
    requireRole(auth, 'Teacher');
    const classId = v.int(params.classId, 'Class', { min: 1 });
    assert(await teacherOwnsClass(auth.teacherId, classId, 'attendance'), 403, 'You are not the class teacher of this class.');
    const date = v.date(url.searchParams.get('date') || colomboToday(), 'Date');
    const [rows] = await pool.query(
      `SELECT s.student_id AS id, s.admission_no AS admissionNo, s.full_name AS name, a.status, a.remarks
       FROM enrollment e JOIN student s ON s.student_id=e.student_id
       LEFT JOIN attendance a ON a.student_id=s.student_id AND a.att_date=?
       WHERE e.class_id=? AND s.status='Active' ORDER BY s.full_name`, [date, classId]);
    return { date, students: rows.map((r) => ({ ...r, status: r.status || null, remarks: r.remarks || '' })) };
  });

  route('POST', '/api/teacher/classes/:classId/attendance', async ({ auth, params, body }) => {
    requireRole(auth, 'Teacher');
    const classId = v.int(params.classId, 'Class', { min: 1 });
    assert(await teacherOwnsClass(auth.teacherId, classId, 'attendance'), 403, 'You are not the class teacher of this class.');
    const date = v.date(body.date, 'Date');
    assert(date <= colomboToday(), 400, 'Attendance cannot be marked for a future date.');
    assert(Array.isArray(body.records) && body.records.length > 0 && body.records.length <= 100, 400, 'No attendance records were sent.');
    const [enrolled] = await pool.query('SELECT student_id FROM enrollment WHERE class_id=?', [classId]);
    const allowed = new Set(enrolled.map((e) => e.student_id));
    const rows = body.records.map((r) => {
      const id = v.int(r.studentId, 'Student', { min: 1 });
      assert(allowed.has(id), 400, 'A student in the list does not belong to this class.');
      return [id, date, v.choice(r.status, 'Status', ['Present', 'Absent', 'Late']), v.str(r.remarks, 'Remarks', { optional: true, max: 150 }) || null, auth.teacherId];
    });
    await withTransaction(pool, (conn) => conn.query(
      `INSERT INTO attendance(student_id,att_date,status,remarks,marked_by) VALUES ?
       ON DUPLICATE KEY UPDATE status=VALUES(status), remarks=VALUES(remarks), marked_by=VALUES(marked_by)`, [rows]));
    return { saved: rows.length };
  });

  route('GET', '/api/teacher/classes/:classId/results', async ({ auth, params, url }) => {
    requireRole(auth, 'Teacher');
    const classId = v.int(params.classId, 'Class', { min: 1 });
    const examId = v.int(url.searchParams.get('examId'), 'Exam', { min: 1 });
    const subjectId = v.int(url.searchParams.get('subjectId'), 'Subject', { min: 1 });
    const [ok] = await pool.query('SELECT 1 FROM teaching_assignment WHERE class_id=? AND subject_id=? AND teacher_id=?', [classId, subjectId, auth.teacherId]);
    assert(ok.length, 403, 'You do not teach this subject in this class.');
    const [rows] = await pool.query(
      `SELECT s.student_id AS id, s.admission_no AS admissionNo, s.full_name AS name, r.marks
       FROM enrollment e JOIN student s ON s.student_id=e.student_id
       LEFT JOIN result r ON r.student_id=s.student_id AND r.exam_id=? AND r.subject_id=?
       WHERE e.class_id=? ORDER BY s.full_name`, [examId, subjectId, classId]);
    return { students: rows.map((r) => ({ ...r, marks: r.marks == null ? null : r.marks })) };
  });

  route('POST', '/api/teacher/classes/:classId/results', async ({ auth, params, body }) => {
    requireRole(auth, 'Teacher');
    const classId = v.int(params.classId, 'Class', { min: 1 });
    const examId = v.int(body.examId, 'Exam', { min: 1 });
    const subjectId = v.int(body.subjectId, 'Subject', { min: 1 });
    const [ok] = await pool.query('SELECT 1 FROM teaching_assignment WHERE class_id=? AND subject_id=? AND teacher_id=?', [classId, subjectId, auth.teacherId]);
    assert(ok.length, 403, 'You do not teach this subject in this class.');
    assert(Array.isArray(body.marks) && body.marks.length <= 100, 400, 'No marks were sent.');
    const [enrolled] = await pool.query('SELECT student_id FROM enrollment WHERE class_id=?', [classId]);
    const allowed = new Set(enrolled.map((e) => e.student_id));
    const rows = [];
    for (const m of body.marks) {
      if (m.marks === null || m.marks === '' || m.marks === undefined) continue; // blank = not entered
      const id = v.int(m.studentId, 'Student', { min: 1 });
      assert(allowed.has(id), 400, 'A student in the list does not belong to this class.');
      const mark = Number(m.marks);
      assert(Number.isFinite(mark) && mark >= 0 && mark <= 100, 400, 'Marks must be between 0 and 100.');
      rows.push([examId, id, subjectId, Math.round(mark * 100) / 100]);
    }
    if (rows.length) await withTransaction(pool, (conn) => conn.query(
      'INSERT INTO result(exam_id,student_id,subject_id,marks) VALUES ? ON DUPLICATE KEY UPDATE marks=VALUES(marks)', [rows]));
    return { saved: rows.length };
  });

  /* ================= ADMIN ================= */
  route('GET', '/api/admin/dashboard', async ({ auth }) => {
    requireRole(auth, 'Admin');
    const yearId = await currentYearId(pool);
    const [[c]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM student WHERE status='Active') AS students,
              (SELECT COUNT(*) FROM teacher WHERE status='Active') AS teachers,
              (SELECT COUNT(*) FROM class_section WHERE year_id=?) AS classes,
              (SELECT COUNT(*) FROM guardian) AS guardians,
              (SELECT COUNT(*) FROM admission_enquiry WHERE status='New') AS newAdmissions,
              (SELECT COUNT(*) FROM contact_message WHERE status='New') AS newMessages,
              (SELECT COUNT(*) FROM school_event WHERE event_date >= ?) AS upcomingEvents`, [yearId, colomboToday()]);
    const [[att]] = await pool.query(
      `SELECT att_date AS date, SUM(status='Present') AS present, SUM(status='Late') AS late, SUM(status='Absent') AS absent, COUNT(*) AS total
       FROM attendance GROUP BY att_date ORDER BY att_date DESC LIMIT 1`);
    const [occupancy] = await pool.query(
      `SELECT CONCAT(g.grade_name,' - ',c.section_name) AS name, c.capacity, COUNT(e.student_id) AS students, t.full_name AS teacher
       FROM class_section c JOIN grade g ON g.grade_id=c.grade_id JOIN teacher t ON t.teacher_id=c.class_teacher_id
       LEFT JOIN enrollment e ON e.class_id=c.class_id WHERE c.year_id=?
       GROUP BY c.class_id, g.grade_name, c.section_name, c.capacity, t.full_name ORDER BY c.grade_id, c.section_name`, [yearId]);
    const [admissions] = await pool.query(
      `SELECT a.enquiry_id AS id, a.reference, a.child_name AS childName, a.parent_name AS parentName, g.grade_name AS grade, a.status, a.created_at AS createdAt
       FROM admission_enquiry a JOIN grade g ON g.grade_id=a.grade_id ORDER BY a.created_at DESC LIMIT 5`);
    const [subjects] = await pool.query(
      `SELECT sb.subject_name AS name, ROUND(AVG(r.marks),1) AS average, COUNT(*) AS entries
       FROM result r JOIN subject sb ON sb.subject_id=r.subject_id GROUP BY sb.subject_id, sb.subject_name ORDER BY average DESC`);
    const [support] = await pool.query(
      `SELECT s.full_name AS name, ROUND(AVG(r.marks),1) AS average FROM result r JOIN student s ON s.student_id=r.student_id
       GROUP BY s.student_id, s.full_name HAVING AVG(r.marks) < 50 ORDER BY average`);
    return {
      counts: c,
      attendance: att ? { date: att.date, present: Number(att.present), late: Number(att.late), absent: Number(att.absent), total: Number(att.total) } : null,
      occupancy, admissions, subjects, support, events: await upcomingEvents(4),
    };
  });

  /* ---- students ---- */
  route('GET', '/api/admin/students', async ({ auth, url }) => {
    requireRole(auth, 'Admin');
    const yearId = await currentYearId(pool);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
    const classId = url.searchParams.get('classId');
    const where = ['1=1'], params = [yearId];
    if (q) { where.push('(s.full_name LIKE ? OR s.admission_no LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (classId) { where.push('cl.classId = ?'); params.push(v.int(classId, 'Class')); }
    const [rows] = await pool.query(
      `SELECT s.student_id AS id, s.admission_no AS admissionNo, s.full_name AS name, s.gender, s.date_of_birth AS dateOfBirth,
              s.address, s.admitted_date AS admittedDate, s.status, cl.classId, cl.className,
              (SELECT GROUP_CONCAT(CONCAT(gd.full_name,' (',sg.relationship,')') SEPARATOR ', ')
               FROM student_guardian sg JOIN guardian gd ON gd.guardian_id=sg.guardian_id WHERE sg.student_id=s.student_id) AS guardians
       FROM student s
       LEFT JOIN (SELECT e.student_id, c.class_id AS classId, CONCAT(g.grade_name,' - ',c.section_name) AS className
                  FROM enrollment e JOIN class_section c ON c.class_id=e.class_id AND c.year_id=?
                  JOIN grade g ON g.grade_id=c.grade_id) cl ON cl.student_id=s.student_id
       WHERE ${where.join(' AND ')} ORDER BY s.admission_no LIMIT 300`, params);
    const [classes] = await pool.query(
      `SELECT c.class_id AS id, CONCAT(g.grade_name,' - ',c.section_name) AS name FROM class_section c
       JOIN grade g ON g.grade_id=c.grade_id WHERE c.year_id=? ORDER BY c.grade_id, c.section_name`, [yearId]);
    return { students: rows, classes };
  });

  const studentFields = (b) => ({
    admissionNo: v.str(b.admissionNo, 'Admission number', { max: 10 }),
    name: v.str(b.name, 'Full name', { max: 100 }),
    gender: v.choice(b.gender, 'Gender', ['Male', 'Female']),
    dob: v.date(b.dateOfBirth, 'Date of birth'),
    address: v.str(b.address, 'Address', { optional: true, max: 255 }) || null,
    admitted: v.date(b.admittedDate || colomboToday(), 'Admitted date'),
  });

  route('POST', '/api/admin/students', async ({ auth, body }) => {
    requireRole(auth, 'Admin');
    const f = studentFields(body);
    const classId = v.int(body.classId, 'Class', { optional: true, min: 1 });
    const g = body.guardian && typeof body.guardian === 'object' ? body.guardian : null;
    const id = await withTransaction(pool, async (conn) => {
      const [r] = await conn.query(
        'INSERT INTO student(admission_no,full_name,gender,date_of_birth,address,admitted_date) VALUES(?,?,?,?,?,?)',
        [f.admissionNo, f.name, f.gender, f.dob, f.address, f.admitted]);
      if (classId) await conn.query('INSERT INTO enrollment(student_id,class_id,enrolled_on) VALUES(?,?,?)', [r.insertId, classId, f.admitted]);
      if (g && g.name) {
        const [gr] = await conn.query('INSERT INTO guardian(full_name,phone,email) VALUES(?,?,?)',
          [v.str(g.name, 'Guardian name', { max: 100 }), v.phone(g.phone, 'Guardian phone'), v.email(g.email, 'Guardian email', true) || null]);
        await conn.query('INSERT INTO student_guardian(student_id,guardian_id,relationship,is_primary_contact) VALUES(?,?,?,TRUE)',
          [r.insertId, gr.insertId, v.choice(g.relationship || 'Guardian', 'Relationship', ['Father', 'Mother', 'Guardian'])]);
      }
      return r.insertId;
    });
    return { id };
  }, 201);

  route('PUT', '/api/admin/students/:id', async ({ auth, params, body }) => {
    requireRole(auth, 'Admin');
    const id = v.int(params.id, 'Student', { min: 1 });
    const f = studentFields(body);
    const status = v.choice(body.status || 'Active', 'Status', ['Active', 'Transferred', 'Left']);
    const [r] = await pool.query(
      'UPDATE student SET admission_no=?, full_name=?, gender=?, date_of_birth=?, address=?, admitted_date=?, status=? WHERE student_id=?',
      [f.admissionNo, f.name, f.gender, f.dob, f.address, f.admitted, status, id]);
    assert(r.affectedRows, 404, 'Student not found.');
    return { ok: true };
  });

  /* ---- teachers ---- */
  route('GET', '/api/admin/teachers', async ({ auth }) => {
    requireRole(auth, 'Admin');
    const yearId = await currentYearId(pool);
    const [rows] = await pool.query(
      `SELECT t.teacher_id AS id, t.full_name AS name, t.gender, t.phone, t.email, t.qualification, t.experience_yrs AS experience,
              t.joined_date AS joined, t.status,
              (SELECT CONCAT(g.grade_name,' - ',c.section_name) FROM class_section c JOIN grade g ON g.grade_id=c.grade_id
               WHERE c.class_teacher_id=t.teacher_id AND c.year_id=?) AS className
       FROM teacher t ORDER BY t.full_name`, [yearId]);
    return { teachers: rows };
  });
  const teacherFields = (b) => ({
    name: v.str(b.name, 'Full name', { max: 100 }), gender: v.choice(b.gender, 'Gender', ['Male', 'Female']),
    phone: v.phone(b.phone, 'Phone', true) || null, email: v.email(b.email, 'Email', true) || null,
    qualification: v.str(b.qualification, 'Qualification', { optional: true, max: 100 }) || null,
    experience: v.int(b.experience ?? 0, 'Experience', { max: 60 }), joined: v.date(b.joined, 'Joined date', true),
  });
  route('POST', '/api/admin/teachers', async ({ auth, body }) => {
    requireRole(auth, 'Admin');
    const f = teacherFields(body);
    const [r] = await pool.query(
      'INSERT INTO teacher(full_name,gender,phone,email,qualification,experience_yrs,joined_date) VALUES(?,?,?,?,?,?,?)',
      [f.name, f.gender, f.phone, f.email, f.qualification, f.experience, f.joined]);
    return { id: r.insertId };
  }, 201);
  route('PUT', '/api/admin/teachers/:id', async ({ auth, params, body }) => {
    requireRole(auth, 'Admin');
    const id = v.int(params.id, 'Teacher', { min: 1 });
    const f = teacherFields(body);
    const status = v.choice(body.status || 'Active', 'Status', ['Active', 'Retired', 'Resigned']);
    const [r] = await pool.query(
      'UPDATE teacher SET full_name=?, gender=?, phone=?, email=?, qualification=?, experience_yrs=?, joined_date=?, status=? WHERE teacher_id=?',
      [f.name, f.gender, f.phone, f.email, f.qualification, f.experience, f.joined, status, id]);
    assert(r.affectedRows, 404, 'Teacher not found.');
    return { ok: true };
  });

  /* ---- events / news / gallery (same shape, so a small factory) ---- */
  const crud = (name, table, idCol, listSql, fields, orderBy) => {
    route('GET', `/api/admin/${name}`, async ({ auth }) => { requireRole(auth, 'Admin'); const [rows] = await pool.query(listSql); return { items: rows }; });
    route('POST', `/api/admin/${name}`, async ({ auth, body }) => {
      requireRole(auth, 'Admin');
      const f = fields(body, auth);
      const [r] = await pool.query(`INSERT INTO ${table}(${Object.keys(f).join(',')}) VALUES(${Object.keys(f).map(() => '?').join(',')})`, Object.values(f));
      return { id: r.insertId };
    }, 201);
    route('PUT', `/api/admin/${name}/:id`, async ({ auth, params, body }) => {
      requireRole(auth, 'Admin');
      const f = fields(body, auth); delete f.created_by;
      const [r] = await pool.query(`UPDATE ${table} SET ${Object.keys(f).map((k) => `${k}=?`).join(',')} WHERE ${idCol}=?`, [...Object.values(f), v.int(params.id, 'Id', { min: 1 })]);
      assert(r.affectedRows, 404, 'Not found.');
      return { ok: true };
    });
    route('DELETE', `/api/admin/${name}/:id`, async ({ auth, params }) => {
      requireRole(auth, 'Admin');
      await pool.query(`DELETE FROM ${table} WHERE ${idCol}=?`, [v.int(params.id, 'Id', { min: 1 })]);
      return { ok: true };
    });
  };
  crud('events', 'school_event', 'event_id',
    `SELECT event_id AS id, title, category, event_date AS date, event_time AS time, location, description FROM school_event ORDER BY event_date DESC`,
    (b) => ({
      title: v.str(b.title, 'Title', { max: 120 }),
      category: v.choice(b.category, 'Category', ['Sports', 'Celebration', 'Arts', 'Educational', 'Ceremony']),
      event_date: v.date(b.date, 'Date'), event_time: v.time(b.time),
      location: v.str(b.location, 'Location', { optional: true, max: 100 }) || null,
      description: v.str(b.description, 'Description', { optional: true, max: 2000 }) || null,
    }));
  crud('news', 'news', 'news_id',
    `SELECT news_id AS id, title, category, summary, body, published_on AS date, is_pinned AS pinned, is_published AS published FROM news ORDER BY published_on DESC, news_id DESC`,
    (b, auth) => ({
      title: v.str(b.title, 'Title', { max: 150 }), category: v.str(b.category || 'General', 'Category', { max: 40 }),
      summary: v.str(b.summary, 'Summary', { max: 300 }), body: v.str(b.body, 'Body', { optional: true, max: 8000 }) || null,
      published_on: v.date(b.date || colomboToday(), 'Date'), is_pinned: v.bool(b.pinned), is_published: b.published === undefined ? 1 : v.bool(b.published),
      created_by: auth.id,
    }));
  crud('gallery', 'gallery_item', 'gallery_id',
    `SELECT gallery_id AS id, title, category, image_path AS image, taken_on AS date, is_published AS published FROM gallery_item ORDER BY gallery_id DESC`,
    (b) => ({
      title: v.str(b.title, 'Title', { max: 120 }), category: v.str(b.category || 'School life', 'Category', { max: 40 }),
      image_path: v.imagePath(b.image), taken_on: v.date(b.date, 'Date', true), is_published: b.published === undefined ? 1 : v.bool(b.published),
    }));

  /* ---- admissions & messages ---- */
  route('GET', '/api/admin/admissions', async ({ auth }) => {
    requireRole(auth, 'Admin');
    const [rows] = await pool.query(
      `SELECT a.enquiry_id AS id, a.reference, a.parent_name AS parentName, a.parent_email AS parentEmail, a.phone, a.child_name AS childName,
              a.date_of_birth AS dateOfBirth, g.grade_name AS grade, a.address, a.message, a.status, a.internal_notes AS notes, a.created_at AS createdAt
       FROM admission_enquiry a JOIN grade g ON g.grade_id=a.grade_id ORDER BY a.created_at DESC LIMIT 300`);
    return { items: rows };
  });
  route('PUT', '/api/admin/admissions/:id', async ({ auth, params, body }) => {
    requireRole(auth, 'Admin');
    await pool.query('UPDATE admission_enquiry SET status=?, internal_notes=? WHERE enquiry_id=?',
      [v.choice(body.status, 'Status', ['New', 'Contacted', 'Closed']), v.str(body.notes, 'Notes', { optional: true, max: 2000 }) || null, v.int(params.id, 'Id', { min: 1 })]);
    return { ok: true };
  });
  route('GET', '/api/admin/messages', async ({ auth }) => {
    requireRole(auth, 'Admin');
    const [rows] = await pool.query(
      'SELECT message_id AS id, reference, name, email, phone, subject, message, status, created_at AS createdAt FROM contact_message ORDER BY created_at DESC LIMIT 300');
    return { items: rows };
  });
  route('PUT', '/api/admin/messages/:id', async ({ auth, params, body }) => {
    requireRole(auth, 'Admin');
    await pool.query('UPDATE contact_message SET status=? WHERE message_id=?',
      [v.choice(body.status, 'Status', ['New', 'Read', 'Resolved']), v.int(params.id, 'Id', { min: 1 })]);
    return { ok: true };
  });

  /* ---- accounts ---- */
  route('GET', '/api/admin/accounts', async ({ auth }) => {
    requireRole(auth, 'Admin');
    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.email, u.role, u.is_active AS active, u.last_login AS lastLogin,
              COALESCE(u.display_name, t.full_name, g.full_name) AS name
       FROM user_account u LEFT JOIN teacher t ON t.teacher_id=u.teacher_id LEFT JOIN guardian g ON g.guardian_id=u.guardian_id
       ORDER BY u.role, u.email`);
    const [teachers] = await pool.query("SELECT teacher_id AS id, full_name AS name FROM teacher WHERE status='Active' ORDER BY full_name");
    const [guardians] = await pool.query('SELECT guardian_id AS id, full_name AS name FROM guardian ORDER BY full_name');
    return { items: rows.map((r) => ({ ...r, active: !!r.active })), teachers, guardians };
  });
  route('POST', '/api/admin/accounts', async ({ auth, body }) => {
    requireRole(auth, 'Admin');
    const role = v.choice(body.role, 'Role', ['Admin', 'Teacher', 'Parent']);
    const teacherId = role === 'Teacher' ? v.int(body.teacherId, 'Teacher', { min: 1 }) : null;
    const guardianId = role === 'Parent' ? v.int(body.guardianId, 'Guardian', { min: 1 }) : null;
    const [r] = await pool.query(
      'INSERT INTO user_account(email,password_hash,role,teacher_id,guardian_id,display_name) VALUES(?,?,?,?,?,?)',
      [v.email(body.email).toLowerCase(), await hashPassword(v.password(body.password)), role, teacherId, guardianId,
       role === 'Admin' ? v.str(body.name, 'Name', { max: 100 }) : null]);
    return { id: r.insertId };
  }, 201);
  route('PUT', '/api/admin/accounts/:id', async ({ auth, params, body }) => {
    requireRole(auth, 'Admin');
    const id = v.int(params.id, 'Account', { min: 1 });
    if (body.password) {
      await pool.query('UPDATE user_account SET password_hash=? WHERE user_id=?', [await hashPassword(v.password(body.password)), id]);
      await pool.query('DELETE FROM web_session WHERE user_id=?', [id]);
    }
    if (body.active !== undefined) {
      assert(id !== auth.id || v.bool(body.active), 400, 'You cannot deactivate your own account.');
      await pool.query('UPDATE user_account SET is_active=? WHERE user_id=?', [v.bool(body.active), id]);
      if (!v.bool(body.active)) await pool.query('DELETE FROM web_session WHERE user_id=?', [id]);
    }
    return { ok: true };
  });

  /* ---- settings ---- */
  route('GET', '/api/admin/settings', async ({ auth }) => { requireRole(auth, 'Admin'); return { settings: await siteSettings() }; });
  route('PUT', '/api/admin/settings', async ({ auth, body }) => {
    requireRole(auth, 'Admin');
    const keys = { school_name: 100, school_name_si: 100, tagline: 120, address: 250, phone: 30, email: 100, office_hours: 120, principal: 100, contact_person: 100 };
    const rows = Object.entries(keys).filter(([k]) => k in body).map(([k, max]) => [k, v.str(body[k], k, { optional: true, max })]);
    if (body.admissions_open !== undefined) rows.push(['admissions_open', v.bool(body.admissions_open) ? '1' : '0']);
    if (rows.length) await pool.query('INSERT INTO site_setting(setting_key,setting_value) VALUES ? ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [rows]);
    return { ok: true };
  });

  /* ---------- HTTP plumbing ---------- */
  function securityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    if (cfg.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }

  async function serveStatic(req, res, pathname) {
    const root = resolve(cfg.distPath);
    let file = resolve(join(root, decodeURIComponent(pathname)));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); await stat(file); }
    catch { if (extname(pathname)) { res.writeHead(404); return res.end('Not found'); } file = join(root, 'index.html'); }
    try {
      const data = await readFile(file);
      const immutable = file.includes(`${sep}assets${sep}`);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('Build the website first: npm run build'); }
  }

  const server = createServer(async (req, res) => {
    securityHeaders(res);
    const url = new URL(req.url, 'http://localhost');
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
        return await serveStatic(req, res, url.pathname);
      }
      const match = routes.map((r) => ({ r, m: r.method === req.method ? url.pathname.match(r.re) : null })).find((x) => x.m);
      if (!match) return send(res, 404, { error: 'Not found.' });
      const params = Object.fromEntries(match.r.keys.map((k, i) => [k, decodeURIComponent(match.m[i + 1])]));
      let body = {};
      if (req.method !== 'GET') {
        checkMutation(req);
        if (req.method === 'POST' || req.method === 'PUT') body = await readJson(req);
      }
      const auth = await authenticate(req);
      const out = await match.r.handler({ req, res, url, params, body, auth });
      send(res, match.r.status, out);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      if (e?.code === 'ER_DUP_ENTRY') return send(res, 409, { error: 'That value already exists (for example, a duplicate email or admission number).' });
      if (e?.errno === 1644) return send(res, 409, { error: e.sqlMessage || 'The database rejected this change.' });
      if (e?.code === 'ER_NO_REFERENCED_ROW_2' || e?.code === 'ER_ROW_IS_REFERENCED_2') return send(res, 409, { error: 'This record is linked to other records and cannot be changed that way.' });
      console.error(e);
      send(res, 500, { error: 'Something went wrong on the server. Please try again.' });
    }
  });

  return { server, pool, close: async () => { server.close(); await pool.end(); } };
}
