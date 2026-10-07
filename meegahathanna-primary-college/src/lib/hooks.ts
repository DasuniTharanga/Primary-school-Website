import { useCallback, useEffect, useState } from 'react';
import { api, messageOf } from './api';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<T>(url, { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(messageOf(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, tick]);
  return { data, loading, error, reload };
}
export function useDebounce<T>(value: T, delay = 250) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return result;
}
