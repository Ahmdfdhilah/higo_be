import { BaseService } from './base';
import { CustomerRepository } from '../repositories/customer';
import { ICustomer } from '../models/customer';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../types/base';
import { 
  CreateCustomerDto, 
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerSummaryDto,
  EmptyCustomerSummaryDto,
  PaginatedCustomersWithSummary,
  CustomersWithSummary
} from '../types/customer';
import { CacheService } from '../utils/cache';

export class CustomerService extends BaseService<ICustomer> {
  constructor() {
    super(new CustomerRepository());
  }

  // Helper method to convert ICustomer to CustomerResponseDto
  private toCustomerResponseDto(customer: ICustomer): CustomerResponseDto {
    return {
      _id: customer._id,
      number: customer.number,
      locationName: customer.locationName,
      date: customer.date,
      loginHour: customer.loginHour,
      userName: customer.userName,
      birthYear: customer.birthYear,
      actualAge: customer.actualAge || new Date().getFullYear() - customer.birthYear,
      gender: customer.gender,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      deviceBrand: customer.deviceBrand,
      digitalInterest: customer.digitalInterest,
      locationType: customer.locationType,
      loginDateTime: customer.loginDateTime || new Date(),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }

  // Get customer by ID with DTO conversion
  async getCustomerById(id: string, useCache: boolean = true): Promise<ApiResponse<CustomerResponseDto | null>> {
    try {
      const result = await super.findById(id, useCache);
      
      if (result.success && result.data) {
        return {
          success: true,
          message: 'Customer found successfully',
          data: this.toCustomerResponseDto(result.data as ICustomer)
        };
      }
      
      return {
        success: false,
        message: 'Customer not found',
        data: null
      };
    } catch (error) {
      return this.handleError<CustomerResponseDto | null>(error, 'getCustomerById');
    }
  }

  // Create new customer
  async createCustomer(customerData: CreateCustomerDto): Promise<ApiResponse<CustomerResponseDto>> {
    try {
      // Convert date string to Date if needed
      const processedData = {
        ...customerData,
        date: typeof customerData.date === 'string' ? new Date(customerData.date) : customerData.date
      };
      
      const customer = await this.repository.create(processedData);
      await this.afterCreate(customer);
      
      // Invalidate summary cache
      await CacheService.del('customer:summary');

      return {
        success: true,
        message: 'Customer created successfully',
        data: this.toCustomerResponseDto(customer)
      };
    } catch (error) {
      return this.handleError<CustomerResponseDto>(error, 'createCustomer');
    }
  }

  // Update customer
  async updateCustomer(id: string, updateData: UpdateCustomerDto): Promise<ApiResponse<CustomerResponseDto | null>> {
    try {
      const customer = await this.repository.updateById(id, updateData);

      if (customer) {
        await this.invalidateCache();
        // Invalidate summary cache
        await CacheService.del('customer:summary');
      }

      return {
        success: true,
        message: customer ? 'Customer updated successfully' : 'Customer not found',
        data: customer ? this.toCustomerResponseDto(customer) : null
      };
    } catch (error) {
      return this.handleError(error, 'updateCustomer');
    }
  }

  // Get all customers with pagination and filters, including summary
  async getAllCustomers(
    pagination?: PaginationParams, 
    filters?: any
  ): Promise<ApiResponse<PaginatedCustomersWithSummary<CustomerResponseDto> | CustomersWithSummary<CustomerResponseDto>>> {
    try {
      let customers: ApiResponse<PaginatedResponse<ICustomer> | ICustomer[]>;
      
      if (filters && Object.keys(filters).length > 0) {
        const repoResult = await (this.repository as CustomerRepository).findWithFilters(filters, pagination);
        customers = {
          success: true,
          message: 'Customers retrieved successfully',
          data: repoResult
        };
      } else {
        customers = await super.findAll({}, pagination, true);
      }
      
      // Handle service error
      if (!customers.success || !customers.data) {
        const emptyResponse = {
          success: true,
          message: 'No customers found',
          data: pagination ? {
            items: [],
            total: 0,
            page: pagination.page || 1,
            size: pagination.size || 10,
            pages: 0,
            summary: null
          } : Object.assign([], { summary: null })
        };
        return emptyResponse;
      }

      const customerData = customers.data;
      
      // Get summary data using the same cache key
      const summaryResponse = await this.getCustomerSummary();
      const summaryData: CustomerSummaryDto | null = (summaryResponse.success && summaryResponse.data) ? summaryResponse.data : null;
      
      // Convert based on whether it's paginated or not
      let data: PaginatedCustomersWithSummary<CustomerResponseDto> | CustomersWithSummary<CustomerResponseDto>;
      
      if (Array.isArray(customerData)) {
        const customerList = customerData.map((customer: ICustomer) => this.toCustomerResponseDto(customer));
        data = Object.assign(customerList, { summary: summaryData });
      } else {
        // Type guard for paginated response
        const paginatedCustomers = customerData as PaginatedResponse<ICustomer>;
        
        // Handle case where items might be undefined
        if (!paginatedCustomers.items) {
          return {
            success: true,
            message: 'No customers found',
            data: {
              items: [],
              total: 0,
              page: paginatedCustomers.page || 1,
              size: paginatedCustomers.size || 10,
              pages: 0,
              summary: summaryData
            }
          };
        }
        
        data = {
          ...paginatedCustomers,
          items: paginatedCustomers.items.map((customer: ICustomer) => this.toCustomerResponseDto(customer)),
          summary: summaryData
        };
      }
      
      return {
        success: true,
        message: 'Customers retrieved successfully',
        data
      };
    } catch (error) {
      return this.handleError<PaginatedCustomersWithSummary<CustomerResponseDto> | CustomersWithSummary<CustomerResponseDto>>(error, 'getAllCustomers');
    }
  }


  // Get summary statistics for dashboard with caching
  async getCustomerSummary(): Promise<ApiResponse<CustomerSummaryDto>> {
    try {
      const cacheKey = 'customer:summary';
      
      // Try to get from cache first
      const cachedSummary = await CacheService.get<ApiResponse<CustomerSummaryDto>>(cacheKey);
      if (cachedSummary) {
        return cachedSummary;
      }

      const summary = await (this.repository as CustomerRepository).getSummaryStats();
      
      // Handle empty result with proper typing
      const emptySummary: EmptyCustomerSummaryDto = {
        totalCustomers: 0,
        uniqueLocations: 0,
        avgAge: 0,
        genderDistribution: { male: 0, female: 0, other: 0 },
        deviceDistribution: { samsung: 0, apple: 0, huawei: 0, xiaomi: 0, oppo: 0, vivo: 0, other: 0 },
        locationDistribution: { urban: 0, suburban: 0, rural: 0 },
        interestDistribution: { socialMedia: 0, gaming: 0, shopping: 0, news: 0, entertainment: 0, education: 0, health: 0, finance: 0, travel: 0, food: 0, other: 0 },
        dateRange: { earliest: null, latest: null }
      };

      const response: ApiResponse<CustomerSummaryDto> = summary && Array.isArray(summary) && summary.length > 0
        ? {
            success: true,
            message: 'Customer summary retrieved successfully',
            data: summary[0] as CustomerSummaryDto
          }
        : {
            success: true,
            message: 'No customer data available for summary',
            data: emptySummary
          };
      
      // Cache the response for 5 minutes
      await CacheService.set(cacheKey, response, 300);
      
      return response;
    } catch (error) {
      return this.handleError(error, 'getCustomerSummary');
    }
  }

  // Delete customer
  async deleteCustomer(id: string): Promise<ApiResponse<CustomerResponseDto | null>> {
    try {
      const customer = await this.repository.findById(id);
      
      if (!customer) {
        return {
          success: false,
          message: 'Customer not found',
          data: null
        };
      }

      await this.repository.deleteById(id);
      await this.invalidateCache();
      // Invalidate summary cache
      await CacheService.del('customer:summary');

      return {
        success: true,
        message: 'Customer deleted successfully',
        data: this.toCustomerResponseDto(customer)
      };
    } catch (error) {
      return this.handleError(error, 'deleteCustomer');
    }
  }

  protected async validateBusinessRules(data: Partial<ICustomer>, operation: 'create' | 'update' = 'create'): Promise<void> {
    if (operation === 'create') {
      if (!data.number || !data.locationName || !data.userName || !data.email) {
        throw new Error('Missing required fields');
      }

      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected async afterCreate(customer: ICustomer): Promise<void> {
    console.log(`New customer added: ${customer.userName} from ${customer.locationName}`);
  }
}