import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { ProductService } from '@/lib/services/ProductService';
import { ProductValidator } from '@/lib/validations/ProductValidator';
import { ApiError } from '@/lib/type/api';
import { CreateProductRequest } from '@/lib/type/product';
import { createSuccessResponse, handleApiError } from '@/lib/utils/apiHelpers';
import { logger } from '@/lib/utils/logger';
import { validateRequestBody } from '@/lib/utils/validation';

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

import { initDatabase, query } from '@/lib/database/connection';
import { z } from 'zod';

// Zod schema for query parameters validation
const queryParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  page: z.coerce.number().min(1).default(1),
  search: z.string().nullable().optional(),
  sortBy: z.enum(['name', 'id', 'created_at', 'updated_at']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  category_id: z.string().nullable().optional(),
  subcategory_id: z.string().nullable().optional(),
  brand_id: z.string().nullable().optional(),
  include_variations: z.enum(['true', 'false']).default('false'),
  include_attributes: z.enum(['true', 'false']).default('false'),
  include_stock: z.enum(['true', 'false']).default('false'),
  stock_filter: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).default('all'),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// GET handler — list products with flexible filtering and includes
export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const params = queryParamsSchema.parse({
      limit: searchParams.get('limit'),
      page: searchParams.get('page'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      category_id: searchParams.get('category_id'),
      subcategory_id: searchParams.get('subcategory_id'),
      brand_id: searchParams.get('brand_id'),
      include_variations: searchParams.get('include_variations'),
      include_attributes: searchParams.get('include_attributes'),
      include_stock: searchParams.get('include_stock'),
      stock_filter: searchParams.get('stock_filter'),
      price_min: searchParams.get('price_min'),
      price_max: searchParams.get('price_max'),
    });

    const offset = (params.page - 1) * params.limit;

    // Build base query
    let baseQuery = `
      WITH filtered_products AS (
        SELECT DISTINCT
          p.id, 
          p.name, 
          p.description, 
          p.subcategory_id, 
          p.brand_id,
          p.created_at, 
          p.updated_at,
          s.name as subcategory_name,
          c.id as category_id,
          c.name as category_name,
          b.name as brand_name,
          b.code as brand_code,
          b.logo_url as brand_logo,
          COUNT(*) OVER() AS total_count
        FROM products p
        LEFT JOIN subcategories s ON p.subcategory_id = s.id
        LEFT JOIN categories c ON s.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
    `;

    // Build WHERE conditions
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 0;

    // Search filter
    if (params.search) {
      paramCount++;
      whereConditions.push(`(
        p.name ILIKE $${paramCount} OR 
        p.description ILIKE $${paramCount} OR 
        b.name ILIKE $${paramCount} OR 
        s.name ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount}
      )`);
      queryParams.push(`%${params.search}%`);
    }

    // Category filter
    if (params.category_id) {
      paramCount++;
      whereConditions.push(`c.id = $${paramCount}`);
      queryParams.push(params.category_id);
    }

    // Subcategory filter
    if (params.subcategory_id) {
      paramCount++;
      whereConditions.push(`p.subcategory_id = $${paramCount}`);
      queryParams.push(params.subcategory_id);
    }

    // Brand filter
    if (params.brand_id) {
      paramCount++;
      whereConditions.push(`p.brand_id = $${paramCount}`);
      queryParams.push(params.brand_id);
    }

    // Stock filter (requires joining with variations)
    if (params.stock_filter !== 'all') {
      baseQuery += ` LEFT JOIN product_variations pv ON p.id = pv.product_id`;
      
      switch (params.stock_filter) {
        case 'in_stock':
          whereConditions.push(`pv.stock_quantity > pv.low_stock_threshold`);
          break;
        case 'low_stock':
          whereConditions.push(`pv.stock_quantity > 0 AND pv.stock_quantity <= pv.low_stock_threshold`);
          break;
        case 'out_of_stock':
          whereConditions.push(`pv.stock_quantity = 0`);
          break;
      }
    }

    // Price filter (requires joining with variations)
    if (params.price_min !== undefined || params.price_max !== undefined) {
      if (!params.stock_filter || params.stock_filter === 'all') {
        baseQuery += ` LEFT JOIN product_variations pv ON p.id = pv.product_id`;
      }
      
      if (params.price_min !== undefined) {
        paramCount++;
        whereConditions.push(`pv.retail_price >= $${paramCount}`);
        queryParams.push(params.price_min);
      }
      
      if (params.price_max !== undefined) {
        paramCount++;
        whereConditions.push(`pv.retail_price <= $${paramCount}`);
        queryParams.push(params.price_max);
      }
    }

    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY and pagination
    paramCount += 2;
    baseQuery += `
        ORDER BY p.${params.sortBy} ${params.sortOrder}
        LIMIT $${paramCount - 1} OFFSET $${paramCount}
      )
      SELECT * FROM filtered_products
    `;

    queryParams.push(params.limit, offset);

    // Execute main query
    const result = await query(baseQuery, queryParams);
    const products = result.rows;
    const total = products.length > 0 ? parseInt(products[0].total_count, 10) : 0;

    // Clean up the total_count from results
    const cleanProducts = products.map(({ total_count, ...rest }) => rest);

    // Fetch additional data if requested
    if (params.include_variations === 'true' || params.include_attributes === 'true' || params.include_stock === 'true') {
      await enrichProductData(cleanProducts, params);
    }

    return NextResponse.json({
      success: true,
      data: {
        products: cleanProducts,
        total,
        limit: params.limit,
        page: params.page,
        totalPages: Math.ceil(total / params.limit),
        filters: {
          search: params.search,
          category_id: params.category_id,
          subcategory_id: params.subcategory_id,
          brand_id: params.brand_id,
          stock_filter: params.stock_filter,
          price_range: {
            min: params.price_min,
            max: params.price_max
          }
        }
      },
      message: 'Products retrieved successfully',
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Product fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid query parameters',
        data: null,
        errors: error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve products',
      data: null,
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500, headers: corsHeaders });
  }
}

