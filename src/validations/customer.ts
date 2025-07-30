import { body, query } from 'express-validator';
import { Gender, DeviceBrand, DigitalInterest, LocationType } from '../models/enums';
import {
  paginationValidation,
  mongoIdValidation
} from './base';

// Create customer validation
export const createCustomerValidation = [
  body('number')
    .isInt({ min: 1 })
    .withMessage('Number must be a positive integer'),
  
  body('locationName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Location name is required'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  
  body('loginHour')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Login hour must be in HH:MM format'),
  
  body('userName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('User name is required'),
  
  body('birthYear')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Birth year must be between 1900 and current year'),
  
  body('gender')
    .isIn(Object.values(Gender))
    .withMessage('Invalid gender'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phoneNumber')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Phone number is required'),
  
  body('deviceBrand')
    .isIn(Object.values(DeviceBrand))
    .withMessage('Invalid device brand'),
  
  body('digitalInterest')
    .isIn(Object.values(DigitalInterest))
    .withMessage('Invalid digital interest'),
  
  body('locationType')
    .isIn(Object.values(LocationType))
    .withMessage('Invalid location type')
];

// Update customer validation
export const updateCustomerValidation = [
  body('locationName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Location name cannot be empty'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  
  body('loginHour')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Login hour must be in HH:MM format'),
  
  body('userName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('User name cannot be empty'),
  
  body('birthYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Birth year must be between 1900 and current year'),
  
  body('gender')
    .optional()
    .isIn(Object.values(Gender))
    .withMessage('Invalid gender'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Phone number cannot be empty'),
  
  body('deviceBrand')
    .optional()
    .isIn(Object.values(DeviceBrand))
    .withMessage('Invalid device brand'),
  
  body('digitalInterest')
    .optional()
    .isIn(Object.values(DigitalInterest))
    .withMessage('Invalid digital interest'),
  
  body('locationType')
    .optional()
    .isIn(Object.values(LocationType))
    .withMessage('Invalid location type')
];

// Customer ID validation
export const customerIdValidation = [mongoIdValidation('id')];

// Customer filtering validation
export const customerFilterValidation = [
  ...paginationValidation,
  
  // Filter validations
  query('gender')
    .optional()
    .isIn(Object.values(Gender))
    .withMessage('Invalid gender filter'),
  
  query('deviceBrand')
    .optional()
    .isIn(Object.values(DeviceBrand))
    .withMessage('Invalid device brand filter'),
  
  query('digitalInterest')
    .optional()
    .isIn(Object.values(DigitalInterest))
    .withMessage('Invalid digital interest filter'),
  
  query('locationType')
    .optional()
    .isIn(Object.values(LocationType))
    .withMessage('Invalid location type filter'),
  
  query('locationName')
    .optional()
    .isString()
    .withMessage('Location name must be a string'),
  
  query('minAge')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('Minimum age must be between 0 and 120'),
  
  query('maxAge')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('Maximum age must be between 0 and 120'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
];

// Combined validations for specific endpoints
export const getCustomerByIdValidation = customerIdValidation;

export const updateCustomerByIdValidation = [
  ...customerIdValidation,
  ...updateCustomerValidation
];

export const deleteCustomerValidation = customerIdValidation;

// Customer summary response validation schemas
export const customerSummaryValidation = {
  totalCustomers: {
    type: 'number',
    minimum: 0,
    description: 'Total number of customers'
  },
  uniqueLocations: {
    type: 'number',
    minimum: 0,
    description: 'Number of unique location names'
  },
  avgAge: {
    type: 'number',
    minimum: 0,
    maximum: 120,
    description: 'Average age of customers'
  },
  genderDistribution: {
    type: 'object',
    properties: {
      male: { type: 'number', minimum: 0 },
      female: { type: 'number', minimum: 0 }
    },
    required: ['male', 'female'],
    description: 'Distribution of customers by gender'
  },
  deviceDistribution: {
    type: 'object',
    properties: {
      samsung: { type: 'number', minimum: 0 },
      apple: { type: 'number', minimum: 0 },
      huawei: { type: 'number', minimum: 0 },
      xiaomi: { type: 'number', minimum: 0 },
      oppo: { type: 'number', minimum: 0 },
      vivo: { type: 'number', minimum: 0 },
      other: { type: 'number', minimum: 0 }
    },
    required: ['samsung', 'apple'],
    description: 'Distribution of customers by device brand'
  },
  locationDistribution: {
    type: 'object',
    properties: {
      urban: { type: 'number', minimum: 0 },
      suburban: { type: 'number', minimum: 0 },
      rural: { type: 'number', minimum: 0 }
    },
    required: ['urban', 'suburban'],
    description: 'Distribution of customers by location type'
  },
  interestDistribution: {
    type: 'object',
    properties: {
      socialMedia: { type: 'number', minimum: 0 },
      gaming: { type: 'number', minimum: 0 },
      shopping: { type: 'number', minimum: 0 },
      news: { type: 'number', minimum: 0 },
      entertainment: { type: 'number', minimum: 0 },
      education: { type: 'number', minimum: 0 },
      health: { type: 'number', minimum: 0 },
      finance: { type: 'number', minimum: 0 },
      travel: { type: 'number', minimum: 0 },
      food: { type: 'number', minimum: 0 },
      other: { type: 'number', minimum: 0 }
    },
    required: ['socialMedia', 'gaming'],
    description: 'Distribution of customers by digital interest'
  },
  dateRange: {
    type: 'object',
    properties: {
      earliest: { 
        type: ['string', 'null'], 
        format: 'date-time',
        description: 'Earliest customer date'
      },
      latest: { 
        type: ['string', 'null'], 
        format: 'date-time',
        description: 'Latest customer date'
      }
    },
    required: ['earliest', 'latest'],
    description: 'Date range of customer data'
  }
};

// JSON Schema for complete customer summary
export const customerSummarySchema = {
  type: 'object',
  properties: customerSummaryValidation,
  required: [
    'totalCustomers',
    'uniqueLocations', 
    'avgAge',
    'genderDistribution',
    'deviceDistribution',
    'locationDistribution',
    'interestDistribution',
    'dateRange'
  ],
  additionalProperties: false
};