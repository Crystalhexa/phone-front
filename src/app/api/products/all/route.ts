import { initDatabase, query, transaction } from '@/lib/database/connection';
import { NextRequest, NextResponse } from 'next/server';
import cuid from 'cuid';
import { z } from 'zod';

// Validation schemas
const AttributeSchema = z.object({
  attribute_id: z.string().min(1, 'Attribute ID is required'),
});

const VariationAttributeSchema = z.object({
  attribute_id: z.string().min(1, 'Attribute ID is required'),
  attribute_value_id: z.string().min(1, 'Attribute value ID is required'),
});

const VariationSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU must be less than 50 characters'),
  name: z.string().optional(),
  cost_price: z.number().min(0, 'Cost price must be non-negative'),
  wholesale_price: z.number().min(0, 'Wholesale price must be non-negative').optional(),
  retail_price: z.number().min(0, 'Retail price must be non-negative'),
  stock_quantity: z.number().int().min(0, 'Stock quantity must be non-negative'),
  low_stock_threshold: z.number().int().min(0, 'Low stock threshold must be non-negative'),
  warranty_period: z.number().int().min(0, 'Warranty period must be non-negative').optional(),
  barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
  attributes: z.array(VariationAttributeSchema).optional().default([]),
});

const DefaultVariationSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU must be less than 50 characters'),
  cost_price: z.number().min(0, 'Cost price must be non-negative').optional(),
  wholesale_price: z.number().min(0, 'Wholesale price must be non-negative').optional(),
  retail_price: z.number().min(0, 'Retail price must be non-negative').optional(),
  stock_quantity: z.number().int().min(0, 'Stock quantity must be non-negative').optional(),
  low_stock_threshold: z.number().int().min(0, 'Low stock threshold must be non-negative').optional(),
  warranty_period: z.number().int().min(0, 'Warranty period must be non-negative').optional(),
  barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
});

const ProductRequestSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name must be less than 255 characters'),
  description: z.string().optional(),
  subcategory_id: z.string().optional(),
  brand_id: z.string().optional(),
  is_variable: z.boolean(),
  attributes: z.array(AttributeSchema).optional().default([]),
  variations: z.array(VariationSchema).optional().default([]),
  default_variation: DefaultVariationSchema.optional(),
}).refine((data) => {
  // If is_variable is true, variations array must not be empty
  if (data.is_variable && (!data.variations || data.variations.length === 0)) {
    return false;
  }
  // If is_variable is false, default_variation must be provided
  if (!data.is_variable && !data.default_variation) {
    return false;
  }
  return true;
}, {
  message: "Variable products must have variations, non-variable products must have default_variation",
});

// Error response helper
function createErrorResponse(message: string, status: number, errors?: any) {
  return NextResponse.json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  }, { status });
}

// Success response helper
function createSuccessResponse(data: any, message: string, status: number = 200) {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  }, { status });
}

// Database constraint error handler
function handleDatabaseError(error: any) {
  const errorMessage = error.message || '';
  
  // PostgreSQL unique constraint violation
  if (error.code === '23505') {
    if (errorMessage.includes('sku')) {
      return createErrorResponse('SKU already exists. Please use a unique SKU.', 409);
    }
    if (errorMessage.includes('barcode')) {
      return createErrorResponse('Barcode already exists. Please use a unique barcode.', 409);
    }
    return createErrorResponse('Duplicate entry detected. Please check your data.', 409);
  }
  
  // PostgreSQL foreign key constraint violation
  if (error.code === '23503') {
    if (errorMessage.includes('subcategory_id')) {
      return createErrorResponse('Invalid subcategory ID provided.', 400);
    }
    if (errorMessage.includes('brand_id')) {
      return createErrorResponse('Invalid brand ID provided.', 400);
    }
    if (errorMessage.includes('attribute_id')) {
      return createErrorResponse('Invalid attribute ID provided.', 400);
    }
    if (errorMessage.includes('attribute_value_id')) {
      return createErrorResponse('Invalid attribute value ID provided.', 400);
    }
    return createErrorResponse('Invalid reference ID provided.', 400);
  }
  
  // PostgreSQL check constraint violation
  if (error.code === '23514') {
    return createErrorResponse('Data validation failed. Please check your input values.', 400);
  }
  
  // PostgreSQL not null constraint violation
  if (error.code === '23502') {
    return createErrorResponse('Required field is missing.', 400);
  }
  
  // Connection or timeout errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return createErrorResponse('Database connection failed. Please try again later.', 503);
  }
  
  console.error('❌ Unhandled database error:', error);
  return createErrorResponse('An unexpected database error occurred.', 500);
}

