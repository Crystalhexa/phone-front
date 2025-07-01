import { NextResponse } from 'next/server';
import { ApiResponse, ApiError } from '@/lib/type/api';
import { logger } from '@/lib/utils/logger';

export function createSuccessResponse<T>(
  data: T,
  message: string,
  status: number = 200,
  requestId: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    requestId,
    timestamp: new Date().toISOString(),
  }, { status });
}

export function createErrorResponse(
  message: string,
  status: number,
  requestId: string,
  errorCode?: string,
  errors?: any
): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    errorCode,
    errors,
  }, { status });
}

export function handleApiError(
  error: unknown,
  requestId: string
): NextResponse<ApiResponse> {
  if (error instanceof ApiError) {
    logger.error('API Error', {
      requestId,
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
    });

    return createErrorResponse(
      error.message,
      error.statusCode,
      requestId,
      error.errorCode,
      error.details
    );
  }

  if (error instanceof Error) {
    logger.error('Unexpected Error', {
      requestId,
      message: error.message,
      stack: error.stack,
    });

    return createErrorResponse(
      'An unexpected error occurred',
      500,
      requestId,
      'INTERNAL_ERROR'
    );
  }

  logger.error('Unknown Error', { requestId, error });
  return createErrorResponse(
    'An unknown error occurred',
    500,
    requestId,
    'UNKNOWN_ERROR'
  );
}