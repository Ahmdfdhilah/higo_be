import { BaseService } from './base';
import { CustomerRepository } from '../repositories/customer';
import { ICustomer } from '../models/customer';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../schemas/base';
import { 
  CreateCustomerDto, 
  UpdateCustomerDto,
  CustomerResponseDto
} from '../schemas/customer';

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

  // Get all customers with pagination and filters
  async getAllCustomers(
    pagination?: PaginationParams, 
    filters?: any
  ): Promise<ApiResponse<PaginatedResponse<CustomerResponseDto> | CustomerResponseDto[]>> {
    try {
      console.log('🔍 getAllCustomers called with:', { pagination, filters });
      
      // Debug: Check total count in database
      const totalCount = await this.repository.count({});
      console.log('📊 Total customers in database:', totalCount);
      
      let customers: ApiResponse<PaginatedResponse<ICustomer> | ICustomer[]>;
      
      if (filters && Object.keys(filters).length > 0) {
        console.log('🎯 Using filtered query');
        const repoResult = await (this.repository as CustomerRepository).findWithFilters(filters, pagination);
        customers = {
          success: true,
          message: 'Customers retrieved successfully',
          data: repoResult
        };
      } else {
        console.log('📋 Using findAll query');
        customers = await super.findAll({}, pagination, false); // Disable cache
      }
      
      console.log('✅ Query result from BaseService:', customers.success, customers.message);
      
      // Handle service error
      if (!customers.success || !customers.data) {
        console.log('⚠️ BaseService returned error or no data');
        return {
          success: true,
          message: 'No customers found',
          data: pagination ? {
            items: [],
            total: 0,
            page: pagination.page || 1,
            size: pagination.size || 10,
            pages: 0
          } : []
        };
      }

      const customerData = customers.data;
      console.log('📊 Customer data type:', Array.isArray(customerData) ? 'Array' : 'Paginated');
      
      // Convert based on whether it's paginated or not
      let data: PaginatedResponse<CustomerResponseDto> | CustomerResponseDto[];
      
      if (Array.isArray(customerData)) {
        console.log('🔄 Converting array data');
        data = customerData.map((customer: ICustomer) => this.toCustomerResponseDto(customer));
      } else {
        // Type guard for paginated response
        const paginatedCustomers = customerData as PaginatedResponse<ICustomer>;
        
        console.log('🔍 Paginated customers check:', {
          hasItems: !!paginatedCustomers.items,
          itemsLength: paginatedCustomers.items?.length,
          total: paginatedCustomers.total
        });
        
        // Handle case where items might be undefined
        if (!paginatedCustomers.items) {
          console.log('⚠️ paginatedCustomers.items is falsy, returning empty result');
          return {
            success: true,
            message: 'No customers found',
            data: {
              items: [],
              total: 0,
              page: paginatedCustomers.page || 1,
              size: paginatedCustomers.size || 10,
              pages: 0
            }
          };
        }
        
        console.log('🔄 Converting paginated data');
        data = {
          ...paginatedCustomers,
          items: paginatedCustomers.items.map((customer: ICustomer) => this.toCustomerResponseDto(customer))
        };
      }
      
      return {
        success: true,
        message: 'Customers retrieved successfully',
        data
      };
    } catch (error) {
      return this.handleError<PaginatedResponse<CustomerResponseDto> | CustomerResponseDto[]>(error, 'getAllCustomers');
    }
  }


  // Get summary statistics for dashboard
  async getCustomerSummary(): Promise<ApiResponse<any>> {
    try {
      const summary = await (this.repository as CustomerRepository).getSummaryStats();
      
      // Handle empty result
      if (!summary || !Array.isArray(summary) || summary.length === 0) {
        return {
          success: true,
          message: 'No customer data available for summary',
          data: {
            totalCustomers: 0,
            uniqueLocations: 0,
            avgAge: 0,
            genderDistribution: { male: 0, female: 0 },
            deviceDistribution: { samsung: 0, apple: 0 },
            locationDistribution: { urban: 0, suburban: 0 },
            interestDistribution: { socialMedia: 0, gaming: 0 },
            dateRange: { earliest: null, latest: null }
          }
        };
      }
      
      return {
        success: true,
        message: 'Customer summary retrieved successfully',
        data: summary[0] || {}
      };
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