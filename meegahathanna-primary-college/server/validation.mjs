import { assert } from './security.mjs';
import { kinds, defaults } from './db.mjs';

export function object(value) {
  assert(
    value && typeof value === 'object' && !Array.isArray(value),
    400,
    'A JSON object is required.',
  );
  return value;
}
export function text(value, label, min = 0, max = 200) {
  assert(typeof value === 'string', 400, `${label} must be text.`);
  const result = value.trim();
  assert(
    result.length >= min && result.length <= max,
    400,
    `${label} must have ${min}–${max} characters.`,
  );
  const hasControl = Array.from(result).some((char) => {
    const code = char.charCodeAt(0);
    return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
  });
  assert(!hasControl, 400, `${label} contains invalid characters.`);
  return result;
}
export function email(value) {
  const result = text(value, 'Email', 3, 254).toLowerCase();
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(result), 400, 'Please enter a valid email address.');
  return result;
}
export function password(value) {
  assert(
    typeof value === 'string' &&
      value.length >= 12 &&
      value.length <= 128 &&
      /[A-Za-z]/.test(value) &&
      /[0-9]/.test(value),
    400,
    'Use 12–128 characters with letters and numbers for your password.',
  );
  return value;
}
export function phone(value, required = false) {
  const result = text(value || '', 'Phone', required ? 7 : 0, 25);
  assert(!result || /^[+()\d\s-]{7,25}$/.test(result), 400, 'Please enter a valid phone number.');
  return result;
}
export function number(value, label, min, max) {
  assert(
    Number.isInteger(value) && value >= min && value <= max,
    400,
    `${label} must be between ${min} and ${max}.`,
  );
  return value;
}
export function choice(value, label, choices) {
  assert(choices.includes(value), 400, `Invalid ${label}.`);
  return value;
}
export function date(value, label, required = false) {
  if (!value && !required) return '';
  const result = text(value, label, 10, 10);
  const parsed = new Date(result + 'T00:00:00Z');
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(result) &&
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === result,
    400,
    `Invalid ${label}.`,
  );
  return result;
}
export function mediaPath(db, value, type = 'image') {
  const result = text(value || '', 'File path', 0, 100);
  if (!result) return '';
  const row = db.prepare('SELECT mime_type FROM media WHERE public_path=?').get(result);
  assert(
    row &&
      (type === 'image' ? row.mime_type.startsWith('image/') : row.mime_type === 'application/pdf'),
    400,
    'Please upload a valid file first.',
  );
  return result;
}
export function validateContent(db, kind, value) {
  choice(kind, 'content type', kinds);
  object(value);
  const d = object(value.data || {});
  const item = {
    title: text(value.title, kind === 'teachers' ? 'Name' : 'Title', 2, 180),
    summary: text(value.summary || '', 'Summary', 0, 600),
    body: text(value.body || '', 'Details', 0, 12000),
    category: text(value.category || '', 'Category', 0, 60),
    status: choice(value.status, 'status', ['draft', 'published']),
    imagePath: mediaPath(db, value.imagePath),
    sortOrder: number(value.sortOrder ?? 0, 'Display order', 0, 9999),
    data: {},
  };
  switch (kind) {
    case 'notices':
      item.data = { pinned: d.pinned === true };
      break;
    case 'events': {
      const time = text(d.time || '', 'Time', 0, 5);
      assert(!time || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time), 400, 'Invalid event time.');
      item.data = {
        date: date(d.date, 'Event date', true),
        time,
        location: text(d.location || '', 'Location', 0, 180),
      };
      break;
    }
    case 'teachers':
      assert(
        item.status !== 'published' || d.reviewRequired !== true,
        400,
        'Confirm the teacher name before publishing.',
      );
      item.data = {
        role: text(d.role || 'Teacher', 'Role', 2, 100),
        grade: text(d.grade || '', 'Grade', 0, 80),
        subject: text(d.subject || '', 'Subject', 0, 150),
        reviewRequired: d.reviewRequired === true,
      };
      break;
    case 'classes':
      item.data = {
        grade: number(d.grade, 'Grade', 1, 5),
        sections: text(d.sections || '', 'Sections', 0, 120),
        subjects: text(d.subjects || '', 'Subjects', 0, 500),
      };
      break;
    case 'gallery':
      assert(item.imagePath, 400, 'Upload a photograph for the gallery.');
      assert(
        item.status !== 'published' || d.consentConfirmed === true,
        400,
        'Confirm permission to publish this photograph.',
      );
      item.data = {
        alt: text(d.alt || item.title, 'Image description', 2, 250),
        consentConfirmed: d.consentConfirmed === true,
      };
      break;
    case 'resources': {
      const link = text(d.link || '', 'Resource link', 0, 1500),
        filePath = mediaPath(db, d.filePath, 'pdf');
      if (link) {
        let url;
        try {
          url = new URL(link);
        } catch {
          assert(false, 400, 'Invalid resource link.');
        }
        assert(
          url.protocol === 'https:' && !url.username && !url.password,
          400,
          'Resource links must use HTTPS.',
        );
      }
      assert(filePath || link, 400, 'Upload a PDF or enter a resource link.');
      item.data = { filePath, link, grade: text(d.grade || '', 'Grade', 0, 30) };
      break;
    }
  }
  return item;
}
export function validateSettings(db, value) {
  object(value);
  const result = {};
  for (const key of Object.keys(defaults)) {
    if (['heroImage', 'logoImage'].includes(key)) result[key] = mediaPath(db, value[key]);
    else if (key === 'admissionsOpen') {
      assert(typeof value[key] === 'boolean', 400, 'Invalid admissions setting.');
      result[key] = value[key];
    } else if (key === 'email') result[key] = value[key] ? email(value[key]) : '';
    else if (key === 'phone') result[key] = phone(value[key]);
    else
      result[key] = text(
        value[key] ?? '',
        key,
        ['name', 'shortName'].includes(key) ? 2 : 0,
        ['about', 'vision', 'mission', 'principalMessage'].includes(key) ? 6000 : 250,
      );
  }
  return result;
}
export function pageQuery(url) {
  const page = Number(url.searchParams.get('page') || 1),
    limit = Number(url.searchParams.get('limit') || 12);
  number(page, 'Page', 1, 100000);
  number(limit, 'Page size', 1, 100);
  return {
    page,
    limit,
    search: text(url.searchParams.get('search') || '', 'Search', 0, 100),
    category: text(url.searchParams.get('category') || '', 'Category', 0, 60),
    status: url.searchParams.get('status') || '',
  };
}
