import { body, query, param } from 'express-validator';
import { UserRole } from '../models/enums';

// Common field validations
export const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email is required');

export const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain uppercase, lowercase, number and special character');

export const firstNameValidation = body('firstName')
  .trim()
  .isLength({ min: 1 })
  .withMessage('First name is required');

export const lastNameValidation = body('lastName')
  .trim()
  .isLength({ min: 1 })
  .withMessage('Last name is required');

export const roleValidation = body('role')
  .optional()
  .isIn(Object.values(UserRole))
  .withMessage('Invalid role');

// Optional field validations
export const optionalEmailValidation = body('email')
  .optional()
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email is required');

export const optionalFirstNameValidation = body('firstName')
  .optional()
  .trim()
  .isLength({ min: 1 })
  .withMessage('First name cannot be empty');

export const optionalLastNameValidation = body('lastName')
  .optional()
  .trim()
  .isLength({ min: 1 })
  .withMessage('Last name cannot be empty');

// Parameter validations
export const mongoIdValidation = (field: string = 'id') => 
  param(field).isMongoId().withMessage(`Invalid ${field}`);

export const userIdValidation = mongoIdValidation('id').withMessage('Invalid user ID');

export const roleParamValidation = param('role')
  .isIn(Object.values(UserRole))
  .withMessage('Invalid role');

// Query validations
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Size must be between 1 and 100'),
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
];

export const daysQueryValidation = query('days')
  .optional()
  .isInt({ min: 1 })
  .withMessage('Days must be a positive integer');

// Array validations
export const userIdsArrayValidation = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('User IDs array is required'),
  body('userIds.*')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// Password specific validations
export const currentPasswordValidation = body('currentPassword')
  .notEmpty()
  .withMessage('Current password is required');

export const newPasswordValidation = body('newPassword')
  .isLength({ min: 8 })
  .withMessage('New password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('New password must contain uppercase, lowercase, number and special character');

export const simplePasswordValidation = body('password')
  .notEmpty()
  .withMessage('Password is required');