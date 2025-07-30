import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database - Railway uses MONGODB_URL, fallback to MONGODB_URI
  mongodbUri: process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/higo',
  
  // Redis - Railway uses REDIS_URL
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m', // 30 minutes session timeout
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
  
  // CORS - Railway frontend URL
  corsOrigin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '*',
  
  // File Upload - Railway persistent storage
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '200') * 1024 * 1024, // MB to bytes
  
  // Health Check
  healthCheckPath: '/health',
  metricsPath: '/metrics'
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';