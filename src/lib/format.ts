const parse = (d: string) => new Date(d.length <= 10 ? d + 'T00:00:00' : d.replace(' ', 'T'));
export const fmtDate = (d?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? parse(d).toLocaleDateString('en-GB', opts) : '';
export const fmtDay = (d: string) => parse(d).getDate();
export const fmtMonth = (d: string) => parse(d).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
export const fmtTime = (t?: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const initials = (name: string) =>
  name.replace(/^(Mrs?|Ms|Dr|Rev)\.?\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const gradeOf = (m: number) => (m >= 75 ? 'A' : m >= 65 ? 'B' : m >= 55 ? 'C' : m >= 35 ? 'S' : 'W');
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
