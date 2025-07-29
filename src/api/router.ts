import { Router } from 'express';
import authRoutes from './endpoints/auth';
import usersRoutes from './endpoints/users';
import customersRoutes from './endpoints/customers';
import { Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// API info endpoint
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Higo Backend API',
    data: {
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        customers: '/api/customers',
        health: '/api/health'
      },
      documentation: 'https://docs.api.higo.com'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/customers', customersRoutes);

// 404 handler for API routes
router.use('*catchall', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    data: {
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
});

export default router;