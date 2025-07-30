import { Document, Model, FilterQuery, UpdateQuery, QueryOptions, PipelineStage } from 'mongoose';
import { PaginationParams, PaginatedResponse } from '../types/base';

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw this.handleError(error, 'create');
    }
  }

  async findById(id: string, populate?: string | string[]): Promise<T | null> {
    try {
      let query = this.model.findById(id);
      if (populate) {
        query = query.populate(populate);
      }
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'findById');
    }
  }

  async findOne(filter: FilterQuery<T>, populate?: string | string[]): Promise<T | null> {
    try {
      let query = this.model.findOne(filter);
      if (populate) {
        query = query.populate(populate);
      }
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'findOne');
    }
  }

  async find(
    filter: FilterQuery<T> = {},
    options: QueryOptions = {},
    populate?: string | string[]
  ): Promise<T[]> {
    try {
      let query = this.model.find(filter, null, options);
      if (populate) {
        query = query.populate(populate);
      }
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'find');
    }
  }

  async findWithPagination(
    filter: FilterQuery<T>,
    pagination: PaginationParams,
    populate?: string | string[],
    sort?: any
  ): Promise<PaginatedResponse<T>> {
    try {
      const { page = 1, size = 10, search } = pagination;
      const skip = (page - 1) * size;

      // Add search functionality if search term provided
      if (search && this.getSearchFields().length > 0) {
        const searchRegex = new RegExp(search, 'i');
        const searchConditions = this.getSearchFields().map(field => ({
          [field]: { $regex: searchRegex }
        }));
        filter = { ...filter, $or: searchConditions };
      }

      // Apply default sort if not provided
      const defaultSort = sort || this.getDefaultSort();

      let query = this.model.find(filter).skip(skip).limit(size);
      
      if (defaultSort) {
        query = query.sort(defaultSort);
      }
      
      if (populate) {
        query = query.populate(populate);
      }

      const [items, total] = await Promise.all([
        query.exec(),
        this.model.countDocuments(filter)
      ]);

      return {
        items,
        total,
        page,
        size,
        pages: Math.ceil(total / size)
      };
    } catch (error) {
      throw this.handleError(error, 'findWithPagination');
    }
  }

  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options: QueryOptions = { new: true, runValidators: true }
  ): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(id, update, options).exec();
    } catch (error) {
      throw this.handleError(error, 'updateById');
    }
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions = { new: true, runValidators: true }
  ): Promise<T | null> {
    try {
      return await this.model.findOneAndUpdate(filter, update, options).exec();
    } catch (error) {
      throw this.handleError(error, 'updateOne');
    }
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: any = { runValidators: true }
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    try {
      const result = await this.model.updateMany(filter, update, options).exec();
      return {
        matchedCount: result.matchedCount || 0,
        modifiedCount: result.modifiedCount || 0
      };
    } catch (error) {
      throw this.handleError(error, 'updateMany');
    }
  }

  async deleteById(id: string): Promise<T | null> {
    try {
      return await this.model.findByIdAndDelete(id).exec();
    } catch (error) {
      throw this.handleError(error, 'deleteById');
    }
  }

  async deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    try {
      return await this.model.findOneAndDelete(filter).exec();
    } catch (error) {
      throw this.handleError(error, 'deleteOne');
    }
  }

  async deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }> {
    try {
      const result = await this.model.deleteMany(filter).exec();
      return { deletedCount: result.deletedCount || 0 };
    } catch (error) {
      throw this.handleError(error, 'deleteMany');
    }
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter).exec();
    } catch (error) {
      throw this.handleError(error, 'count');
    }
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const result = await this.model.exists(filter).exec();
      return result !== null;
    } catch (error) {
      throw this.handleError(error, 'exists');
    }
  }

  async aggregate(pipeline: PipelineStage[]): Promise<any[]> {
    try {
      return await this.model.aggregate(pipeline).exec();
    } catch (error) {
      throw this.handleError(error, 'aggregate');
    }
  }

  async bulkWrite(operations: any[]): Promise<any> {
    try {
      return await this.model.bulkWrite(operations);
    } catch (error) {
      throw this.handleError(error, 'bulkWrite');
    }
  }

  protected getSearchFields(): string[] {
    return [];
  }

  protected getDefaultSort(): any {
    return null;
  }

  protected handleError(error: any, operation: string): Error {
    console.error(`Repository error in ${this.model.modelName}.${operation}:`, error);
    
    if (error.name === 'ValidationError') {
      return new Error(`Validation failed: ${error.message}`);
    }
    
    if (error.name === 'CastError') {
      return new Error(`Invalid ID format: ${error.value}`);
    }
    
    if (error.code === 11000) {
      // Safe handling of duplicate key error
      let field = 'unknown';
      if (error.keyPattern && typeof error.keyPattern === 'object') {
        const keys = Object.keys(error.keyPattern);
        if (keys.length > 0 && keys[0]) {
          field = keys[0];
        }
      }
      return new Error(`Duplicate value for field: ${field}`);
    }
    
    // Safe handling of error message
    const message = error?.message || 'Unknown database error';
    return new Error(`Database operation failed: ${message}`);
  }

  async startTransaction(): Promise<any> {
    const session = await this.model.db.startSession();
    session.startTransaction();
    return session;
  }

  async commitTransaction(session: any): Promise<void> {
    await session.commitTransaction();
    session.endSession();
  }

  async abortTransaction(session: any): Promise<void> {
    await session.abortTransaction();
    session.endSession();
  }
}