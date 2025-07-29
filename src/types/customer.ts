import { Types } from 'mongoose';
import { IBaseModel, BaseFilters } from './base';
import { Gender, DeviceBrand, DigitalInterest, LocationType } from '../models/enums';

// Core Customer Interface (extends database model)
export interface ICustomer extends IBaseModel {
  number: number;
  locationName: string;
  date: Date;
  loginHour: string;
  userName: string;
  birthYear: number;
  gender: Gender;
  email: string;
  phoneNumber: string;
  deviceBrand: DeviceBrand;
  digitalInterest: DigitalInterest;
  locationType: LocationType;
  
  // Computed fields
  actualAge?: number;
  loginDateTime?: Date;
}

// DTOs for API requests
export interface CreateCustomerDto {
  number: number;
  locationName: string;
  date: string | Date;
  loginHour: string;
  userName: string;
  birthYear: number;
  gender: Gender;
  email: string;
  phoneNumber: string;
  deviceBrand: DeviceBrand;
  digitalInterest: DigitalInterest;
  locationType: LocationType;
}

export interface UpdateCustomerDto {
  locationName?: string;
  date?: string | Date;
  loginHour?: string;
  userName?: string;
  birthYear?: number;
  gender?: Gender;
  email?: string;
  phoneNumber?: string;
  deviceBrand?: DeviceBrand;
  digitalInterest?: DigitalInterest;
  locationType?: LocationType;
}

// DTOs for API responses
export interface CustomerResponseDto {
  _id: Types.ObjectId | string;
  number: number;
  locationName: string;
  date: Date;
  loginHour: string;
  userName: string;
  birthYear: number;
  actualAge: number;
  gender: Gender;
  email: string;
  phoneNumber: string;
  deviceBrand: DeviceBrand;
  digitalInterest: DigitalInterest;
  locationType: LocationType;
  loginDateTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Query filters
export interface CustomerFilters extends BaseFilters {
  // Demographic filters
  gender?: Gender;
  minAge?: number;
  maxAge?: number;
  
  // Location filters
  locationName?: string;
  locationType?: LocationType;
  
  // Device & Interest filters
  deviceBrand?: DeviceBrand;
  digitalInterest?: DigitalInterest;
  
  // Time filters
  loginHourStart?: string;
  loginHourEnd?: string;
}

// Summary statistics
export interface CustomerSummaryDto {
  totalCustomers: number;
  uniqueUsers: number;
  uniqueLocations: number;
  avgAge: number;
  
  genderDistribution: {
    male: number;
    female: number;
  };
  
  deviceDistribution: {
    samsung: number;
    apple: number;
    huawei?: number;
    xiaomi?: number;
    oppo?: number;
    vivo?: number;
    other?: number;
  };
  
  locationDistribution: {
    urban: number;
    suburban: number;
    rural?: number;
  };
  
  interestDistribution: {
    socialMedia: number;
    gaming: number;
    shopping?: number;
    news?: number;
    entertainment?: number;
    education?: number;
    health?: number;
    finance?: number;
    travel?: number;
    food?: number;
    other?: number;
  };
  
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

// CSV Import related types
export interface CSVImportProgress {
  totalProcessed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  errors: CSVImportError[];
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface CSVImportError {
  row: number;
  field?: string;
  value?: any;
  error: string;
  rawData?: any;
}

export interface CSVImportResult {
  importId: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: CSVImportError[];
  duration: number;
  summary: {
    uniqueUsers: number;
    uniqueLocations: number;
    dateRange: { start: Date; end: Date };
  };
}