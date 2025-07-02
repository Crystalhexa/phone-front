/**
 * GET /api/products - DEBUG VERSION
 * Retrieves products with pagination and search
 */

import { initDatabase, query } from '@/lib/database/connection';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

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
    console.log('🔍 Starting product fetch...');
    
    await initDatabase();
    console.log('✅ Database initialized');

    const { searchParams } = new URL(request.url);
    console.log('📝 Raw search params:', Object.fromEntries(searchParams.entries()));
    
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

    console.log('✅ Parsed params:', params);

    const offset = (params.page - 1) * params.limit;
    console.log(`📊 Pagination: limit=${params.limit}, offset=${offset}`);

    // First, let's check if we have any products at all
    const countQuery = 'SELECT COUNT(*) as total FROM products';
    const countResult = await query(countQuery, []);
    const totalProducts = parseInt(countResult.rows[0].total);
    console.log(`📈 Total products in database: ${totalProducts}`);

    if (totalProducts === 0) {
      console.log('⚠️ No products found in database');
      return NextResponse.json({
        success: true,
        data: {
          products: [],
          total: 0,
          limit: params.limit,
          page: params.page,
          totalPages: 0,
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
        message: 'No products found in database',
        timestamp: new Date().toISOString(),
      }, { headers: corsHeaders });
    }

    // Build base query with better error handling
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
          COALESCE(s.name, 'No Subcategory') as subcategory_name,
          COALESCE(c.id, '') as category_id,
          COALESCE(c.name, 'No Category') as category_name,
          COALESCE(b.name, 'No Brand') as brand_name,
          COALESCE(b.code, '') as brand_code,
          COALESCE(b.logo_url, '') as brand_logo,
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
        COALESCE(b.name, '') ILIKE $${paramCount} OR 
        COALESCE(s.name, '') ILIKE $${paramCount} OR
        COALESCE(c.name, '') ILIKE $${paramCount}
      )`);
      queryParams.push(`%${params.search}%`);
      console.log(`🔍 Search filter: "${params.search}"`);
    }

    // Category filter
    if (params.category_id) {
      paramCount++;
      whereConditions.push(`c.id = $${paramCount}`);
      queryParams.push(params.category_id);
      console.log(`📂 Category filter: ${params.category_id}`);
    }

    // Subcategory filter
    if (params.subcategory_id) {
      paramCount++;
      whereConditions.push(`p.subcategory_id = $${paramCount}`);
      queryParams.push(params.subcategory_id);
      console.log(`📁 Subcategory filter: ${params.subcategory_id}`);
    }

    // Brand filter
    if (params.brand_id) {
      paramCount++;
      whereConditions.push(`p.brand_id = $${paramCount}`);
      queryParams.push(params.brand_id);
      console.log(`🏷️ Brand filter: ${params.brand_id}`);
    }

    // Stock filter (requires joining with variations)
    let hasVariationJoin = false;
    if (params.stock_filter !== 'all') {
      baseQuery += ` LEFT JOIN product_variations pv ON p.id = pv.product_id`;
      hasVariationJoin = true;
      
      switch (params.stock_filter) {
        case 'in_stock':
          whereConditions.push(`pv.stock_quantity > COALESCE(pv.low_stock_threshold, 0)`);
          break;
        case 'low_stock':
          whereConditions.push(`pv.stock_quantity > 0 AND pv.stock_quantity <= COALESCE(pv.low_stock_threshold, 0)`);
          break;
        case 'out_of_stock':
          whereConditions.push(`COALESCE(pv.stock_quantity, 0) = 0`);
          break;
      }
      console.log(`📦 Stock filter: ${params.stock_filter}`);
    }

    // Price filter (requires joining with variations)
    if (params.price_min !== undefined || params.price_max !== undefined) {
      if (!hasVariationJoin) {
        baseQuery += ` LEFT JOIN product_variations pv ON p.id = pv.product_id`;
        hasVariationJoin = true;
      }
      
      if (params.price_min !== undefined) {
        paramCount++;
        whereConditions.push(`COALESCE(pv.retail_price, 0) >= $${paramCount}`);
        queryParams.push(params.price_min);
        console.log(`💰 Min price filter: ${params.price_min}`);
      }
      
      if (params.price_max !== undefined) {
        paramCount++;
        whereConditions.push(`COALESCE(pv.retail_price, 0) <= $${paramCount}`);
        queryParams.push(params.price_max);
        console.log(`💰 Max price filter: ${params.price_max}`);
      }
    }

    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
      console.log(`🔍 WHERE conditions: ${whereConditions.join(' AND ')}`);
    }

    // Validate sortBy column exists
    const validSortColumns = ['name', 'id', 'created_at', 'updated_at'];
    const sortColumn = validSortColumns.includes(params.sortBy) ? params.sortBy : 'name';
    
    // Add ORDER BY and pagination
    paramCount += 2;
    baseQuery += `
        ORDER BY p.${sortColumn} ${params.sortOrder}
        LIMIT $${paramCount - 1} OFFSET $${paramCount}
      )
      SELECT * FROM filtered_products
    `;

    queryParams.push(params.limit, offset);

    console.log('🔍 Final query:', baseQuery);
    console.log('🔍 Query params:', queryParams);

    // Execute main query
    const result = await query(baseQuery, queryParams);
    console.log(`📊 Query returned ${result.rows.length} rows`);

    const products = result.rows;
    const total = products.length > 0 ? parseInt(products[0].total_count, 10) : 0;

    console.log(`📈 Total filtered products: ${total}`);

    // Clean up the total_count from results
    const cleanProducts = products.map(({ total_count, ...rest }) => rest);

    // Fetch additional data if requested
    if (params.include_variations === 'true' || params.include_attributes === 'true' || params.include_stock === 'true') {
      console.log('🔄 Enriching product data...');
      await enrichProductData(cleanProducts, params);
    }

    console.log('✅ Final products:', cleanProducts);

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
        },
        debug: {
          totalProductsInDB: totalProducts,
          hasFilters: whereConditions.length > 0,
          appliedFilters: whereConditions,
          queryParams: queryParams
        }
      },
      message: 'Products retrieved successfully',
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Product fetch error:', error);
    console.error('❌ Error stack:', error.stack);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Zod validation errors:', error.errors);
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
  
  if (productIds.length === 0) {
    console.log('⚠️ No products to enrich');
    return;
  }

  console.log(`🔄 Enriching ${productIds.length} products...`);

  // Fetch variations if requested
  if (params.include_variations === 'true') {
    console.log('📸 Fetching variations...');
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

    try {
      const variationsResult = await query(variationsQuery, [productIds]);
      console.log(`📸 Found ${variationsResult.rows.length} variations`);
      
      const variationsByProduct = variationsResult.rows.reduce((acc, variation) => {
        if (!acc[variation.product_id]) acc[variation.product_id] = [];
        acc[variation.product_id].push(variation);
        return acc;
      }, {});

      products.forEach(product => {
        product.variations = variationsByProduct[product.id] || [];
      });
    } catch (error) {
      console.error('❌ Error fetching variations:', error);
    }
  }

  // Fetch attributes if requested
  if (params.include_attributes === 'true') {
    console.log('🏷️ Fetching attributes...');
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

    try {
      const attributesResult = await query(attributesQuery, [productIds]);
      console.log(`🏷️ Found attributes for ${attributesResult.rows.length} products`);
      
      const attributesByProduct = attributesResult.rows.reduce((acc, item) => {
        acc[item.product_id] = item.attributes;
        return acc;
      }, {});

      products.forEach(product => {
        product.attributes = attributesByProduct[product.id] || [];
      });
    } catch (error) {
      console.error('❌ Error fetching attributes:', error);
    }
  }

  // Fetch stock information if requested
  if (params.include_stock === 'true') {
    console.log('📦 Fetching stock info...');
    const stockQuery = `
      SELECT 
        pv.product_id,
        SUM(COALESCE(pv.stock_quantity, 0)) as total_stock,
        MIN(COALESCE(pv.stock_quantity, 0)) as min_variation_stock,
        MAX(COALESCE(pv.stock_quantity, 0)) as max_variation_stock,
        AVG(COALESCE(pv.retail_price, 0)) as avg_price,
        MIN(COALESCE(pv.retail_price, 0)) as min_price,
        MAX(COALESCE(pv.retail_price, 0)) as max_price,
        COUNT(pv.id) as variation_count,
        COUNT(CASE WHEN COALESCE(pv.stock_quantity, 0) = 0 THEN 1 END) as out_of_stock_variations,
        COUNT(CASE WHEN COALESCE(pv.stock_quantity, 0) <= COALESCE(pv.low_stock_threshold, 0) AND COALESCE(pv.stock_quantity, 0) > 0 THEN 1 END) as low_stock_variations
      FROM product_variations pv
      WHERE pv.product_id = ANY($1)
      GROUP BY pv.product_id
    `;

    try {
      const stockResult = await query(stockQuery, [productIds]);
      console.log(`📦 Found stock info for ${stockResult.rows.length} products`);
      
      const stockByProduct = stockResult.rows.reduce((acc, item) => {
        acc[item.product_id] = {
          total_stock: parseInt(item.total_stock) || 0,
          min_variation_stock: parseInt(item.min_variation_stock) || 0,
          max_variation_stock: parseInt(item.max_variation_stock) || 0,
          avg_price: parseFloat(item.avg_price) || 0,
          min_price: parseFloat(item.min_price) || 0,
          max_price: parseFloat(item.max_price) || 0,
          variation_count: parseInt(item.variation_count) || 0,
          out_of_stock_variations: parseInt(item.out_of_stock_variations) || 0,
          low_stock_variations: parseInt(item.low_stock_variations) || 0,
          stock_status: getStockStatus(item)
        };
        return acc;
      }, {});

      products.forEach(product => {
        product.stock_info = stockByProduct[product.id] || null;
      });
    } catch (error) {
      console.error('❌ Error fetching stock info:', error);
    }
  }
}

// Helper function to determine stock status
function getStockStatus(stockData: any): string {
  const totalStock = parseInt(stockData.total_stock) || 0;
  const outOfStockVariations = parseInt(stockData.out_of_stock_variations) || 0;
  const lowStockVariations = parseInt(stockData.low_stock_variations) || 0;
  const variationCount = parseInt(stockData.variation_count) || 0;

  if (totalStock === 0 || outOfStockVariations === variationCount) return 'OUT_OF_STOCK';
  if (lowStockVariations > 0) return 'LOW_STOCK';
  return 'IN_STOCK';
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}