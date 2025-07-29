import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './core/config';
import { database } from './core/database';
import { redisClient } from './core/redis';
import { globalErrorHandler, notFound } from './middleware/error_handler';
import { requestLogger, addCorrelationId } from './middleware/logging';
import { generalLimiter } from './middleware/rate_limiting';
import { ApiResponse, StatusResponse } from './schemas/base';

class App {
  public app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    }));

    this.app.use(addCorrelationId);
    this.app.use(requestLogger);

    this.app.use(cookieParser()); // Enable cookie parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use(generalLimiter);
  }

  private initializeRoutes(): void {
    this.app.get(config.healthCheckPath, (req, res) => {
      const healthCheck: StatusResponse = {
        success: true,
        message: 'Server is healthy',
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          version: process.env.npm_package_version || '1.0.0',
          services: {
            database: database.isConnected() ? 'connected' : 'disconnected',
            redis: redisClient.isConnected() ? 'connected' : 'disconnected'
          }
        }
      };

      const statusCode = (
        database.isConnected() && redisClient.isConnected()
      ) ? 200 : 503;

      res.status(statusCode).json(healthCheck);
    });

    this.app.get(config.metricsPath, (req, res) => {
      const metrics = {
        success: true,
        message: 'Server metrics',
        data: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version,
          timestamp: new Date().toISOString()
        }
      } as ApiResponse;

      res.json(metrics);
    });

    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Higo Backend API is running',
        data: {
          version: '1.0.0',
          environment: config.nodeEnv,
          timestamp: new Date().toISOString()
        }
      } as ApiResponse);
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(notFound);
    this.app.use(globalErrorHandler);
  }

  public async start(): Promise<void> {
    try {
      await database.connect();
      await redisClient.connect();

      this.server = this.app.listen(config.port, () => {
        console.log(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
        console.log(`📍 Health check available at http://localhost:${config.port}${config.healthCheckPath}`);
        console.log(`📊 Metrics available at http://localhost:${config.port}${config.metricsPath}`);
      });

      this.setupGracefulShutdown();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      if (this.server) {
        this.server.close(async () => {
          console.log('📴 HTTP server closed');

          try {
            await database.disconnect();
            await redisClient.disconnect();
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        });
      }

      setTimeout(() => {
        console.error('⚠️  Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }
}

export default App;

if (require.main === module) {
  const app = new App();
  app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}