import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { redisClient } from '../core/redis';
import { config } from '../core/config';
import { ApiResponse } from '../schemas/base';

// Custom IP key generator that handles IPv6 addresses properly
const generateKeyByIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  
  // Handle IPv6 addresses by normalizing them
  if (ip.includes(':')) {
    // Simple IPv6 normalization - remove brackets and compress
    return ip.replace(/^\[|\]$/g, '').toLowerCase();
  }
  
  return ip;
};

interface RedisStore {
  incr: (key: string) => Promise<number>;
  decrement: (key: string) => Promise<void>;
  resetTime: (key: string) => Promise<Date>;
}

class RedisRateLimitStore implements RedisStore {
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  async incr(key: string): Promise<number> {
    try {
      const client = redisClient.getClient();
      const current = await client.incr(key);
      
      if (current === 1) {
        await client.expire(key, Math.ceil(this.windowMs / 1000));
      }
      
      return current;
    } catch (error) {
      console.error('Redis rate limit error:', error);
      return 1;
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const client = redisClient.getClient();
      await client.decr(key);
    } catch (error) {
      console.error('Redis rate limit decrement error:', error);
    }
  }

  async resetTime(key: string): Promise<Date> {
    try {
      const client = redisClient.getClient();
      const ttl = await client.ttl(key);
      return new Date(Date.now() + ttl * 1000);
    } catch (error) {
      console.error('Redis rate limit reset time error:', error);
      return new Date(Date.now() + this.windowMs);
    }
  }
}

const createRedisRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const store = new RedisRateLimitStore(options.windowMs);
  
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later'
    } as ApiResponse,
    keyGenerator: options.keyGenerator || generateKeyByIp,
    store: {
      incr: async (key: string) => {
        const totalHits = await store.incr(key);
        const resetTime = await store.resetTime(key);
        return { totalHits, resetTime };
      },
      decrement: store.decrement.bind(store),
      resetKey: async (key: string) => {
        try {
          await redisClient.del(key);
        } catch (error) {
          console.error('Redis rate limit reset key error:', error);
        }
      }
    } as any,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const generalLimiter = createRedisRateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: 'Too many requests from this IP, please try again later'
});

export const authLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => `auth:${generateKeyByIp(req)}`
});

export const apiLimiter = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window for API endpoints
  message: 'API rate limit exceeded, please try again later',
  keyGenerator: (req: Request) => `api:${generateKeyByIp(req)}`
});

export const userBasedLimiter = (windowMs: number = 60 * 1000, max: number = 30) => {
  return createRedisRateLimit({
    windowMs,
    max,
    message: 'User rate limit exceeded, please try again later',
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || generateKeyByIp(req);
      return `user:${userId}`;
    }
  });
};

export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
}) => {
  return createRedisRateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    keyGenerator: (req: Request) => `${options.keyPrefix}:${generateKeyByIp(req)}`
  });
};