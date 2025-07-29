import { Types } from 'mongoose';
import { Gender, DeviceBrand, DigitalInterest, LocationType } from '../models/enums';

// Input DTOs
export interface CreateCustomerDto {
  number: number;
  locationName: string;
  date: string | Date; // Accept both string and Date
  loginHour: string;
  userName: string;
  birthYear: number; // Birth year
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

export interface BulkCreateCustomerDto {
  customers: CreateCustomerDto[];
}

// Response DTOs
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

// Query DTOs
export interface CustomerQueryDto {
  page?: number;
  size?: number;
  search?: string;
  
  // Date filters
  startDate?: string;
  endDate?: string;
  
  // Demographic filters
  gender?: Gender;
  minAge?: number;
  maxAge?: number;
  ageRange?: string; // e.g., "18-25", "26-35"
  
  // Location filters
  locationName?: string;
  locationType?: LocationType;
  
  // Device & Interest filters
  deviceBrand?: DeviceBrand;
  digitalInterest?: DigitalInterest;
  
  // Time filters
  loginHourStart?: string; // e.g., "09:00"
  loginHourEnd?: string;   // e.g., "17:00"
  
  // Sorting
  sortBy?: 'date' | 'loginDateTime' | 'actualAge' | 'locationName' | 'userName';
  sortOrder?: 'asc' | 'desc';
}

// Summary DTOs
export interface CustomerSummaryDto {
  totalActivities: number;
  uniqueUsers: number;
  uniqueLocations: number;
  avgAge: number;
  
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  
  demographics: {
    genderDistribution: GenderStats[];
    ageGroups: AgeGroupStats[];
  };
  
  technology: {
    deviceBrands: DeviceBrandStats[];
    digitalInterests: DigitalInterestStats[];
  };
  
  location: {
    locationTypes: LocationTypeStats[];
    topLocations: LocationStats[];
  };
  
  temporal: {
    hourlyDistribution: HourlyStats[];
    dailyActivity: DailyStats[];
    monthlyTrends: MonthlyStats[];
  };
}

// Supporting interfaces for summary
export interface GenderStats {
  gender: Gender;
  count: number;
  percentage: number;
}

export interface AgeGroupStats {
  ageGroup: string; // "18-25", "26-35", etc.
  count: number;
  percentage: number;
  avgAge: number;
}

export interface DeviceBrandStats {
  brand: DeviceBrand;
  count: number;
  percentage: number;
}

export interface DigitalInterestStats {
  interest: DigitalInterest;
  count: number;
  percentage: number;
  avgAge: number;
}

export interface LocationTypeStats {
  locationType: LocationType;
  count: number;
  percentage: number;
  uniqueUsers: number;
}

export interface LocationStats {
  locationName: string;
  count: number;
  uniqueUsers: number;
  avgAge: number;
  dominantGender: Gender;
  topDevice: DeviceBrand;
}

export interface HourlyStats {
  hour: number; // 0-23
  count: number;
  uniqueUsers: number;
}

export interface DailyStats {
  date: Date;
  count: number;
  uniqueUsers: number;
  avgAge: number;
}

export interface MonthlyStats {
  year: number;
  month: number;
  count: number;
  uniqueUsers: number;
  avgAge: number;
  growth: number; // Percentage growth from previous month
}

// Advanced analytics DTOs
export interface UserBehaviorAnalyticsDto {
  userId: string; // email as identifier
  totalActivities: number;
  uniqueLocations: number;
  favoriteLocation: string;
  preferredLoginTime: string;
  activityPattern: 'morning' | 'afternoon' | 'evening' | 'mixed';
  locationPreference: LocationType;
  lastActivity: Date;
  firstActivity: Date;
}

export interface LocationAnalyticsDto {
  locationName: string;
  totalVisits: number;
  uniqueVisitors: number;
  avgVisitsPerUser: number;
  peakHours: string[];
  demographics: {
    avgAge: number;
    genderSplit: { male: number; female: number };
    topDevices: string[];
    topInterests: string[];
  };
  trends: {
    dailyAverage: number;
    weeklyGrowth: number;
    monthlyGrowth: number;
  };
}

// Export/Import DTOs
export interface ExportOptionsDto {
  format: 'csv' | 'json' | 'xlsx';
  filters?: CustomerQueryDto;
  fields?: string[]; // Specific fields to export
  includeAnalytics?: boolean;
}

export interface ImportResultDto {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: ImportErrorDto[];
  duplicates: number;
  summary: {
    uniqueUsers: number;
    uniqueLocations: number;
    dateRange: { start: Date; end: Date };
  };
}

export interface ImportErrorDto {
  row: number;
  field: string;
  value: any;
  error: string;
}