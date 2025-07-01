import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/lib/type/api';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: new ApiError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          error.format()
        ),
      };
    }
    
    return {
      success: false,
      error: new ApiError(
        'Invalid request body',
        400,
        'INVALID_REQUEST_BODY'
      ),
    };
  }
}

export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, any> = {};
    
    // Convert search params to object
    for (const [key, value] of searchParams.entries()) {
      // Handle numeric values
      if (key === 'page' || key === 'limit') {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
          params[key] = numValue;
        }
      } else {
        params[key] = value;
      }
    }
    
    const validatedData = schema.parse(params);
    
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: new ApiError(
          'Invalid query parameters',
          400,
          'INVALID_QUERY_PARAMS',
          error.format()
        ),
      };
    }
    
    return {
      success: false,
      error: new ApiError(
        'Invalid query parameters',
        400,
        'INVALID_QUERY_PARAMS'
      ),
    };
  }
}
