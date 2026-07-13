import Redis from 'ioredis';
import logger from './logger';

let client: Redis;

const getClient = (): Redis => {
  if (!client) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      }
    });
    client.on('error', (err) => logger.error({ err }, 'Redis connection error'));
  }
  return client;
};

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const redis = getClient();
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn({ err }, 'Cache GET failed');
      return null;
    }
  },

  set: async <T>(key: string, value: T, ttlSeconds: number): Promise<void> => {
    try {
      const redis = getClient();
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err }, 'Cache SET failed');
    }
  },

  del: async (key: string): Promise<void> => {
    try {
      const redis = getClient();
      await redis.del(key);
    } catch (err) {
      logger.warn({ err }, 'Cache DEL failed');
    }
  },

  clear: async (): Promise<void> => {
    try {
      const redis = getClient();
      await redis.flushdb();
    } catch (err) {
      logger.warn({ err }, 'Cache CLEAR failed');
    }
  }
};
