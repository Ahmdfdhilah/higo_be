import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/enums';
import { AuthRequest } from './jwt';
import { ApiResponse } from '../schemas/base';

export enum Permission {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  ADMIN_READ = 'admin:read',
  ADMIN_WRITE = 'admin:write',
  MODERATOR_READ = 'moderator:read',
  MODERATOR_WRITE = 'moderator:write'
}

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DELETE,
    Permission.ADMIN_READ,
    Permission.ADMIN_WRITE,
    Permission.MODERATOR_READ,
    Permission.MODERATOR_WRITE
  ],
  [UserRole.MODERATOR]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.MODERATOR_READ,
    Permission.MODERATOR_WRITE
  ],
  [UserRole.USER]: [
    Permission.USER_READ
  ]
};

export class PermissionService {
  public static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
  }

  public static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  public static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  public static getRoleHierarchy(): Record<UserRole, number> {
    return {
      [UserRole.USER]: 1,
      [UserRole.MODERATOR]: 2,
      [UserRole.ADMIN]: 3
    };
  }

  public static isHigherRole(userRole: UserRole, targetRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole] > hierarchy[targetRole];
  }

  public static canAccessResource(
    userRole: UserRole,
    resourceOwnerId: string,
    currentUserId: string,
    requiredPermission: Permission
  ): boolean {
    if (resourceOwnerId === currentUserId) {
      return true;
    }

    return this.hasPermission(userRole, requiredPermission);
  }
}

export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!PermissionService.hasPermission(req.user.role as UserRole, permission)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      } as ApiResponse);
      return;
    }

    next();
  };
};

export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!PermissionService.hasAnyPermission(req.user.role as UserRole, permissions)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      } as ApiResponse);
      return;
    }

    next();
  };
};

export const requireAllPermissions = (permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!PermissionService.hasAllPermissions(req.user.role as UserRole, permissions)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      } as ApiResponse);
      return;
    }

    next();
  };
};

export const requireResourceOwnershipOrPermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as ApiResponse);
      return;
    }

    const resourceUserId = req.params.userId || req.body.userId;
    const currentUserId = req.user._id.toString();

    if (!PermissionService.canAccessResource(
      req.user.role as UserRole,
      resourceUserId,
      currentUserId,
      permission
    )) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      } as ApiResponse);
      return;
    }

    next();
  };
};

// Simple role-based check function for endpoints
export const checkPermission = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      } as ApiResponse);
      return;
    }

    next();
  };
};