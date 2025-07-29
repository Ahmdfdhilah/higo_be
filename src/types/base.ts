// Base types for API responses and common interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface StatusResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Common filter interface
export interface BaseFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Base database model interface
export interface IBaseModel {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}