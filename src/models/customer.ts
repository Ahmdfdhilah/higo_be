import mongoose, { Schema, Document } from 'mongoose';
import { IBaseModel, baseSchema } from './base';
import { Gender, DeviceBrand, DigitalInterest, LocationType } from './enums';

export interface ICustomer extends IBaseModel {
  number: number;
  locationName: string;
  date: Date;
  loginHour: string;
  userName: string;
  birthYear: number; // Birth year from original data
  gender: Gender;
  email: string;
  phoneNumber: string;
  deviceBrand: DeviceBrand;
  digitalInterest: DigitalInterest;
  locationType: LocationType;
  
  // Additional computed fields for better querying
  actualAge?: number; // Computed from birth year
  loginDateTime?: Date; // Computed from date + loginHour
}

const customerSchema = new Schema<ICustomer>({
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
    ref: 'User'
  },
  
  number: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  
  locationName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  loginHour: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  
  userName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  birthYear: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear()
  },
  
  gender: {
    type: String,
    enum: Object.values(Gender),
    required: true,
    index: true
  },
  
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    index: true
  },
  
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  
  deviceBrand: {
    type: String,
    enum: Object.values(DeviceBrand),
    required: true,
    index: true
  },
  
  digitalInterest: {
    type: String,
    enum: Object.values(DigitalInterest),
    required: true,
    index: true
  },
  
  locationType: {
    type: String,
    enum: Object.values(LocationType),
    required: true,
    index: true
  },
  
  // Computed fields
  actualAge: {
    type: Number,
    index: true
  },
  
  loginDateTime: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'customers'
});

// Compound indexes for common query patterns
customerSchema.index({ date: 1, locationType: 1 });
customerSchema.index({ gender: 1, deviceBrand: 1 });
customerSchema.index({ digitalInterest: 1, actualAge: 1 });
customerSchema.index({ locationName: 1, date: 1 });
customerSchema.index({ loginDateTime: 1 });

// Text index for search functionality
customerSchema.index({
  locationName: 'text',
  userName: 'text',
  email: 'text'
});

// Pre-save middleware to compute derived fields
customerSchema.pre('save', function(next) {
  // Calculate actual age from birth year
  this.actualAge = new Date().getFullYear() - this.birthYear;
  
  // Combine date and loginHour into single DateTime
  const timeParts = this.loginHour.split(':');
  const hours = parseInt(timeParts[0] || '0', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);
  this.loginDateTime = new Date(this.date);
  this.loginDateTime.setHours(hours, minutes, 0, 0);
  
  next();
});

// Static methods for common queries
customerSchema.statics = {
  
  // Find customers by date range with aggregation
  async findByDateRange(startDate: Date, endDate: Date, options: any = {}) {
    const pipeline: any[] = [
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      }
    ];
    
    if (options.groupBy) {
      pipeline.push({
        $group: {
          _id: `$${options.groupBy}`,
          count: { $sum: 1 },
          avgAge: { $avg: '$actualAge' }
        }
      });
    }
    
    return this.aggregate(pipeline);
  },
  
  // Get activity statistics
  async getStatistics() {
    return this.aggregate([
      {
        $group: {
          _id: null,
          totalActivities: { $sum: 1 },
          uniqueUsers: { $addToSet: '$email' },
          uniqueLocations: { $addToSet: '$locationName' },
          avgAge: { $avg: '$actualAge' },
          genderDistribution: {
            $push: '$gender'
          },
          deviceDistribution: {
            $push: '$deviceBrand'
          },
          interestDistribution: {
            $push: '$digitalInterest'
          }
        }
      },
      {
        $project: {
          totalActivities: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueLocations: { $size: '$uniqueLocations' },
          avgAge: { $round: ['$avgAge', 1] },
          genderDistribution: 1,
          deviceDistribution: 1,
          interestDistribution: 1
        }
      }
    ]);
  }
};

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);