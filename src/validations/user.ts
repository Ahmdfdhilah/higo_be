import { body } from 'express-validator';
import { UserRole } from '../models/enums';
import {
  emailValidation,
  passwordValidation,
  firstNameValidation,
  lastNameValidation,
  roleValidation,
  optionalEmailValidation,
  optionalFirstNameValidation,
  optionalLastNameValidation,
  userIdValidation,
  roleParamValidation,
  paginationValidation,
  daysQueryValidation,
  userIdsArrayValidation
} from './base';

// Create user validation (Admin creates user)
export const createUserValidation = [
  emailValidation,
  passwordValidation,
  firstNameValidation,
  lastNameValidation,
  roleValidation
];

// Update user validation
export const updateUserValidation = [
  optionalFirstNameValidation,
  optionalLastNameValidation,
  optionalEmailValidation
];

// User ID parameter validation
export const idValidation = [userIdValidation];

// Pagination validation for user queries
export { paginationValidation };

// Role parameter validation
export const roleParamWithPaginationValidation = [
  roleParamValidation,
  ...paginationValidation
];

// Days query validation for inactive users
export const inactiveUsersValidation = [daysQueryValidation];

// Combined validations for specific endpoints
export const userByIdValidation = idValidation;

export const updateUserByIdValidation = [
  ...idValidation,
  ...updateUserValidation
];

export const userActionValidation = idValidation;

// Change user role validation
export const changeUserRoleValidation = [
  ...idValidation,
  body('role').isIn(Object.values(UserRole)).withMessage('Invalid role')
];

// Bulk operations validation
export const bulkUserActionValidation = userIdsArrayValidation;