export async function POST(request: NextRequest) {
  try {
    // Initialize database connection
    await initDatabase();
  } catch (dbError) {
    console.error('❌ Database initialization failed:', dbError);
    return createErrorResponse('Database connection failed', 503);
  }

  let body: any;
  
  // Parse and validate request body
  try {
    body = await request.json();
  } catch (parseError) {
    return createErrorResponse('Invalid JSON in request body', 400);
  }

  // Validate request data
  const validation = ProductRequestSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse(
      'Validation failed',
      400,
      validation.error.format()
    );
  }

  const validatedData = validation.data;
  const productId = cuid();

  try {
    // Check for duplicate SKUs before insertion
    const skusToCheck: string[] = [];
    
    if (validatedData.is_variable) {
      skusToCheck.push(...validatedData.variations.map(v => v.sku));
    } else if (validatedData.default_variation) {
      skusToCheck.push(validatedData.default_variation.sku);
    }

    if (skusToCheck.length > 0) {
      const existingSkus = await query(
        'SELECT sku FROM product_variations WHERE sku = ANY($1)',
        [skusToCheck]
      );
      
      if (existingSkus.rows.length > 0) {
        const duplicateSkus = existingSkus.rows.map(row => row.sku);
        return createErrorResponse(
          `SKU(s) already exist: ${duplicateSkus.join(', ')}`,
          409
        );
      }
    }

    // Check for duplicate barcodes
    const barcodesToCheck: string[] = [];
    
    if (validatedData.is_variable) {
      validatedData.variations.forEach(v => {
        if (v.barcode) barcodesToCheck.push(v.barcode);
      });
    } else if (validatedData.default_variation?.barcode) {
      barcodesToCheck.push(validatedData.default_variation.barcode);
    }

    if (barcodesToCheck.length > 0) {
      const existingBarcodes = await query(
        'SELECT code FROM barcodes WHERE code = ANY($1)',
        [barcodesToCheck]
      );
      
      if (existingBarcodes.rows.length > 0) {
        const duplicateBarcodes = existingBarcodes.rows.map(row => row.code);
        return createErrorResponse(
          `Barcode(s) already exist: ${duplicateBarcodes.join(', ')}`,
          409
        );
      }
    }

    // Validate foreign key references
    if (validatedData.subcategory_id) {
      const subcategoryExists = await query(
        'SELECT id FROM subcategories WHERE id = $1',
        [validatedData.subcategory_id]
      );
      if (subcategoryExists.rows.length === 0) {
        return createErrorResponse('Invalid subcategory ID', 400);
      }
    }

    if (validatedData.brand_id) {
      const brandExists = await query(
        'SELECT id FROM brands WHERE id = $1',
        [validatedData.brand_id]
      );
      if (brandExists.rows.length === 0) {
        return createErrorResponse('Invalid brand ID', 400);
      }
    }

    // Validate attribute IDs
    const allAttributeIds = new Set<string>();
    validatedData.attributes?.forEach(attr => allAttributeIds.add(attr.attribute_id));
    
    if (validatedData.is_variable) {
      validatedData.variations.forEach(variation => {
        variation.attributes?.forEach(attr => {
          allAttributeIds.add(attr.attribute_id);
        });
      });
    }

    if (allAttributeIds.size > 0) {
      const attributeIdsArray = Array.from(allAttributeIds);
      const existingAttributes = await query(
        'SELECT id FROM attributes WHERE id = ANY($1)',
        [attributeIdsArray]
      );
      
      const existingIds = new Set(existingAttributes.rows.map(row => row.id));
      const invalidIds = attributeIdsArray.filter(id => !existingIds.has(id));
      
      if (invalidIds.length > 0) {
        return createErrorResponse(
          `Invalid attribute ID(s): ${invalidIds.join(', ')}`,
          400
        );
      }
    }

    // Validate attribute value IDs
    const allAttributeValueIds = new Set<string>();
    
    if (validatedData.is_variable) {
      validatedData.variations.forEach(variation => {
        variation.attributes?.forEach(attr => {
          allAttributeValueIds.add(attr.attribute_value_id);
        });
      });
    }

    if (allAttributeValueIds.size > 0) {
      const attributeValueIdsArray = Array.from(allAttributeValueIds);
      const existingAttributeValues = await query(
        'SELECT id FROM attribute_values WHERE id = ANY($1)',
        [attributeValueIdsArray]
      );
      
      const existingValueIds = new Set(existingAttributeValues.rows.map(row => row.id));
      const invalidValueIds = attributeValueIdsArray.filter(id => !existingValueIds.has(id));
      
      if (invalidValueIds.length > 0) {
        return createErrorResponse(
          `Invalid attribute value ID(s): ${invalidValueIds.join(', ')}`,
          400
        );
      }
    }

    // Perform database transaction
    await transaction(async (client) => {
      // 1. Insert into products
      await client.query(
        `INSERT INTO products (id, name, description, subcategory_id, brand_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          productId,
          validatedData.name,
          validatedData.description || null,
          validatedData.subcategory_id || null,
          validatedData.brand_id || null,
        ]
      );

      // 2. Insert product-level attributes
      for (const attr of validatedData.attributes || []) {
        await client.query(
          `INSERT INTO product_attributes (id, product_id, attribute_id, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [cuid(), productId, attr.attribute_id]
        );
      }

      // 3. Insert variations
      if (validatedData.is_variable) {
        for (const variation of validatedData.variations) {
          const variationId = cuid();

          await client.query(
            `INSERT INTO product_variations (
              id, product_id, sku, name, cost_price, wholesale_price, retail_price,
              stock_quantity, low_stock_threshold, warranty_period, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [
              variationId,
              productId,
              variation.sku,
              variation.name || null,
              variation.cost_price,
              variation.wholesale_price || null,
              variation.retail_price,
              variation.stock_quantity,
              variation.low_stock_threshold,
              variation.warranty_period || null,
            ]
          );

          // 4. Insert variation attributes
          for (const attr of variation.attributes || []) {
            await client.query(
              `INSERT INTO product_variation_attributes 
                (id, variation_id, attribute_id, attribute_value_id, created_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [cuid(), variationId, attr.attribute_id, attr.attribute_value_id]
            );
          }

          // 5. Insert barcode if provided
          if (variation.barcode) {
            await client.query(
              `INSERT INTO barcodes (id, variation_id, code, type, is_active, created_at)
               VALUES ($1, $2, $3, 'INTERNAL', true, NOW())`,
              [cuid(), variationId, variation.barcode]
            );
          }
        }
      } else {
        // 6. Default variation for non-variable product
        const def = validatedData.default_variation!;
        const defVariationId = cuid();

        await client.query(
          `INSERT INTO product_variations (
            id, product_id, sku, name, cost_price, wholesale_price, retail_price,
            stock_quantity, low_stock_threshold, warranty_period, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            defVariationId,
            productId,
            def.sku,
            validatedData.name,
            def.cost_price || 0,
            def.wholesale_price || null,
            def.retail_price || 0,
            def.stock_quantity || 0,
            def.low_stock_threshold || 5,
            def.warranty_period || null,
          ]
        );

        if (def.barcode) {
          await client.query(
            `INSERT INTO barcodes (id, variation_id, code, type, is_active, created_at)
             VALUES ($1, $2, $3, 'INTERNAL', true, NOW())`,
            [cuid(), defVariationId, def.barcode]
          );
        }
      }
    });

    return createSuccessResponse(
      { productId },
      'Product created successfully',
      201
    );

  } catch (error: any) {
    console.error('❌ Product creation failed:', error);
    return handleDatabaseError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
  } catch (dbError) {
    console.error('❌ Database initialization failed:', dbError);
    return createErrorResponse('Database connection failed', 503);
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    
    let page = 1;
    let limit = 10;
    
    if (pageParam) {
      const parsedPage = parseInt(pageParam);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return createErrorResponse('Page must be a positive integer', 400);
      }
      page = parsedPage;
    }
    
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return createErrorResponse('Limit must be between 1 and 100', 400);
      }
      limit = parsedLimit;
    }
    
    const offset = (page - 1) * limit;

    const args: any[] = [limit, offset];
    let whereClause = '';
    if (search.trim()) {
      args.push(`%${search.trim()}%`);
      whereClause = `WHERE p.name ILIKE $3 OR p.description ILIKE $3`;
    }

    // Get products with proper error handling
    const dataQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        COALESCE(s.name, '') AS subcategory_name,
        COALESCE(b.name, '') AS brand_name,
        COUNT(DISTINCT v.id) AS variation_count
      FROM products p
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variations v ON p.id = v.product_id
      ${whereClause}
      GROUP BY p.id, s.name, b.name
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const productsRes = await query(dataQuery, args);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products p
      ${whereClause}
    `;
    const countArgs = search.trim() ? [`%${search.trim()}%`] : [];
    const countRes = await query(countQuery, countArgs);
    const total = parseInt(countRes.rows[0]?.total || '0');

    return createSuccessResponse({
      products: productsRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    }, 'Products fetched successfully');

  } catch (error: any) {
    console.error('❌ Error fetching products:', error);
    return handleDatabaseError(error);
  }
}