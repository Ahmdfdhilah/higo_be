import { Document } from 'mongoose';
import { BaseRepository } from '../repositories/base';
import { PaginationParams, PaginatedResponse, ApiResponse } from '../schemas/base';
import { CacheService } from '../utils/cache';

export abstract class BaseService<T extends Document> {
  protected repository: BaseRepository<T>;
  protected cacheTTL: number = 300; // 5 minutes default

  constructor(repository: BaseRepository<T>) {
    this.repository = repository;
  }

  async create(data: Partial<T>, createdBy?: string): Promise<ApiResponse<T>> {
    try {
      if (createdBy) {
        (data as any).createdBy = createdBy;
      }

      const item = await this.repository.create(data);
      
      // Invalidate related cache entries
      await this.invalidateCache();
      
      return {
        success: true,
        message: 'Item created successfully',
        data: item
      };
    } catch (error) {
      return this.handleError(error, 'create');
    }
  }

  async findById(id: string, useCache: boolean = true): Promise<ApiResponse<T | null>> {
    try {
      const cacheKey = this.getCacheKey('findById', id);
      
      if (useCache) {
        const cached = await CacheService.get<T>(cacheKey);
        if (cached) {
          return {
            success: true,
            message: 'Item retrieved successfully',
            data: cached
          };
        }
      }

      const item = await this.repository.findById(id);
      
      if (item && useCache) {
        await CacheService.set(cacheKey, item, this.cacheTTL);
      }

      return {
        success: true,
        message: item ? 'Item retrieved successfully' : 'Item not found',
        data: item
      };
    } catch (error) {
      return this.handleError(error, 'findById');
    }
  }

  async findAll(
    filter: any = {},
    pagination?: PaginationParams,
    useCache: boolean = true
  ): Promise<ApiResponse<PaginatedResponse<T> | T[]>> {
    try {
      const cacheKey = this.getCacheKey('findAll', JSON.stringify(filter), JSON.stringify(pagination));
      
      if (useCache) {
        const cached = await CacheService.get<PaginatedResponse<T> | T[]>(cacheKey);
        if (cached) {
          return {
            success: true,
            message: 'Items retrieved successfully',
            data: cached
          };
        }
      }

      let items: PaginatedResponse<T> | T[];
      
      if (pagination) {
        items = await this.repository.findWithPagination(filter, pagination);
      } else {
        items = await this.repository.find(filter);
      }

      if (useCache) {
        await CacheService.set(cacheKey, items, this.cacheTTL);
      }

      return {
        success: true,
        message: 'Items retrieved successfully',
        data: items
      };
    } catch (error) {
      return this.handleError(error, 'findAll');
    }
  }

  async update(
    id: string,
    data: Partial<T>,
    updatedBy?: string
  ): Promise<ApiResponse<T | null>> {
    try {
      if (updatedBy) {
        (data as any).updatedBy = updatedBy;
      }

      const item = await this.repository.updateById(id, data);
      
      // Invalidate cache
      await this.invalidateCache();
      await CacheService.del(this.getCacheKey('findById', id));

      return {
        success: true,
        message: item ? 'Item updated successfully' : 'Item not found',
        data: item
      };
    } catch (error) {
      return this.handleError(error, 'update');
    }
  }

  async delete(id: string): Promise<ApiResponse<T | null>> {
    try {
      const item = await this.repository.deleteById(id);
      
      // Invalidate cache
      await this.invalidateCache();
      await CacheService.del(this.getCacheKey('findById', id));

      return {
        success: true,
        message: item ? 'Item deleted successfully' : 'Item not found',
        data: item
      };
    } catch (error) {
      return this.handleError(error, 'delete');
    }
  }

