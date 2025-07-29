import csv from 'csv-parser';
import fs from 'fs';
import { Transform } from 'stream';
import { CustomerService } from './customer';
import { CustomerRepository } from '../repositories/customer';
import { ICustomer } from '../models/customer';
import { Gender, DeviceBrand, DigitalInterest, LocationType } from '../models/enums';
import { ApiResponse } from '../types/base';

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

export class CSVImportService {
  private customerRepository: CustomerRepository;
  private activeImports: Map<string, CSVImportProgress> = new Map();
  private readonly BATCH_SIZE = 1000; // Process 1000 records per batch
  private readonly MAX_ERRORS = 10000; // Stop if too many errors

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  // Start CSV import with streaming
  async importFromCSV(filePath: string, options: {
    skipValidation?: boolean;
    continueOnError?: boolean;
    batchSize?: number;
  } = {}): Promise<{ importId: string; progress: CSVImportProgress }> {
    const importId = this.generateImportId();
    const batchSize = options.batchSize || this.BATCH_SIZE;
    
    // Initialize progress tracking
    const progress: CSVImportProgress = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches: 0,
      percentage: 0,
      errors: [],
      status: 'processing',
      startTime: new Date()
    };
    
    this.activeImports.set(importId, progress);

    // Start processing asynchronously
    this.processCSVStream(filePath, importId, batchSize, options)
      .catch(error => {
        progress.status = 'failed';
        progress.errors.push({
          row: -1,
          error: `Import failed: ${error.message}`
        });
      });

