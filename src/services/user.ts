import bcrypt from 'bcryptjs';
import { BaseService } from './base';
import { UserRepository } from '../repositories/user';
import { IUser, User } from '../models/user';
import { UserStatus, UserRole } from '../models/enums';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../schemas/base';
import { JWTService } from '../auth/jwt';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  ChangePasswordDto, 
  UserResponseDto, 
  UserStatsDto,
  UserQueryDto 
} from '../schemas/user';
import { 
  LoginDto, 
  AuthResponseDto, 
  TokenResponseDto 
} from '../schemas/auth';

export class UserService extends BaseService<IUser> {
  private jwtService: JWTService;

  constructor() {
    super(new UserRepository());
    this.jwtService = new JWTService();
  }

  // Helper method to convert IUser model to UserResponseDto
  private toUserResponseDto(user: IUser): UserResponseDto {
    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy
    };
  }

  // Get user by ID with DTO conversion
  async getUserById(id: string, useCache: boolean = true): Promise<ApiResponse<UserResponseDto | null>> {
    try {
      const result = await super.findById(id, useCache);
      
      if (result.success && result.data) {
        return {
          ...result,
          data: this.toUserResponseDto(result.data as IUser)
        };
      }
      
      return {
        success: result.success,
        message: result.message,
        data: null
      };
    } catch (error) {
      return this.handleError<UserResponseDto | null>(error, 'getUserById');
    }
  }

  async register(userData: CreateUserDto, createdBy?: string): Promise<ApiResponse<UserResponseDto>> {
    try {
      // Check if user already exists
      const existingUser = await (this.repository as UserRepository).findByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        } as ApiResponse<UserResponseDto>;
      }

      // Validate password strength
      if (!this.isPasswordStrong(userData.password)) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        } as ApiResponse<UserResponseDto>;
      }

      const user = await this.repository.create({
        ...userData,
        status: UserStatus.ACTIVE,
        createdBy: createdBy ? createdBy as any : undefined
      });

      await this.afterCreate(user);

      return {
        success: true,
        message: 'User registered successfully',
        data: this.toUserResponseDto(user)
      };
    } catch (error) {
      return this.handleError<UserResponseDto>(error, 'register');
    }
  }

  async login(loginData: LoginDto): Promise<ApiResponse<AuthResponseDto>> {
    try {
      const user = await (this.repository as UserRepository).findByEmailWithPassword(loginData.email);
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        } as ApiResponse<AuthResponseDto>;
      }

      if (user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          message: 'Account is not active'
        } as ApiResponse<AuthResponseDto>;
      }

      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        } as ApiResponse<AuthResponseDto>;
      }

      // Update last login
      await (this.repository as UserRepository).updateLastLogin(user._id.toString());

      // Generate tokens
      const accessToken = this.jwtService.generateAccessToken(user._id.toString(), user.role);
      const refreshToken = user.generateRefreshToken();
      
      // Store refresh token
      await user.addRefreshToken(refreshToken);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: this.toUserResponseDto(user),
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      return this.handleError<AuthResponseDto>(error, 'login');
    }
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<TokenResponseDto>> {
    try {
      const users = await (this.repository as UserRepository).findUsersWithRefreshToken(refreshToken);
      const user = users[0];

      if (!user || user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          message: 'Invalid refresh token'
        } as ApiResponse<TokenResponseDto>;
      }

      // Remove old refresh token
      await user.removeRefreshToken(refreshToken);

      // Generate new tokens
      const newAccessToken = this.jwtService.generateAccessToken(user._id.toString(), user.role);
      const newRefreshToken = user.generateRefreshToken();

      // Store new refresh token
      await user.addRefreshToken(newRefreshToken);

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      return this.handleError<TokenResponseDto>(error, 'refreshToken');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<ApiResponse<null>> {
    try {
      const user = await this.repository.findById(userId);
      if (user) {
        await (user as IUser).removeRefreshToken(refreshToken);
      }

      return {
        success: true,
        message: 'Logout successful',
        data: null
      };
    } catch (error) {
      return this.handleError(error, 'logout');
    }
  }

  async logoutAllDevices(userId: string): Promise<ApiResponse<null>> {
    try {
      const user = await this.repository.findById(userId);
      if (user) {
        await (user as IUser).clearAllRefreshTokens();
      }

      return {
        success: true,
        message: 'Logged out from all devices',
        data: null
      };
    } catch (error) {
      return this.handleError(error, 'logoutAllDevices');
    }
  }

  async updateProfile(userId: string, updateData: UpdateUserDto): Promise<ApiResponse<UserResponseDto | null>> {
    try {
      // If email is being updated, check for duplicates
      if (updateData.email) {
        const existingUser = await (this.repository as UserRepository).findByEmail(updateData.email);
        if (existingUser && existingUser._id.toString() !== userId) {
          return {
            success: false,
            message: 'Email is already in use',
            data: null
          };
        }
      }

      const user = await this.repository.updateById(userId, updateData);

      if (user) {
        await this.invalidateCache();
      }

      return {
        success: true,
        message: user ? 'Profile updated successfully' : 'User not found',
        data: user ? this.toUserResponseDto(user) : null
      };
    } catch (error) {
      return this.handleError(error, 'updateProfile');
    }
  }

  async changePassword(userId: string, passwordData: ChangePasswordDto): Promise<ApiResponse<null>> {
    try {
      const userDoc = await User.findById(userId).select('+password').exec();
      
      if (!userDoc) {
        return {
          success: false,
          message: 'User not found',
          data: null
        };
      }

      const isCurrentPasswordValid = await userDoc.comparePassword(passwordData.currentPassword);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
          data: null
        };
      }

      if (!this.isPasswordStrong(passwordData.newPassword)) {
        return {
          success: false,
          message: 'New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
          data: null
        };
      }

      await this.repository.updateById(userId, { password: passwordData.newPassword });

      // Clear all refresh tokens to force re-login
      await userDoc.clearAllRefreshTokens();

      return {
        success: true,
        message: 'Password changed successfully',
        data: null
      };
    } catch (error) {
      return this.handleError(error, 'changePassword');
    }
  }

  async getUsersByRole(role: UserRole, pagination?: PaginationParams): Promise<ApiResponse<PaginatedResponse<UserResponseDto> | UserResponseDto[]>> {
    try {
      const users = await (this.repository as UserRepository).findUsersByRole(role, pagination);
      
      // Convert based on whether it's paginated or not
      let data: PaginatedResponse<UserResponseDto> | UserResponseDto[];
      
      if (Array.isArray(users)) {
        data = users.map(user => this.toUserResponseDto(user));
      } else {
        data = {
          ...users,
          items: users.items.map(user => this.toUserResponseDto(user))
        };
      }
      
      return {
        success: true,
        message: 'Users retrieved successfully',
        data
      };
    } catch (error) {
      return this.handleError<PaginatedResponse<UserResponseDto> | UserResponseDto[]>(error, 'getUsersByRole');
    }
  }

  async getActiveUsers(pagination?: PaginationParams): Promise<ApiResponse<PaginatedResponse<UserResponseDto> | UserResponseDto[]>> {
    try {
      const users = await (this.repository as UserRepository).findActiveUsers(pagination);
      
      // Convert based on whether it's paginated or not
      let data: PaginatedResponse<UserResponseDto> | UserResponseDto[];
      
      if (Array.isArray(users)) {
        data = users.map(user => this.toUserResponseDto(user));
      } else {
        data = {
          ...users,
          items: users.items.map(user => this.toUserResponseDto(user))
        };
      }
      
      return {
        success: true,
        message: 'Active users retrieved successfully',
        data
      };
    } catch (error) {
      return this.handleError<PaginatedResponse<UserResponseDto> | UserResponseDto[]>(error, 'getActiveUsers');
    }
  }

  async suspendUser(userId: string, suspendedBy: string): Promise<ApiResponse<UserResponseDto | null>> {
    try {
      const user = await (this.repository as UserRepository).suspendUser(userId, suspendedBy);
      
      if (user) {
        // Clear all refresh tokens
        await (user as IUser).clearAllRefreshTokens();
        await this.invalidateCache();
      }

      return {
        success: true,
        message: user ? 'User suspended successfully' : 'User not found',
        data: user ? this.toUserResponseDto(user) : null
      };
    } catch (error) {
      return this.handleError(error, 'suspendUser');
    }
  }

  async activateUser(userId: string, activatedBy: string): Promise<ApiResponse<UserResponseDto | null>> {
    try {
      const user = await (this.repository as UserRepository).activateUser(userId, activatedBy);
      
      if (user) {
        await this.invalidateCache();
      }

      return {
        success: true,
        message: user ? 'User activated successfully' : 'User not found',
        data: user ? this.toUserResponseDto(user) : null
      };
    } catch (error) {
      return this.handleError(error, 'activateUser');
    }
  }

  async changeUserRole(userId: string, newRole: UserRole, changedBy: string): Promise<ApiResponse<UserResponseDto | null>> {
    try {
      const user = await (this.repository as UserRepository).changeUserRole(userId, newRole, changedBy);
      
      if (user) {
        // Clear all refresh tokens to force re-login with new role
        await (user as IUser).clearAllRefreshTokens();
        await this.invalidateCache();
      }

      return {
        success: true,
        message: user ? 'User role changed successfully' : 'User not found',
        data: user ? this.toUserResponseDto(user) : null
      };
    } catch (error) {
      return this.handleError(error, 'changeUserRole');
    }
  }

  async getUserStats(): Promise<ApiResponse<UserStatsDto>> {
    try {
      const stats = await (this.repository as UserRepository).getUserStats();
      
      return {
        success: true,
        message: 'User statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return this.handleError<UserStatsDto>(error, 'getUserStats');
    }
  }

  async getInactiveUsers(daysInactive: number = 30): Promise<ApiResponse<UserResponseDto[]>> {
    try {
      const users = await (this.repository as UserRepository).findInactiveUsers(daysInactive);
      
      return {
        success: true,
        message: 'Inactive users retrieved successfully',
        data: users.map(user => this.toUserResponseDto(user))
      };
    } catch (error) {
      return this.handleError<UserResponseDto[]>(error, 'getInactiveUsers');
    }
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  protected async validateBusinessRules(data: Partial<IUser>, operation: 'create' | 'update' = 'create'): Promise<void> {
    if (operation === 'create') {
      if (!data.email || !data.password || !data.firstName || !data.lastName) {
        throw new Error('Missing required fields');
      }

      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected async afterCreate(user: IUser): Promise<void> {
    // Send welcome email, create user profile, etc.
    console.log(`New user created: ${user.email}`);
  }
}