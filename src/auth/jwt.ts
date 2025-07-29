import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../core/config';
import { redisClient } from '../core/redis';
import { User, IUser } from '../models/user';
import { ApiResponse, AuthTokens } from '../schemas/base';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export class JWTService {
  private static blacklistKeyPrefix = 'jwt_blacklist:';
  private static refreshTokenPrefix = 'refresh_token:';

  public static generateAccessToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    } as jwt.SignOptions);
  }

  public static generateRefreshToken(): string {
    return jwt.sign({}, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiresIn
    } as jwt.SignOptions);
  }

  public static async generateTokenPair(user: IUser): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();

    await user.addRefreshToken(refreshToken);
    
    try {
      await redisClient.set(
        `${this.refreshTokenPrefix}${refreshToken}`,
        user._id.toString(),
        30 * 24 * 60 * 60 // 30 days in seconds
      );
    } catch (error) {
      console.error('Error storing refresh token in Redis:', error);
    }

    return { accessToken, refreshToken };
  }

  public static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  public static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  public static async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisClient.set(
            `${this.blacklistKeyPrefix}${token}`,
            'blacklisted',
            ttl
          );
        }
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  public static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(`${this.blacklistKeyPrefix}${token}`);
      return result === 1;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  public static async invalidateRefreshToken(refreshToken: string): Promise<void> {
    try {
      await redisClient.del(`${this.refreshTokenPrefix}${refreshToken}`);
    } catch (error) {
      console.error('Error invalidating refresh token:', error);
    }
  }

  public static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      this.verifyRefreshToken(refreshToken);
      
      const userId = await redisClient.get(`${this.refreshTokenPrefix}${refreshToken}`);
      if (!userId) {
        throw new Error('Refresh token not found or expired');
      }

      const user = await User.findById(userId);
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        throw new Error('Invalid refresh token');
      }

      await user.removeRefreshToken(refreshToken);
      await this.invalidateRefreshToken(refreshToken);

      return await this.generateTokenPair(user);
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  }
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      } as ApiResponse);
      return;
    }

    if (await JWTService.isTokenBlacklisted(token)) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      } as ApiResponse);
      return;
    }

    const decoded = JWTService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      } as ApiResponse);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    } as ApiResponse);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      } as ApiResponse);
      return;
    }

    next();
  };
};