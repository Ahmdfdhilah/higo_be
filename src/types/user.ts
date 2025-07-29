import { Types } from 'mongoose';
import { IBaseModel, BaseFilters } from './base';
import { UserRole, UserStatus } from '../models/enums';

// Core User Interface (extends database model)
export interface IUser extends IBaseModel {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
}

// DTOs for API requests
export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeUserRoleDto {
  role: UserRole;
}

// DTOs for API responses
export interface UserResponseDto {
  _id: Types.ObjectId | string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date | undefined;
  emailVerifiedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId | string | undefined;
  updatedBy?: Types.ObjectId | string | undefined;
}

// Query filters
export interface UserFilters extends BaseFilters {
  role?: UserRole;
  status?: UserStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'email' | 'firstName' | 'lastName';
  sortOrder?: 'asc' | 'desc';
}

// Statistics
export interface UserStatsDto {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  verified: number;
  unverified: number;
  byRole: {
    [UserRole.ADMIN]: number;
    [UserRole.USER]: number;
    [UserRole.MODERATOR]: number;
  };
}

// Bulk operations
export interface BulkUserActionDto {
  userIds: string[];
}

export interface InactiveUsersQueryDto {
  days?: number;
}