  async count(filter: any = {}): Promise<ApiResponse<number>> {
    try {
      const cacheKey = this.getCacheKey('count', JSON.stringify(filter));
      
      const cached = await CacheService.get<number>(cacheKey);
      if (cached !== null) {
        return {
          success: true,
          message: 'Count retrieved successfully',
          data: cached
        };
      }

      const count = await this.repository.count(filter);
      
      await CacheService.set(cacheKey, count, this.cacheTTL);

      return {
        success: true,
        message: 'Count retrieved successfully',
        data: count
      };
    } catch (error) {
      return this.handleError(error, 'count');
    }
  }

  async exists(filter: any): Promise<ApiResponse<boolean>> {
    try {
      const exists = await this.repository.exists(filter);
      
      return {
        success: true,
        message: 'Existence check completed',
        data: exists
      };
    } catch (error) {
      return this.handleError(error, 'exists');
    }
  }

  async bulkCreate(items: Partial<T>[], createdBy?: string): Promise<ApiResponse<T[]>> {
    try {
      const operations = items.map(item => ({
        insertOne: {
          document: {
            ...item,
            ...(createdBy && { createdBy }),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      }));

      await this.repository.bulkWrite(operations);
      
      // Invalidate cache
      await this.invalidateCache();

      return {
        success: true,
        message: `${items.length} items created successfully`,
        data: [] // BulkWrite doesn't return the created documents
      };
    } catch (error) {
      return this.handleError(error, 'bulkCreate');
    }
  }

  async bulkUpdate(
    filter: any,
    data: Partial<T>,
    updatedBy?: string
  ): Promise<ApiResponse<{ matchedCount: number; modifiedCount: number }>> {
    try {
      if (updatedBy) {
        (data as any).updatedBy = updatedBy;
      }

      const result = await this.repository.updateMany(filter, data);
      
      // Invalidate cache
      await this.invalidateCache();

      return {
        success: true,
        message: `${result.modifiedCount} items updated successfully`,
        data: result
      };
    } catch (error) {
      return this.handleError(error, 'bulkUpdate');
    }
  }

  async bulkDelete(filter: any): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const result = await this.repository.deleteMany(filter);
      
      // Invalidate cache
      await this.invalidateCache();

      return {
        success: true,
        message: `${result.deletedCount} items deleted successfully`,
        data: result
      };
    } catch (error) {
      return this.handleError(error, 'bulkDelete');
    }
  }

  protected getCacheKey(...parts: string[]): string {
    const serviceName = this.constructor.name.toLowerCase();
    return `${serviceName}:${parts.join(':')}`;
  }

  protected async invalidateCache(pattern?: string): Promise<void> {
    const serviceName = this.constructor.name.toLowerCase();
    const cachePattern = pattern || `${serviceName}:*`;
    await CacheService.invalidatePattern(cachePattern);
  }

  protected handleError<R = any>(error: any, operation: string): ApiResponse<R> {
    console.error(`Service error in ${this.constructor.name}.${operation}:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error.message) {
      if (error.message.includes('Validation failed')) {
        message = error.message;
      } else if (error.message.includes('Duplicate value')) {
        message = error.message;
      } else if (error.message.includes('Invalid ID format')) {
        message = 'Invalid ID provided';
      } else {
        message = 'Operation failed';
      }
    }

    return {
      success: false,
      message
    } as ApiResponse<R>;
  }

  protected async validateBusinessRules(data: Partial<T>, operation: 'create' | 'update' = 'create'): Promise<void> {
    // Override in child services for custom validation
  }

  protected async beforeCreate(data: Partial<T>): Promise<Partial<T>> {
    await this.validateBusinessRules(data, 'create');
    return data;
  }

  protected async afterCreate(item: T): Promise<void> {
    // Override in child services for post-creation logic
  }

  protected async beforeUpdate(id: string, data: Partial<T>): Promise<Partial<T>> {
    await this.validateBusinessRules(data, 'update');
    return data;
  }

  protected async afterUpdate(item: T): Promise<void> {
    // Override in child services for post-update logic
  }

  protected async beforeDelete(id: string): Promise<void> {
    // Override in child services for pre-deletion logic
  }

  protected async afterDelete(item: T): Promise<void> {
    // Override in child services for post-deletion logic
  }
}