// Helper function to enrich product data with variations, attributes, and stock info
async function enrichProductData(products: any[], params: any) {
  const productIds = products.map(p => p.id);
  
  if (productIds.length === 0) return;

  // Fetch variations if requested
  if (params.include_variations === 'true') {
    const variationsQuery = `
      SELECT 
        pv.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary
            ) ORDER BY pi.is_primary DESC, pi.created_at
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'::json
        ) as images,
        COALESCE(
          json_agg(
            json_build_object(
              'id', bc.id,
              'code', bc.code,
              'type', bc.type,
              'is_active', bc.is_active
            )
          ) FILTER (WHERE bc.id IS NOT NULL), 
          '[]'::json
        ) as barcodes
      FROM product_variations pv
      LEFT JOIN product_images pi ON pv.id = pi.variation_id
      LEFT JOIN barcodes bc ON pv.id = bc.variation_id
      WHERE pv.product_id = ANY($1)
      GROUP BY pv.id
      ORDER BY pv.created_at
    `;

    const variationsResult = await query(variationsQuery, [productIds]);
    const variationsByProduct = variationsResult.rows.reduce((acc, variation) => {
      if (!acc[variation.product_id]) acc[variation.product_id] = [];
      acc[variation.product_id].push(variation);
      return acc;
    }, {});

    products.forEach(product => {
      product.variations = variationsByProduct[product.id] || [];
    });
  }

  // Fetch attributes if requested
  if (params.include_attributes === 'true') {
    const attributesQuery = `
      SELECT 
        pa.product_id,
        json_agg(
          json_build_object(
            'id', a.id,
            'name', a.name,
            'description', a.description
          ) ORDER BY a.name
        ) as attributes
      FROM product_attributes pa
      JOIN attributes a ON pa.attribute_id = a.id
      WHERE pa.product_id = ANY($1)
      GROUP BY pa.product_id
    `;

    const attributesResult = await query(attributesQuery, [productIds]);
    const attributesByProduct = attributesResult.rows.reduce((acc, item) => {
      acc[item.product_id] = item.attributes;
      return acc;
    }, {});

    products.forEach(product => {
      product.attributes = attributesByProduct[product.id] || [];
    });
  }

  // Fetch stock information if requested
  if (params.include_stock === 'true') {
    const stockQuery = `
      SELECT 
        pv.product_id,
        SUM(pv.stock_quantity) as total_stock,
        MIN(pv.stock_quantity) as min_variation_stock,
        MAX(pv.stock_quantity) as max_variation_stock,
        AVG(pv.retail_price) as avg_price,
        MIN(pv.retail_price) as min_price,
        MAX(pv.retail_price) as max_price,
        COUNT(pv.id) as variation_count,
        COUNT(CASE WHEN pv.stock_quantity = 0 THEN 1 END) as out_of_stock_variations,
        COUNT(CASE WHEN pv.stock_quantity <= pv.low_stock_threshold AND pv.stock_quantity > 0 THEN 1 END) as low_stock_variations
      FROM product_variations pv
      WHERE pv.product_id = ANY($1)
      GROUP BY pv.product_id
    `;

    const stockResult = await query(stockQuery, [productIds]);
    const stockByProduct = stockResult.rows.reduce((acc, item) => {
      acc[item.product_id] = {
        total_stock: parseInt(item.total_stock),
        min_variation_stock: parseInt(item.min_variation_stock),
        max_variation_stock: parseInt(item.max_variation_stock),
        avg_price: parseFloat(item.avg_price),
        min_price: parseFloat(item.min_price),
        max_price: parseFloat(item.max_price),
        variation_count: parseInt(item.variation_count),
        out_of_stock_variations: parseInt(item.out_of_stock_variations),
        low_stock_variations: parseInt(item.low_stock_variations),
        stock_status: getStockStatus(item)
      };
      return acc;
    }, {});

    products.forEach(product => {
      product.stock_info = stockByProduct[product.id] || null;
    });
  }
}

// Helper function to determine stock status
function getStockStatus(stockData: any): string {
  const totalStock = parseInt(stockData.total_stock);
  const outOfStockVariations = parseInt(stockData.out_of_stock_variations);
  const lowStockVariations = parseInt(stockData.low_stock_variations);
  const variationCount = parseInt(stockData.variation_count);

  if (totalStock === 0) return 'OUT_OF_STOCK';
  if (outOfStockVariations === variationCount) return 'OUT_OF_STOCK';
  if (lowStockVariations > 0) return 'LOW_STOCK';
  return 'IN_STOCK';
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}