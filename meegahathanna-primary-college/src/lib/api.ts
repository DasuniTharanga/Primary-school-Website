let csrfToken = '';
export const setCsrfToken = (value: string) => {
  csrfToken = value;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
interface Options {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const method = options.method || 'GET',
    mutation = method !== 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (mutation) {
    headers['Content-Type'] = 'application/json';
    headers['X-School-Request'] = '1';
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the school server. Please try again.', 0);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('The server returned an unexpected response.', response.status);
  }
  if (!response.ok) {
    if (
      response.status === 401 &&
      (path.startsWith('/api/admin/') || ['/api/auth/logout', '/api/auth/password'].includes(path))
    )
      window.dispatchEvent(new Event('school:unauthorized'));
    throw new ApiError(result.error || 'The request could not be completed.', response.status);
  }
  return result as T;
}
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
export function formatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (!value) return '';
  const parsed = new Date(value.length === 10 ? value + 'T00:00:00Z' : value);
  return Number.isNaN(parsed.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Colombo',
        ...options,
      }).format(parsed);
}
