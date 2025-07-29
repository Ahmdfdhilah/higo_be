import { BaseRepository } from './base';
import { IUser, User } from '../models/user';
import { UserStatus, UserRole } from '../models/enums';
import { PaginationParams, PaginatedResponse } from '../schemas/base';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  protected getSearchFields(): string[] {
    return ['email', 'firstName', 'lastName'];
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase().trim() });
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    try {
      return await this.model.findOne({ email: email.toLowerCase().trim() }).select('+password').exec();
    } catch (error) {
      throw this.handleError(error, 'findByEmailWithPassword');
    }
  }

  async findActiveUsers(pagination?: PaginationParams): Promise<PaginatedResponse<IUser> | IUser[]> {
    const filter = { status: UserStatus.ACTIVE };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }
    
    return this.find(filter);
  }

  async findUsersByRole(role: UserRole, pagination?: PaginationParams): Promise<PaginatedResponse<IUser> | IUser[]> {
    const filter = { role, status: UserStatus.ACTIVE };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }
    
    return this.find(filter);
  }

  async findInactiveUsers(daysInactive: number = 30): Promise<IUser[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    return this.find({
      $or: [
        { lastLoginAt: { $lt: cutoffDate } },
        { lastLoginAt: { $exists: false }, createdAt: { $lt: cutoffDate } }
      ],
      status: UserStatus.ACTIVE
    });
  }

  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.updateById(userId, { 
      lastLoginAt: new Date() 
    });
  }

  async verifyEmail(userId: string): Promise<IUser | null> {
    return this.updateById(userId, {
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE
    });
  }

  async suspendUser(userId: string, suspendedBy: string): Promise<IUser | null> {
    return this.updateById(userId, {
      status: UserStatus.SUSPENDED,
      updatedBy: suspendedBy
    });
  }

  async activateUser(userId: string, activatedBy: string): Promise<IUser | null> {
    return this.updateById(userId, {
      status: UserStatus.ACTIVE,
      updatedBy: activatedBy
    });
  }

  async deactivateUser(userId: string, deactivatedBy: string): Promise<IUser | null> {
    return this.updateById(userId, {
      status: UserStatus.INACTIVE,
      updatedBy: deactivatedBy
    });
  }

  async changeUserRole(userId: string, newRole: UserRole, changedBy: string): Promise<IUser | null> {
    return this.updateById(userId, {
      role: newRole,
      updatedBy: changedBy
    });
  }

  async findUsersWithRefreshToken(refreshToken: string): Promise<IUser[]> {
    return this.find({ refreshTokens: refreshToken });
  }

  async removeRefreshTokenFromAllUsers(refreshToken: string): Promise<{ matchedCount: number; modifiedCount: number }> {
    return this.updateMany(
      { refreshTokens: refreshToken },
      { $pull: { refreshTokens: refreshToken } }
    );
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    verified: number;
    unverified: number;
    byRole: { [key in UserRole]: number };
  }> {
    try {
      const pipeline = [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', UserStatus.ACTIVE] }, 1, 0] }
            },
            inactive: {
              $sum: { $cond: [{ $eq: ['$status', UserStatus.INACTIVE] }, 1, 0] }
            },
            suspended: {
              $sum: { $cond: [{ $eq: ['$status', UserStatus.SUSPENDED] }, 1, 0] }
            },
            verified: {
              $sum: { $cond: [{ $ne: ['$emailVerifiedAt', null] }, 1, 0] }
            },
            unverified: {
              $sum: { $cond: [{ $eq: ['$emailVerifiedAt', null] }, 1, 0] }
            },
            adminCount: {
              $sum: { $cond: [{ $eq: ['$role', UserRole.ADMIN] }, 1, 0] }
            },
            userCount: {
              $sum: { $cond: [{ $eq: ['$role', UserRole.USER] }, 1, 0] }
            },
            moderatorCount: {
              $sum: { $cond: [{ $eq: ['$role', UserRole.MODERATOR] }, 1, 0] }
            }
          }
        }
      ];

      const result = await this.aggregate(pipeline);
      const stats = result[0] || {};

      return {
        total: stats.total || 0,
        active: stats.active || 0,
        inactive: stats.inactive || 0,
        suspended: stats.suspended || 0,
        verified: stats.verified || 0,
        unverified: stats.unverified || 0,
        byRole: {
          [UserRole.ADMIN]: stats.adminCount || 0,
          [UserRole.USER]: stats.userCount || 0,
          [UserRole.MODERATOR]: stats.moderatorCount || 0
        }
      };
    } catch (error) {
      throw this.handleError(error, 'getUserStats');
    }
  }

  async findRecentUsers(days: number = 7): Promise<IUser[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.find(
      { createdAt: { $gte: cutoffDate } },
      { sort: { createdAt: -1 } }
    );
  }

  async bulkUpdateUserStatus(userIds: string[], status: UserStatus, updatedBy: string): Promise<{ matchedCount: number; modifiedCount: number }> {
    return this.updateMany(
      { _id: { $in: userIds } },
      { 
        status,
        updatedBy,
        updatedAt: new Date()
      }
    );
  }

  async findUsersForCleanup(daysInactive: number = 90): Promise<IUser[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    return this.find({
      status: UserStatus.INACTIVE,
      $or: [
        { lastLoginAt: { $lt: cutoffDate } },
        { lastLoginAt: { $exists: false }, createdAt: { $lt: cutoffDate } }
      ]
    });
  }
}