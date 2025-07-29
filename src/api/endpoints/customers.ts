import { Router, Request, Response } from 'express';
import { CustomerService } from '../../services/customer';
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

export default router;