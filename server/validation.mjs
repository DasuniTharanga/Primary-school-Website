import { HttpError } from './auth.mjs';

const bad = (m) => { throw new HttpError(400, m); };

export const str = (v, label, { min = 1, max = 255, optional = false } = {}) => {
  if (v == null || v === '') { if (optional) return ''; bad(`${label} is required.`); }
  if (typeof v !== 'string') bad(`${label} must be text.`);
  const t = v.trim();
  if (t.length < min) bad(`${label} is required.`);
  if (t.length > max) bad(`${label} must be ${max} characters or fewer.`);
  return t;
};
export const email = (v, label = 'Email', optional = false) => {
  const t = str(v, label, { max: 100, optional });
  if (t && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) bad(`Enter a valid ${label.toLowerCase()}.`);
  return t;
};
export const phone = (v, label = 'Phone', optional = false) => {
  const t = str(v, label, { max: 20, optional });
  if (t && !/^[0-9+()\-\s]{7,20}$/.test(t)) bad(`Enter a valid ${label.toLowerCase()} number.`);
  return t;
};
export const date = (v, label = 'Date', optional = false) => {
  const t = str(v, label, { max: 10, optional });
  if (t && (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(t)))) bad(`${label} must be a valid date.`);
  return t || null;
};
export const time = (v, label = 'Time') => {
  const t = str(v, label, { max: 8, optional: true });
  if (t && !/^\d{2}:\d{2}(:\d{2})?$/.test(t)) bad(`${label} must be a valid time.`);
  return t ? (t.length === 5 ? t + ':00' : t) : null;
};
export const int = (v, label, { min = 0, max = 1e9, optional = false } = {}) => {
  if ((v == null || v === '') && optional) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) bad(`${label} is invalid.`);
  return n;
};
export const choice = (v, label, options) => {
  if (!options.includes(v)) bad(`${label} must be one of: ${options.join(', ')}.`);
  return v;
};
export const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);
export const obj = (v) => { if (!v || typeof v !== 'object' || Array.isArray(v)) bad('Invalid request.'); return v; };
export const imagePath = (v) => {
  const t = str(v, 'Image path', { max: 255 });
  if (!/^(\/[\w\-./]+|https:\/\/[^\s]+)$/.test(t) || t.includes('..')) bad('Image must be a /path or an https:// URL.');
  return t;
};
export const password = (v) => {
  if (typeof v !== 'string' || v.length < 10 || v.length > 100) bad('Password must be 10 to 100 characters.');
  return v;
};
