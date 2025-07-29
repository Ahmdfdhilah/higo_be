import { Types } from 'mongoose';
import { UserRole, UserStatus } from '../models/enums';

// User DTOs for input
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

// User DTO for response - matches IUser model structure
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

export interface BulkUserActionDto {
  userIds: string[];
}

export interface ChangeUserRoleDto {
  role: UserRole;
}

// User Query DTOs
export interface UserQueryDto {
  page?: number;
  size?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'email' | 'firstName' | 'lastName';
  sortOrder?: 'asc' | 'desc';
}

export interface InactiveUsersQueryDto {
  days?: number;
}