    return { importId, progress };
  }

  // Process CSV using streams for memory efficiency
  private async processCSVStream(
    filePath: string, 
    importId: string, 
    batchSize: number,
    options: any
  ): Promise<void> {
    const progress = this.activeImports.get(importId)!;
    let batch: any[] = [];
    let rowNumber = 0;
    let processedBatches = 0;

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }: { header: string }) => this.mapCSVHeader(header)
        }))
        .pipe(new Transform({
          objectMode: true,
          transform: async (chunk, encoding, callback) => {
            try {
              rowNumber++;
              
              // Validate and transform row
              const transformedRow = await this.transformCSVRow(chunk, rowNumber);
              
              if (transformedRow.isValid) {
                batch.push(transformedRow.data);
              } else {
                progress.failed++;
                progress.errors.push(...transformedRow.errors);
              }

              // Process batch when full
              if (batch.length >= batchSize) {
                try {
                  await this.processBatch(batch, importId, processedBatches);
                  processedBatches++;
                  batch = []; // Clear batch only after successful processing
                  
                  // Force garbage collection for memory management
                  if (global.gc && processedBatches % 10 === 0) {
                    global.gc();
                  }
                } catch (error) {
                  console.error(`Batch ${processedBatches} processing failed:`, error);
                  progress.failed += batch.length;
                  progress.errors.push({
                    row: -1,
                    error: `Batch ${processedBatches} failed: ${(error as any)?.message || 'Unknown error'}`
                  });
                  batch = []; // Clear failed batch
                  processedBatches++;
                }
              }

              // Update progress
              progress.totalProcessed = rowNumber;
              // Better percentage calculation - we'll estimate total based on file size or use a reasonable cap
              progress.percentage = Math.min((rowNumber / 100000) * 100, 99); // Cap at 99% until completion
              
              // Stop if too many errors
              if (progress.errors.length > this.MAX_ERRORS) {
                return callback(new Error('Too many validation errors'));
              }

              callback();
            } catch (error: any) {
              callback(error);
            }
          }
        }));

      stream.on('end', async () => {
        try {
          console.log(`CSV stream ended. Remaining batch size: ${batch.length}`);
          
          // Process remaining batch (final partial batch)
          if (batch.length > 0) {
            console.log(`Processing final batch of ${batch.length} records...`);
            try {
              await this.processBatch(batch, importId, processedBatches);
              processedBatches++;
              console.log(`Final batch processed successfully`);
            } catch (error) {
              console.error(`Final batch processing failed:`, error);
              progress.failed += batch.length;
              progress.errors.push({
                row: -1,
                error: `Final batch failed: ${(error as any)?.message || 'Unknown error'}`
              });
            }
          }

          // Finalize import
          progress.status = 'completed';
          progress.percentage = 100;
          progress.currentBatch = processedBatches;
          progress.totalBatches = processedBatches;
          
          const endTime = new Date();
          const duration = endTime.getTime() - progress.startTime.getTime();
          
          console.log(`CSV Import ${importId} completed in ${duration}ms`);
          console.log(`Total batches processed: ${processedBatches}`);
          console.log(`Final stats - Processed: ${progress.totalProcessed}, Success: ${progress.successful}, Failed: ${progress.failed}`);
          
          resolve();
        } catch (error) {
          console.error('Error in stream end handler:', error);
          progress.status = 'failed';
          reject(error);
        }
      });

      stream.on('error', (error: any) => {
        reject(error);
      });
    });
  }

  // Process batch with bulk MongoDB operations
  private async processBatch(batch: ICustomer[], importId: string, batchNumber: number): Promise<void> {
    const progress = this.activeImports.get(importId)!;
    progress.currentBatch = batchNumber + 1; // Human-readable batch number (1-indexed)

    console.log(`Processing batch ${batchNumber + 1} with ${batch.length} records...`);

    try {
      // Use MongoDB bulk operations for performance
      const bulkOps = batch.map(data => ({
        insertOne: {
          document: {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      }));

      const result = await this.customerRepository.bulkWrite(bulkOps);
      
      const insertedCount = result.insertedCount || 0;
      const failedCount = batch.length - insertedCount;
      
      progress.successful += insertedCount;
      progress.failed += failedCount;
      
      console.log(`Batch ${batchNumber + 1} completed: ${insertedCount}/${batch.length} inserted successfully`);
      
      if (failedCount > 0) {
        console.warn(`Batch ${batchNumber + 1}: ${failedCount} records failed to insert`);
      }
      
    } catch (error) {
      // Handle batch errors
      console.error(`Batch ${batchNumber + 1} failed completely:`, error);
      progress.failed += batch.length;
      progress.errors.push({
        row: -1,
        error: `Batch ${batchNumber + 1} failed: ${(error as any)?.message || 'Unknown error'}`
      });
      
      // Re-throw to be handled by caller
      throw error;
    }
  }

  // Transform and validate CSV row
  private async transformCSVRow(row: any, rowNumber: number): Promise<{
    isValid: boolean;
    data?: ICustomer;
    errors: CSVImportError[];
  }> {
    const errors: CSVImportError[] = [];

    try {
      // Transform CSV data to Customer model
      const customerData: Partial<ICustomer> = {
        number: parseInt(row.number),
        locationName: row.locationName?.trim(),
        date: new Date(row.date),
        loginHour: row.loginHour?.trim(),
        userName: row.userName?.trim(),
        birthYear: parseInt(row.birthYear || row.age), // Handle both field names
        gender: this.mapGender(row.gender),
        email: row.email?.toLowerCase().trim(),
        phoneNumber: row.phoneNumber?.trim(),
        deviceBrand: this.mapDeviceBrand(row.deviceBrand),
        digitalInterest: this.mapDigitalInterest(row.digitalInterest),
        locationType: this.mapLocationType(row.locationType)
      };

      // Validate required fields
      if (!customerData.number) {
        errors.push({ row: rowNumber, field: 'number', value: row.number, error: 'Invalid number' });
      }
      
      if (!customerData.locationName) {
        errors.push({ row: rowNumber, field: 'locationName', value: row.locationName, error: 'Location name required' });
      }
      
      if (!customerData.userName) {
        errors.push({ row: rowNumber, field: 'userName', value: row.userName, error: 'User name required' });
      }
      
      if (!customerData.email || !this.isValidEmail(customerData.email)) {
        errors.push({ row: rowNumber, field: 'email', value: row.email, error: 'Invalid email' });
      }
      
      if (!customerData.birthYear || customerData.birthYear < 1900 || customerData.birthYear > new Date().getFullYear()) {
        errors.push({ row: rowNumber, field: 'birthYear', value: row.birthYear || row.age, error: 'Invalid birth year' });
      }

      if (errors.length === 0) {
        return {
          isValid: true,
          data: customerData as ICustomer,
          errors
        };
      } else {
        return {
          isValid: false,
          errors
        };
      }
      
    } catch (error: any) {
      return {
        isValid: false,
        errors: [{ row: rowNumber, error: `Row transformation failed: ${error?.message || 'Unknown error'}`, rawData: row }]
      };
    }
  }

  // Helper methods for mapping CSV values to enums
  private mapCSVHeader(header: string): string {
    const headerMap: { [key: string]: string } = {
      'Number': 'number',
      'Name of Location': 'locationName',
      'Date': 'date',
      'Login Hour': 'loginHour',
      'Name': 'userName',
      'Age': 'birthYear', // Map Age to birthYear
      'gender': 'gender',
      'Email': 'email',
      'No Telp': 'phoneNumber',
      'Brand Device': 'deviceBrand',
      'Digital Interest': 'digitalInterest',
      'Location Type': 'locationType'
    };
    
    return headerMap[header] || header.toLowerCase().replace(/\s+/g, '');
  }

  private mapGender(gender: string): Gender {
    const normalizedGender = gender?.toLowerCase().trim();
    switch (normalizedGender) {
      case 'male': case 'm': return Gender.MALE;
      case 'female': case 'f': return Gender.FEMALE;
      default: return Gender.OTHER;
    }
  }

  private mapDeviceBrand(brand: string): DeviceBrand {
    const normalizedBrand = brand?.toLowerCase().trim();
    switch (normalizedBrand) {
      case 'samsung': return DeviceBrand.SAMSUNG;
      case 'apple': return DeviceBrand.APPLE;
      case 'huawei': return DeviceBrand.HUAWEI;
      case 'xiaomi': return DeviceBrand.XIAOMI;
      case 'oppo': return DeviceBrand.OPPO;
      case 'vivo': return DeviceBrand.VIVO;
      default: return DeviceBrand.OTHER;
    }
  }

  private mapDigitalInterest(interest: string): DigitalInterest {
    const normalizedInterest = interest?.toLowerCase().trim();
    switch (normalizedInterest) {
      case 'social media': return DigitalInterest.SOCIAL_MEDIA;
      case 'gaming': return DigitalInterest.GAMING;
      case 'shopping': return DigitalInterest.SHOPPING;
      case 'news': return DigitalInterest.NEWS;
      case 'entertainment': return DigitalInterest.ENTERTAINMENT;
      case 'education': return DigitalInterest.EDUCATION;
      case 'health': return DigitalInterest.HEALTH;
      case 'finance': return DigitalInterest.FINANCE;
      case 'travel': return DigitalInterest.TRAVEL;
      case 'food': return DigitalInterest.FOOD;
      default: return DigitalInterest.OTHER;
    }
  }

  private mapLocationType(type: string): LocationType {
    const normalizedType = type?.toLowerCase().trim();
    switch (normalizedType) {
      case 'urban': return LocationType.URBAN;
      case 'sub urban': case 'suburban': return LocationType.SUBURBAN;
      case 'rural': return LocationType.RURAL;
      default: return LocationType.URBAN;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateImportId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get import progress
  getImportProgress(importId: string): CSVImportProgress | null {
    return this.activeImports.get(importId) || null;
  }

  // Cancel import
  cancelImport(importId: string): boolean {
    const progress = this.activeImports.get(importId);
    if (progress && progress.status === 'processing') {
      progress.status = 'cancelled';
      return true;
    }
    return false;
  }

  // Clean up completed imports
  cleanupImport(importId: string): void {
    this.activeImports.delete(importId);
  }

  // Get all active imports
  getActiveImports(): { [key: string]: CSVImportProgress } {
    const result: { [key: string]: CSVImportProgress } = {};
    this.activeImports.forEach((progress, importId) => {
      result[importId] = progress;
    });
    return result;
  }

  // Get import statistics for debugging
  getImportStats(importId: string): any {
    const progress = this.activeImports.get(importId);
    if (!progress) return null;

    return {
      importId,
      totalProcessed: progress.totalProcessed,
      successful: progress.successful,
      failed: progress.failed,
      currentBatch: progress.currentBatch,
      totalBatches: progress.totalBatches,
      percentage: progress.percentage,
      status: progress.status,
      errorCount: progress.errors.length,
      startTime: progress.startTime,
      estimatedTimeRemaining: progress.estimatedTimeRemaining
    };
  }
}