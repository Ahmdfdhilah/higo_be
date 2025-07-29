import { Schema, Document, Types } from 'mongoose';

export interface IBaseModel extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

export const baseSchema = {
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
};

export class BaseModelClass<T extends IBaseModel> {
  protected model: any;

  constructor(model: any) {
    this.model = model;
  }

  async findById(id: string | Types.ObjectId): Promise<T | null> {
    return await this.model.findById(id).exec();
  }

  async findOne(filter: any): Promise<T | null> {
    return await this.model.findOne(filter).exec();
  }

  async find(filter: any = {}, options: any = {}): Promise<T[]> {
    return await this.model.find(filter, null, options).exec();
  }

  async create(data: Partial<T>): Promise<T> {
    const document = new this.model(data);
    return await document.save();
  }

  async updateById(id: string | Types.ObjectId, update: Partial<T>): Promise<T | null> {
    return await this.model.findByIdAndUpdate(
      id,
      { ...update, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).exec();
  }

  async deleteById(id: string | Types.ObjectId): Promise<T | null> {
    return await this.model.findByIdAndDelete(id).exec();
  }

  async count(filter: any = {}): Promise<number> {
    return await this.model.countDocuments(filter).exec();
  }

  async paginate(
    filter: any = {},
    page: number = 1,
    limit: number = 10,
    sort: any = { createdAt: -1 }
  ): Promise<{ items: T[]; total: number; page: number; pages: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec()
    ]);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }
}