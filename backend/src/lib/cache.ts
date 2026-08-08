import Redis from 'ioredis';
import { config } from '../config/env';
import { createLogger } from './logger';

const log = createLogger('redis');

export class CacheService {
  private static instance: CacheService;
  private client: Redis;
  private defaultTTL = 3600;

  private constructor() {
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('connect', () => log.info('Redis connected'));
    this.client.on('error', (err) => {
      if (config.isDev) {
        log.warn('Redis error (continuing without cache)', { error: err.message });
      } else {
        log.error('Redis error', { error: err.message });
      }
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (err) {
      log.warn(`GET failed for ${key}`, { error: (err as Error).message });
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds ?? this.defaultTTL);
    } catch (err) {
      log.warn(`SET failed for ${key}`, { error: (err as Error).message });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      log.warn(`DEL failed for ${key}`, { error: (err as Error).message });
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      log.warn(`DEL pattern failed for ${pattern}`, { error: (err as Error).message });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.client.exists(key)) === 1;
    } catch {
      return false;
    }
  }

  async remember<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch {
      return -1;
    }
  }

  async increment(key: string, by = 1): Promise<number> {
    try {
      return await this.client.incrby(key, by);
    } catch {
      return 0;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (err) {
      log.warn('Flush failed', { error: (err as Error).message });
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const cache = CacheService.getInstance();