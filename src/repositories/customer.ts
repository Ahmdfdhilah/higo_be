import { BaseRepository } from './base';
import { ICustomer, Customer } from '../models/customer';
import { Gender, DeviceBrand, LocationType } from '../models/enums';
import { PaginationParams, PaginatedResponse } from '../types/base';

export class CustomerRepository extends BaseRepository<ICustomer> {
  constructor() {
    super(Customer);
  }

  protected getSearchFields(): string[] {
    return ['locationName', 'userName', 'email'];
  }

  // Filter by gender
  async findByGender(gender: Gender, pagination?: PaginationParams): Promise<PaginatedResponse<ICustomer> | ICustomer[]> {
    const filter = { gender };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }
    
    return this.find(filter);
  }

  // Filter by device brand
  async findByDeviceBrand(deviceBrand: DeviceBrand, pagination?: PaginationParams): Promise<PaginatedResponse<ICustomer> | ICustomer[]> {
    const filter = { deviceBrand };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }
    
    return this.find(filter);
  }

  // Filter by location type
  async findByLocationType(locationType: LocationType, pagination?: PaginationParams): Promise<PaginatedResponse<ICustomer> | ICustomer[]> {
    const filter = { locationType };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }
    
    return this.find(filter);
  }

  // Filter by age range
  async findByAgeRange(minAge: number, maxAge: number, pagination?: PaginationParams): Promise<PaginatedResponse<ICustomer> | ICustomer[]> {
    const currentYear = new Date().getFullYear();
    const maxBirthYear = currentYear - minAge;
    const minBirthYear = currentYear - maxAge;
    
    const filter = { 
      birthYear: { $gte: minBirthYear, $lte: maxBirthYear }
    };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }
    
    return this.find(filter);
  }

  // Filter by date range
  async findByDateRange(startDate: Date, endDate: Date, pagination?: PaginationParams): Promise<PaginatedResponse<ICustomer> | ICustomer[]> {
    const filter = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }
    
    return this.find(filter);
  }

  // Get summary statistics using aggregation
  async getSummaryStats(): Promise<any> {
    return this.aggregate([
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          uniqueLocations: { $addToSet: '$locationName' },
          avgAge: { $avg: '$actualAge' },
          
          // Gender distribution
          maleCount: { $sum: { $cond: [{ $eq: ['$gender', 'Male'] }, 1, 0] } },
          femaleCount: { $sum: { $cond: [{ $eq: ['$gender', 'Female'] }, 1, 0] } },
          
          // Device distribution
          samsungCount: { $sum: { $cond: [{ $eq: ['$deviceBrand', 'Samsung'] }, 1, 0] } },
          appleCount: { $sum: { $cond: [{ $eq: ['$deviceBrand', 'Apple'] }, 1, 0] } },
          
          // Location type distribution
          urbanCount: { $sum: { $cond: [{ $eq: ['$locationType', 'urban'] }, 1, 0] } },
          suburbanCount: { $sum: { $cond: [{ $eq: ['$locationType', 'sub urban'] }, 1, 0] } },
          
          // Digital interest distribution
          socialMediaCount: { $sum: { $cond: [{ $eq: ['$digitalInterest', 'Social Media'] }, 1, 0] } },
          gamingCount: { $sum: { $cond: [{ $eq: ['$digitalInterest', 'Gaming'] }, 1, 0] } },
          
          // Date range
          earliestDate: { $min: '$date' },
          latestDate: { $max: '$date' }
        }
      },
      {
        $project: {
          totalCustomers: 1,
          uniqueLocations: { $size: '$uniqueLocations' },
          avgAge: { $round: ['$avgAge', 1] },
          
          genderDistribution: {
            male: '$maleCount',
            female: '$femaleCount'
          },
          
          deviceDistribution: {
            samsung: '$samsungCount',
            apple: '$appleCount'
          },
          
          locationDistribution: {
            urban: '$urbanCount',
            suburban: '$suburbanCount'
          },
          
          interestDistribution: {
            socialMedia: '$socialMediaCount',
            gaming: '$gamingCount'
          },
          
          dateRange: {
            earliest: '$earliestDate',
            latest: '$latestDate'
          }
        }
      }
    ]);
  }

  // Advanced filtering with multiple criteria
  async findWithFilters(filters: any, pagination?: PaginationParams): Promise<PaginatedResponse<ICustomer> | ICustomer[]> {
    const query: any = {};

    // Basic filters
    if (filters.gender) query.gender = filters.gender;
    if (filters.deviceBrand) query.deviceBrand = filters.deviceBrand;
    if (filters.digitalInterest) query.digitalInterest = filters.digitalInterest;
    if (filters.locationType) query.locationType = filters.locationType;
    if (filters.locationName) query.locationName = new RegExp(filters.locationName, 'i');

    // Age range filter
    if (filters.minAge || filters.maxAge) {
      const currentYear = new Date().getFullYear();
      const ageFilter: any = {};
      
      if (filters.minAge) {
        ageFilter.$lte = currentYear - filters.minAge;
      }
      if (filters.maxAge) {
        ageFilter.$gte = currentYear - filters.maxAge;
      }
      
      query.birthYear = ageFilter;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const dateFilter: any = {};
      
      if (filters.startDate) {
        dateFilter.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        dateFilter.$lte = new Date(filters.endDate);
      }
      
      query.date = dateFilter;
    }

    if (pagination) {
      return this.findWithPagination(query, pagination);
    }
    
    return this.find(query);
  }

  // Bulk operations for CSV import performance
  async bulkWrite(operations: any[]): Promise<any> {
    try {
      if (!operations || operations.length === 0) {
        return { insertedCount: 0, matchedCount: 0, modifiedCount: 0, deletedCount: 0, upsertedCount: 0 };
      }
      
      return await this.model.bulkWrite(operations, { 
        ordered: false, // Continue on individual errors
        writeConcern: { w: 1, j: false } // Optimize for speed
      });
    } catch (error) {
      console.error('BulkWrite operation failed:', error);
      throw this.handleError(error, 'bulkWrite');
    }
  }

  // Bulk insert optimized for large datasets
  async bulkInsert(documents: Partial<ICustomer>[]): Promise<any> {
    try {
      return await this.model.insertMany(documents, {
        ordered: false, // Continue on individual errors
        rawResult: true // Get detailed results
      });
    } catch (error) {
      throw this.handleError(error, 'bulkInsert');
    }
  }
}