// Base API Response Types
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

export interface ErrorResponse {
  success: false;
  message: string;
  data: null;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Pagination Types
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

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QueryParams extends PaginationParams, SortParams {
  filters?: Record<string, any>;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

// Generic CRUD Response Types
export interface CreateResponse<T> extends ApiResponse<T> {
  data: T;
}

export interface UpdateResponse<T> extends ApiResponse<T | null> {
  data: T | null;
}

export interface DeleteResponse<T> extends ApiResponse<T | null> {
  data: T | null;
}

export interface BulkResponse {
  matchedCount: number;
  modifiedCount: number;
}

export interface BulkDeleteResponse {
  deletedCount: number;
}