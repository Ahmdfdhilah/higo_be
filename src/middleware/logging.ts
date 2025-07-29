import morgan from 'morgan';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { isDevelopment } from '../core/config';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

export const addCorrelationId = (req: Request, res: Response, next: any) => {
  req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

morgan.token('correlation-id', (req: Request) => req.correlationId || '');
morgan.token('response-time-ms', (req: Request) => {
  if (req.startTime) {
    return `${Date.now() - req.startTime}ms`;
  }
  return '';
});

const developmentFormat = ':method :url :status :res[content-length] - :response-time ms [:correlation-id]';

const productionFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  contentLength: ':res[content-length]',
  responseTime: ':response-time-ms',
  correlationId: ':correlation-id',
  userAgent: ':user-agent',
  remoteAddr: ':remote-addr',
  timestamp: ':date[iso]'
});

export const requestLogger = morgan(
  isDevelopment ? developmentFormat : productionFormat,
  {
    stream: {
      write: (message: string) => {
        if (isDevelopment) {
          console.log(message.trim());
        } else {
          try {
            const logData = JSON.parse(message);
            console.log(JSON.stringify({
              level: 'info',
              type: 'http_request',
              ...logData
            }));
          } catch (error) {
            console.log(message.trim());
          }
        }
      }
    },
    skip: (req: Request, res: Response) => {
      return req.url === '/health' || req.url === '/metrics';
    }
  }
);

export const logError = (error: Error, correlationId?: string, context?: any) => {
  const errorLog = {
    level: 'error',
    message: error.message,
    stack: error.stack,
    correlationId,
    context,
    timestamp: new Date().toISOString()
  };

  console.error(JSON.stringify(errorLog));
};

export const logInfo = (message: string, correlationId?: string, context?: any) => {
  const infoLog = {
    level: 'info',
    message,
    correlationId,
    context,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(infoLog));
};

export const logWarn = (message: string, correlationId?: string, context?: any) => {
  const warnLog = {
    level: 'warn',
    message,
    correlationId,
    context,
    timestamp: new Date().toISOString()
  };

  console.warn(JSON.stringify(warnLog));
};