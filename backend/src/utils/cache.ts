import logger from './logger';

const testCache = new Map<string, { value: string; expiresAt: number }>();
const useTestCache = () => process.env.NODE_ENV === 'test' && !process.env.UPSTASH_REDIS_REST_URL;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const upstashHeaders = () => ({
  Authorization: `Bearer ${UPSTASH_TOKEN}`,
  'Content-Type': 'application/json',
});

async function upstashFetch(path: string, options: RequestInit = {}) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash Redis not configured');
  }
  const res = await fetch(`${UPSTASH_URL}${path}`, {
    ...options,
    headers: { ...upstashHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash error ${res.status}: ${text}`);
  }
  return res.json();
}

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    if (useTestCache()) {
      const entry = testCache.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        testCache.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    }
    try {
      const data = await upstashFetch(`/get/${encodeURIComponent(key)}`) as { result: string | null };
      if (data.result === null) return null;
      return JSON.parse(data.result) as T;
    } catch (err) {
      logger.warn({ err, key }, 'Cache GET failed');
      return null;
    }
  },

  set: async <T>(key: string, value: T, ttlSeconds: number): Promise<void> => {
    if (useTestCache()) {
      testCache.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + ttlSeconds * 1000 });
      return;
    }
    try {
      const encodedValue = encodeURIComponent(JSON.stringify(value));
      await upstashFetch(`/set/${encodeURIComponent(key)}/${encodedValue}/EX/${ttlSeconds}`, { method: 'POST' });
    } catch (err) {
      logger.warn({ err, key }, 'Cache SET failed');
    }
  },

  del: async (key: string): Promise<void> => {
    if (useTestCache()) {
      testCache.delete(key);
      return;
    }
    try {
      await upstashFetch(`/del/${encodeURIComponent(key)}`, { method: 'DELETE' });
    } catch (err) {
      logger.warn({ err, key }, 'Cache DEL failed');
    }
  },

  clear: async (): Promise<void> => {
    if (useTestCache()) {
      testCache.clear();
      return;
    }
    try {
      await upstashFetch('/flushdb', { method: 'POST' });
    } catch (err) {
      logger.warn({ err }, 'Cache CLEAR failed');
    }
  }
};