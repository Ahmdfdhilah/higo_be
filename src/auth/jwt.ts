import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../core/config';
import { redisClient } from '../core/redis';
import { User, IUser } from '../models/user';
import { ApiResponse } from '../types/base';
import { TokenResponseDto } from '../types/auth';

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

  public generateAccessToken(userId: string, role: string): string {
    const payload: JwtPayload = {
      userId,
      email: '', // Will be populated when needed
      role
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    } as jwt.SignOptions);
  }

  public generateRefreshToken(): string {
    return jwt.sign({}, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiresIn
    } as jwt.SignOptions);
  }

  public async generateTokenPair(user: IUser): Promise<TokenResponseDto> {
    const accessToken = this.generateAccessToken(user._id.toString(), user.role);
    const refreshToken = this.generateRefreshToken();

    await user.addRefreshToken(refreshToken);
    
    try {
      await redisClient.set(
        `${JWTService.refreshTokenPrefix}${refreshToken}`,
        user._id.toString(),
        30 * 24 * 60 * 60 // 30 days in seconds
      );
    } catch (error) {
      console.error('Error storing refresh token in Redis:', error);
    }

    return { accessToken, refreshToken };
  }

  public static setSecureCookies(res: Response, tokens: TokenResponseDto): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set access token as HttpOnly, Secure cookie (30 minutes)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true, // Tidak bisa diakses JavaScript
      secure: isProduction, // HTTPS di production
      sameSite: 'strict', // CSRF protection
      maxAge: 30 * 60 * 1000, // 30 minutes in milliseconds
      path: '/'
    });

    // Set refresh token as HttpOnly, Secure cookie (30 days)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      path: '/'
    });
  }

  public static clearSecureCookies(res: Response): void {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
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

  public static async refreshAccessToken(refreshToken: string): Promise<TokenResponseDto> {
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
      await JWTService.invalidateRefreshToken(refreshToken);

      const jwtService = new JWTService();
      return await jwtService.generateTokenPair(user);
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
    // Check for token in cookies first (HttpOnly), then Authorization header
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.split(' ')[1];
    }

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

// Export the main auth middleware
export const authMiddleware = authenticateToken;