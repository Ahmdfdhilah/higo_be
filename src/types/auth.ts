import { UserRole } from '../models/enums';
import { UserResponseDto } from './user';

// Authentication request DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// Authentication response DTOs
export interface AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayloadDto {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface VerifyTokenResponseDto {
  userId: string;
  role: UserRole;
}

// Profile management DTOs
export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}