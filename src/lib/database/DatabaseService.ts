import { initDatabase, query, transaction } from '@/lib/database/connection';
import { logger } from '@/lib/utils/logger';
import { ApiError } from '../type/api';

export class DatabaseService {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        await initDatabase();
        this.initialized = true;
        logger.info('Database initialized successfully');
      } catch (error) {
        logger.error('Database initialization failed', { error });
        throw new ApiError('Database connection failed', 503, 'DB_CONNECTION_ERROR');
      }
    }
  }

  static async query(text: string, params?: any[]): Promise<any> {
    await this.initialize();
    
    try {
      return await query(text, params);
    } catch (error: any) {
      logger.error('Database query failed', { 
        query: text, 
        params, 
        error: error.message 
      });
      throw this.handleDatabaseError(error);
    }
  }

  static async executeTransaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    await this.initialize();
    
    try {
      return await transaction(callback);
    } catch (error: any) {
      logger.error('Database transaction failed', { error: error.message });
      throw this.handleDatabaseError(error);
    }
  }

  private static handleDatabaseError(error: any): ApiError {
    const errorMessage = error.message || '';
    
    // PostgreSQL unique constraint violation
    if (error.code === '23505') {
      if (errorMessage.includes('sku')) {
        return new ApiError('SKU already exists', 409, 'DUPLICATE_SKU');
      }
      if (errorMessage.includes('barcode')) {
        return new ApiError('Barcode already exists', 409, 'DUPLICATE_BARCODE');
      }
      return new ApiError('Duplicate entry detected', 409, 'DUPLICATE_ENTRY');
    }
    
    // PostgreSQL foreign key constraint violation
    if (error.code === '23503') {
      if (errorMessage.includes('subcategory_id')) {
        return new ApiError('Invalid subcategory ID', 400, 'INVALID_SUBCATEGORY');
      }
      if (errorMessage.includes('brand_id')) {
        return new ApiError('Invalid brand ID', 400, 'INVALID_BRAND');
      }
      if (errorMessage.includes('attribute_id')) {
        return new ApiError('Invalid attribute ID', 400, 'INVALID_ATTRIBUTE');
      }
      if (errorMessage.includes('attribute_value_id')) {
        return new ApiError('Invalid attribute value ID', 400, 'INVALID_ATTRIBUTE_VALUE');
      }
      return new ApiError('Invalid reference ID', 400, 'INVALID_REFERENCE');
    }
    
    // PostgreSQL check constraint violation
    if (error.code === '23514') {
      return new ApiError('Data validation failed', 400, 'VALIDATION_ERROR');
    }
    
    // PostgreSQL not null constraint violation
    if (error.code === '23502') {
      return new ApiError('Required field is missing', 400, 'MISSING_REQUIRED_FIELD');
    }
    
    // Connection or timeout errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new ApiError('Database connection failed', 503, 'DB_CONNECTION_ERROR');
    }
    
    // Default error
    return new ApiError('Database operation failed', 500, 'DB_ERROR');
  }
}