import mysql from 'mysql2/promise';
import { dbConfig } from './config.mjs';

export function createPool() {
  return mysql.createPool({ ...dbConfig(), waitForConnections: true, connectionLimit: 10, queueLimit: 0 });
}

/** Run fn(conn) inside a transaction. */
export async function withTransaction(pool, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export const colomboToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** The academic year that contains today, otherwise the most recent one. */
export async function currentYearId(pool) {
  const [rows] = await pool.query(
    'SELECT year_id FROM academic_year ORDER BY (? BETWEEN start_date AND end_date) DESC, start_date DESC LIMIT 1',
    [colomboToday()],
  );
  return rows[0]?.year_id ?? null;
}

export const letterGrade = (m) => (m >= 75 ? 'A' : m >= 65 ? 'B' : m >= 55 ? 'C' : m >= 35 ? 'S' : 'W');

export const reference = (prefix) =>
  `${prefix}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
