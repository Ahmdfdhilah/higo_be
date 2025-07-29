import { redisClient } from '../core/redis';

export class CacheService {
  private static defaultTTL = 3600; // 1 hour in seconds

  public static async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = this.defaultTTL
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.set(key, serializedValue, ttlSeconds);
    } catch (error) {
      console.error('Cache SET error:', error);
      throw error;
    }
  }

  public static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache GET error:', error);
      return null;
    }
  }

  public static async del(key: string): Promise<boolean> {
    try {
      const result = await redisClient.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache DELETE error:', error);
      return false;
    }
  }

  public static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache EXISTS error:', error);
      return false;
    }
  }

  public static async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      return await redisClient.expire(key, ttlSeconds);
    } catch (error) {
      console.error('Cache EXPIRE error:', error);
      return false;
    }
  }

  public static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = redisClient.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      return await client.del(keys);
    } catch (error) {
      console.error('Cache INVALIDATE_PATTERN error:', error);
      return 0;
    }
  }

  public static generateKey(...parts: string[]): string {
    return parts.join(':');
  }

  public static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = this.defaultTTL
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const fresh = await fetcher();
      await this.set(key, fresh, ttlSeconds);
      return fresh;
    } catch (error) {
      console.error('Cache GET_OR_SET error:', error);
      return await fetcher();
    }
  }

  public static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = redisClient.getClient();
      const values = await client.mGet(keys);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache MGET error:', error);
      return keys.map(() => null);
    }
  }

  public static async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
    defaultTTL: number = this.defaultTTL
  ): Promise<void> {
    try {
      const client = redisClient.getClient();
      
      for (const { key, value, ttl } of keyValuePairs) {
        const serializedValue = JSON.stringify(value);
        await client.setEx(key, ttl || defaultTTL, serializedValue);
      }
    } catch (error) {
      console.error('Cache MSET error:', error);
      throw error;
    }
  }

  public static createCacheDecorator<T extends any[], R>(
    keyGenerator: (...args: T) => string,
    ttlSeconds: number = this.defaultTTL
  ) {
    return function (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: T): Promise<R> {
        const cacheKey = keyGenerator(...args);
        
        const cached = await CacheService.get<R>(cacheKey);
        if (cached !== null) {
          return cached;
        }

        const result = await method.apply(this, args);
        await CacheService.set(cacheKey, result, ttlSeconds);
        
        return result;
      };

      return descriptor;
    };
  }
}

export const cache = CacheService;