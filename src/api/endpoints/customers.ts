import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CustomerService } from '../../services/customer';
import { CSVImportService } from '../../services/csvImport';
import { validateRequest } from '../../middleware/validation';
import {
  createCustomerValidation,
  updateCustomerByIdValidation,
  getCustomerByIdValidation,
  deleteCustomerValidation,
  customerFilterValidation
} from '../../validations/customer';
import {
  CreateCustomerDto,
  UpdateCustomerDto
} from '../../schemas/customer';

const router = Router();
const customerService = new CustomerService();
const csvImportService = new CSVImportService();

// Multer configuration for CSV file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, 'uploads/csv/'); // Make sure this directory exists
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'customers-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Get all customers with filtering and pagination
router.get('/',
  customerFilterValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const size = parseInt(req.query.size as string) || 10;
      const search = req.query.search as string;

      const pagination = { page, size, search };
      
      // Extract filters from query
      const filters: any = {};
      if (req.query.gender) filters.gender = req.query.gender;
      if (req.query.deviceBrand) filters.deviceBrand = req.query.deviceBrand;
      if (req.query.digitalInterest) filters.digitalInterest = req.query.digitalInterest;
      if (req.query.locationType) filters.locationType = req.query.locationType;
      if (req.query.locationName) filters.locationName = req.query.locationName;
      if (req.query.minAge) filters.minAge = parseInt(req.query.minAge as string);
      if (req.query.maxAge) filters.maxAge = parseInt(req.query.maxAge as string);
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;

      const result = await customerService.getAllCustomers(pagination, filters);
      res.status(200).json(result);
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Get customer summary for dashboard
router.get('/summary',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await customerService.getCustomerSummary();
      res.status(200).json(result);
    } catch (error) {
      console.error('Get customer summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Get specific customer by ID
router.get('/:id',
  getCustomerByIdValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.params.id;
      
      if (!customerId) {
        res.status(400).json({
          success: false,
          message: 'Customer ID is required',
          data: null
        });
        return;
      }
      
      const result = await customerService.getCustomerById(customerId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Create new customer
router.post('/',
  createCustomerValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customerData: CreateCustomerDto = req.body;
      const result = await customerService.createCustomer(customerData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Update customer
router.put('/:id',
  updateCustomerByIdValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.params.id;
      const updateData: UpdateCustomerDto = req.body;

      if (!customerId) {
        res.status(400).json({
          success: false,
          message: 'Customer ID is required',
          data: null
        });
        return;
      }

      const result = await customerService.updateCustomer(customerId, updateData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Delete customer
router.delete('/:id',
  deleteCustomerValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.params.id;
      
      if (!customerId) {
        res.status(400).json({
          success: false,
          message: 'Customer ID is required',
          data: null
        });
        return;
      }
      
      const result = await customerService.deleteCustomer(customerId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// CSV Import endpoints

// Import customers from CSV file
router.post('/import/csv',
  upload.single('csvFile'),
  async (req: any, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No CSV file provided',
          data: null
        });
        return;
      }

      const options = {
        skipValidation: req.body.skipValidation === 'true',
        continueOnError: req.body.continueOnError !== 'false', // Default true
        batchSize: parseInt(req.body.batchSize) || 1000
      };

      const { importId, progress } = await csvImportService.importFromCSV(req.file.path, options);
      
      // Delete the uploaded file after processing starts
      setTimeout(() => {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting uploaded file:', err);
          else console.log('Uploaded CSV file deleted:', req.file.path);
        });
      }, 5000); // Wait 5 seconds before deleting

      res.status(202).json({
        success: true,
        message: 'CSV import started',
        data: {
          importId,
          progress,
          statusUrl: `/api/customers/import/status/${importId}`
        }
      });
    } catch (error: any) {
      console.error('CSV import error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start CSV import',
        data: { error: error?.message || 'Unknown error' }
      });
    }
  }
);

// Get import progress
router.get('/import/status/:importId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const importId = req.params.importId;
      
      if (!importId) {
        res.status(400).json({
          success: false,
          message: 'Import ID is required',
          data: null
        });
        return;
      }
      
      const progress = csvImportService.getImportProgress(importId);

      if (!progress) {
        res.status(404).json({
          success: false,
          message: 'Import not found',
          data: null
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Import progress retrieved',
        data: progress
      });
    } catch (error) {
      console.error('Get import progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get import progress',
        data: null
      });
    }
  }
);

// Cancel import
router.post('/import/cancel/:importId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const importId = req.params.importId;
      
      if (!importId) {
        res.status(400).json({
          success: false,
          message: 'Import ID is required',
          data: null
        });
        return;
      }
      
      const cancelled = csvImportService.cancelImport(importId);

      res.status(200).json({
        success: cancelled,
        message: cancelled ? 'Import cancelled' : 'Import not found or cannot be cancelled',
        data: { importId, cancelled }
      });
    } catch (error) {
      console.error('Cancel import error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel import',
        data: null
      });
    }
  }
);

// Get all active imports
router.get('/import/active',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const activeImports = csvImportService.getActiveImports();

      res.status(200).json({
        success: true,
        message: 'Active imports retrieved',
        data: activeImports
      });
    } catch (error) {
      console.error('Get active imports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active imports',
        data: null
      });
    }
  }
);

export default router;