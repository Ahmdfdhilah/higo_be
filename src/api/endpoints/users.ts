import { Router, Request, Response } from 'express';
import { UserService } from '../../services/user';
import { authMiddleware } from '../../auth/jwt';
import { checkPermission } from '../../auth/permissions';
import { validateRequest } from '../../middleware/validation';
import { UserRole, UserStatus } from '../../models/enums';
import {
  CreateUserDto,
  UpdateUserDto,
  BulkUserActionDto,
  ChangeUserRoleDto,
} from '../../types/user';
import { paginationValidation } from '../../validations/base';
import { bulkUserActionValidation, changeUserRoleValidation, createUserValidation, inactiveUsersValidation, roleParamWithPaginationValidation, updateUserByIdValidation, userActionValidation, userByIdValidation } from '../../validations/user';

const router = Router();
const userService = new UserService();


// Get all users (Admin only)
router.get('/',
  authMiddleware,
  checkPermission(['admin']),
  paginationValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const size = parseInt(req.query.size as string) || 10;
      const search = req.query.search as string;

      const pagination = { page, size, search };
      const result = await userService.findAll({}, pagination);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Get active users (Admin/Moderator)
router.get('/active',
  authMiddleware,
  checkPermission(['admin', 'moderator']),
  paginationValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || undefined;
      const size = parseInt(req.query.size as string) || undefined;
      const search = req.query.search as string;

      const pagination = (page && size) ? { page, size, search } : undefined;
      const result = await userService.getActiveUsers(pagination);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get active users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Get users by role (Admin only)
router.get('/role/:role',
  authMiddleware,
  checkPermission(['admin']),
  roleParamWithPaginationValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const role = req.params.role as UserRole;
      const page = parseInt(req.query.page as string) || undefined;
      const size = parseInt(req.query.size as string) || undefined;
      const search = req.query.search as string;

      const pagination = (page && size) ? { page, size, search } : undefined;
      const result = await userService.getUsersByRole(role, pagination);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get users by role error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Get user statistics (Admin only)
router.get('/stats',
  authMiddleware,
  checkPermission(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await userService.getUserStats();
      res.status(200).json(result);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Get inactive users (Admin only)
router.get('/inactive',
  authMiddleware,
  checkPermission(['admin']),
  inactiveUsersValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const result = await userService.getInactiveUsers(days);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get inactive users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Get specific user by ID (Admin/Moderator or own profile)
router.get('/:id',
  authMiddleware,
  userByIdValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const currentUser = (req as any).user;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null
        });
        return;
      }

      // Check if user can access this profile
      if (currentUser.role !== UserRole.ADMIN &&
        currentUser.role !== UserRole.MODERATOR &&
        currentUser.id !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          data: null
        });
        return;
      }

      const result = await userService.getUserById(userId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Create new user (Admin only)
router.post('/',
  authMiddleware,
  checkPermission(['admin']),
  createUserValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserDto = req.body;
      const createdBy = (req as any).user.id;

      const result = await userService.register(userData, createdBy);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Update user (Admin/Moderator or own profile)
router.put('/:id',
  authMiddleware,
  updateUserByIdValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const currentUser = (req as any).user;
      const updateData: UpdateUserDto = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null
        });
        return;
      }

      // Check permissions
      if (currentUser.role !== UserRole.ADMIN &&
        currentUser.role !== UserRole.MODERATOR &&
        currentUser.id !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          data: null
        });
        return;
      }

      const result = await userService.updateProfile(userId, updateData);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Suspend user (Admin only)
router.put('/:id/suspend',
  authMiddleware,
  checkPermission(['admin']),
  userActionValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const suspendedBy = (req as any).user.id;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null
        });
        return;
      }

      const result = await userService.suspendUser(userId, suspendedBy);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Activate user (Admin only)
router.put('/:id/activate',
  authMiddleware,
  checkPermission(['admin']),
  userActionValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const activatedBy = (req as any).user.id;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null
        });
        return;
      }

      const result = await userService.activateUser(userId, activatedBy);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Activate user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Change user role (Admin only)
router.put('/:id/role',
  authMiddleware,
  checkPermission(['admin']),
  changeUserRoleValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const roleData: ChangeUserRoleDto = req.body;
      const changedBy = (req as any).user.id;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null
        });
        return;
      }

      const result = await userService.changeUserRole(userId, roleData.role, changedBy);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Change user role error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Delete user (Admin only)
router.delete('/:id',
  authMiddleware,
  checkPermission(['admin']),
  userActionValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const currentUserId = (req as any).user.id;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null
        });
        return;
      }

      // Prevent admin from deleting themselves
      if (userId === currentUserId) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete your own account',
          data: null
        });
        return;
      }

      const result = await userService.delete(userId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

// Bulk operations (Admin only)
router.post('/bulk/suspend',
  authMiddleware,
  checkPermission(['admin']),
  bulkUserActionValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bulkData: BulkUserActionDto = req.body;
      const suspendedBy = (req as any).user.id;

      const result = await userService.bulkUpdate(
        { _id: { $in: bulkData.userIds } },
        { status: UserStatus.SUSPENDED },
        suspendedBy
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Bulk suspend error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

router.post('/bulk/activate',
  authMiddleware,
  checkPermission(['admin']),
  bulkUserActionValidation,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bulkData: BulkUserActionDto = req.body;
      const activatedBy = (req as any).user.id;

      const result = await userService.bulkUpdate(
        { _id: { $in: bulkData.userIds } },
        { status: UserStatus.ACTIVE },
        activatedBy
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Bulk activate error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
);

export default router;