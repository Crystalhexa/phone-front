import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { ProductService } from '@/lib/services/ProductService';
import { ProductValidator } from '@/lib/validations/ProductValidator';
import { ApiError } from '@/lib/type/api';
import { CreateProductRequest, GetProductsQuery } from '@/lib/type/product';
import { createSuccessResponse, handleApiError } from '@/lib/utils/apiHelpers';
import { logger } from '@/lib/utils/logger';
import { validateQueryParams, validateRequestBody } from '@/lib/utils/validation';

/**
 * POST /api/products
 * Creates a new product with variations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    logger.info('Product creation started', { requestId });

    // Apply middleware
    // const authResult = await withAuth(request);
    // if (!authResult.success) {
    //   return handleApiError(new ApiError('Unauthorized', 401, 'AUTH_REQUIRED'), requestId);
    // }

    const rateLimitResult = await withRateLimit(request, 'create_product', 10, 60); // 10 requests per minute
    if (!rateLimitResult.success) {
      return handleApiError(new ApiError('Rate limit exceeded', 429, 'RATE_LIMIT'), requestId);
    }

    // Validate request body
    const validationResult = await validateRequestBody<CreateProductRequest>(
      request,
      ProductValidator.createProductSchema
    );

    if (!validationResult.success) {
      return handleApiError(validationResult.error, requestId);
    }

    // Create product using service
    const productService = new ProductService();
    const result = await productService.createProduct(validationResult.data!, {
      requestId,
    });

    const duration = Date.now() - startTime;
    logger.info('Product created successfully', { 
      requestId, 
      productId: result.productId, 
      duration 
    });

    return createSuccessResponse(
      result,
      'Product created successfully',
      201,
      requestId
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Product creation failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration 
    });

    return handleApiError(error, requestId);
  }
}

/**
 * GET /api/products
 * Retrieves products with pagination and search
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    logger.info('Products fetch started', { requestId });

    // Apply middleware
    // const authResult = await withAuth(request);
    // if (!authResult.success) {
    //   return handleApiError(new ApiError('Unauthorized', 401, 'AUTH_REQUIRED'), requestId);
    // }

    const rateLimitResult = await withRateLimit(request, 'get_products', 100, 60); // 100 requests per minute
    if (!rateLimitResult.success) {
      return handleApiError(new ApiError('Rate limit exceeded', 429, 'RATE_LIMIT'), requestId);
    }

    // Validate query parameters
    const queryValidation = validateQueryParams<GetProductsQuery>(
      request,
      ProductValidator.getProductsSchema
    );

    if (!queryValidation.success) {
      return handleApiError(queryValidation.error, requestId);
    }

    // Get products using service
    const productService = new ProductService();
    const result = await productService.getProducts(queryValidation.data, {
      requestId,
    });

    const duration = Date.now() - startTime;
    logger.info('Products fetched successfully', { 
      requestId, 
      count: result.products.length,
      duration 
    });

    return createSuccessResponse(
      result,
      'Products fetched successfully',
      200,
      requestId
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Products fetch failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration 
    });

    return handleApiError(error, requestId);
  }
}