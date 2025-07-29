import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
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

// Helper function to create store based on Redis availability
const createStore = () => {
  try {
    if (redisClient.isConnected()) {
      return new RedisStore({
        sendCommand: (...args: string[]) => redisClient.getClient().sendCommand(args),
      });
    }
  } catch (error) {
    console.warn('Redis not available, using memory store for rate limiting');
  }
  return undefined; // Use default memory store
};

const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const store = createStore();
  const config: any = {
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later'
    } as ApiResponse,
    keyGenerator: options.keyGenerator || generateKeyByIp,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting untuk health check dan metrics
      return req.url === '/health' || req.url === '/metrics';
    }
  };
  
  // Only add store if it exists (Redis available)
  if (store) {
    config.store = store;
  }
  
  return rateLimit(config);
};

export const generalLimiter = createRateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: 'Too many requests from this IP, please try again later'
});

export const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => `auth:${generateKeyByIp(req)}`
});

export const apiLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window for API endpoints
  message: 'API rate limit exceeded, please try again later',
  keyGenerator: (req: Request) => `api:${generateKeyByIp(req)}`
});

export const userBasedLimiter = (windowMs: number = 60 * 1000, max: number = 30) => {
  return createRateLimit({
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
  return createRateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    keyGenerator: (req: Request) => `${options.keyPrefix}:${generateKeyByIp(req)}`
  });
};