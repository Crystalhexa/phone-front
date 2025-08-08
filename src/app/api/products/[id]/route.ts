import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types/customer'
import { initDatabase, query, transaction } from '@/lib/database/connection'
import z from 'zod'

// Types based on your schema
interface ProductDetails {
  id: string
  name: string
  model: string | null
  description: string | null
  subcategory_id: string | null
  brand_id: string | null
  sku: string
  warranty_period: number | null
  low_stock_threshold: number | null
  wholesale_quantity: number | null
  is_active: boolean
  is_unique: boolean
  created_at: string
  updated_at: string
  // Joined data
  category_id: string | null
  category_name: string | null
  brand_name: string | null
  subcategory_name: string | null
  specifications: ProductSpecification[]
  barcodes: Barcodes[]
}

interface Barcodes {
  id: string
  code: string
}

interface ProductSpecification {
  id: string
  spec_name: string
  spec_value: string
}

interface ProductBarcode {
  id: string
  code: string
}

// Initialize database connection
let dbInitialized = false

async function ensureDbInit() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

// Validation schemas
const productSpecificationSchema = z.object({
  id: z.string().min(1,'Specification is min'),
  spec_name: z.string().min(1, 'Specification name is required').max(255, 'Specification name too long'),
  spec_value: z.string().min(1, 'Specification value is required')
})

const productBarcodeSchema = z.object({
  id: z.string().min(5,'Barcode is min 5').max(100,"Barcode is to long"),
  code: z.string().min(1, 'Barcode is required').max(255, 'Barcode too long')
})

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name too long'),
  model: z.string().max(255, 'Model name too long').optional(),
  description: z.string().optional(),
  subcategory_id: z.string().cuid('Subcategory ID must be a valid UUID'),
  brand_id: z.string().cuid('Brand ID must be a valid UUID').optional(),
  sku: z.string().min(1, 'SKU is required').max(255, 'SKU too long'),
  warranty_period: z.number().int().min(0, 'Warranty period must be non-negative').optional(),
  wholesale_quantity: z.number().int().min(0, 'Wholesale quantity must be non-negative').optional(),
  is_active: z.boolean().default(true),
  is_unique: z.boolean().default(false),
  low_stock_threshold: z.number().int().min(0, 'Low stock threshold must be non-negative').optional(),
  specifications: z.array(productSpecificationSchema).optional(),
  barcodes: z.array(productBarcodeSchema).optional()
})

// Helper functions
async function validateProductExists(productId: string, client?: any): Promise<boolean> {
  const result = client 
    ? await client.query('SELECT 1 FROM products WHERE id = $1', [productId])
    : await query('SELECT 1 FROM products WHERE id = $1', [productId])
  return result.rows.length > 0
}

async function validateUniqueFields(productId: string, sku: string, client?: any): Promise<string[]> {
  const errors: string[] = []
  
  // Check SKU uniqueness
  const skuResult = client
    ? await client.query('SELECT id FROM products WHERE sku = $1 AND id != $2', [sku, productId])
    : await query('SELECT id FROM products WHERE sku = $1 AND id != $2', [sku, productId])
  
  if (skuResult.rows.length > 0) {
    errors.push(`SKU '${sku}' is already in use by another product`)
  }
  
  return errors
}

async function updateProductRecord(productId: string, data: z.infer<typeof updateProductSchema>, client: any): Promise<void> {
  const updateQuery = `
    UPDATE products SET
      name = $1,
      model = $2,
      description = $3,
      subcategory_id = $4,
      brand_id = $5,
      sku = $6,
      warranty_period = $7,
      wholesale_quantity = $8,
      is_active = $9,
      is_unique = $10,
      low_stock_threshold = $11,
      updated_at = NOW()
    WHERE id = $12
  `

  const updateParams = [
    data.name,
    data.model || null,
    data.description || null,
    data.subcategory_id,
    data.brand_id || null,
    data.sku,
    data.warranty_period || null,
    data.wholesale_quantity || null,
    data.is_active,
    data.is_unique,
    data.low_stock_threshold || null,
    productId
  ]

  await client.query(updateQuery, updateParams)
}

async function updateProductSpecifications(productId: string, specifications: ProductSpecification[] = [], client: any): Promise<void> {
  // Delete existing specifications
  await client.query('DELETE FROM product_specifications WHERE product_id = $1', [productId])

  // Insert new specifications if any
  if (specifications.length > 0) {
    const insertQuery = `
      INSERT INTO product_specifications (id, product_id, spec_name, spec_value)
      VALUES ($1, $2, $3, $4)
    `
    
    for (const spec of specifications) {
      await client.query(insertQuery, [
        spec.id,
        productId,
        spec.spec_name,
        spec.spec_value
      ])
    }
  }
}

async function updateProductBarcodes(productId: string, barcodes: ProductBarcode[] = [], client: any): Promise<void> {
  
  // Delete existing barcodes
  await client.query('DELETE FROM barcodes WHERE product_id = $1', [productId])

  // Insert new barcodes if any
  if (barcodes.length > 0) {
    const insertQuery = `
      INSERT INTO barcodes (id, product_id, code)
      VALUES ($1, $2, $3)
    `
    
    for (const barcode of barcodes) {
      await client.query(insertQuery, [
        barcode.id,
        productId,
        barcode.code
      ])
    }
  }
}

async function getUpdatedProduct(productId: string): Promise<ProductDetails | null> {
  const productQuery = `
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', ps.id,
            'spec_name', ps.spec_name,
            'spec_value', ps.spec_value
          )
        ) FILTER (WHERE ps.id IS NOT NULL), 
        '[]'::json
      ) as specifications,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', b.id,
            'code', b.code
          )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) as barcodes
    FROM products p
    LEFT JOIN product_specifications ps ON p.id = ps.product_id
    LEFT JOIN barcodes b ON p.id = b.product_id
    WHERE p.id = $1
    GROUP BY p.id
  `

  const result = await query(productQuery, [productId], { logQuery: true })
  return result.rows[0] || null
}

function createErrorResponse(message: string, errors?: string[], statusCode: number = 500, duration?: number): NextResponse<ApiResponse<any>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      errors,
      timestamp: new Date().toISOString(),
      metadata: duration ? { query_duration_ms: duration } : undefined
    },
    { status: statusCode }
  )
}

function createSuccessResponse(data: any, message: string = 'Success'): NextResponse<ApiResponse<any>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}

// GET /api/products/[id] - Fetch product details by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ProductDetails>>> {
  const startTime = Date.now()
  
  try {
    await ensureDbInit()
    
    // Await params in Next.js 15
    const { id: productId } = await context.params
    
    // Validate product ID
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Invalid product ID provided',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching product details for ID: ${productId}`)

    // Query to fetch product with all related data
    const productQuery = `
      SELECT 
        p.id,
        p.name,
        p.model,
        p.description,
        p.subcategory_id,
        p.brand_id,
        p.sku,
        p.warranty_period,
        p.low_stock_threshold,
        p.wholesale_quantity,
        p.is_active,
        p.is_unique,
        p.created_at,
        p.updated_at,
        -- Category information
        c.id as category_id,
        c.name as category_name,
        -- Brand information
        b.name as brand_name,
        -- Subcategory information
        sc.name as subcategory_name
      FROM products p
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = $1
    `

    // Query to fetch product specifications
    const specificationsQuery = `
      SELECT 
        id,
        spec_name,
        spec_value
      FROM product_specifications
      WHERE product_id = $1
      ORDER BY spec_name ASC
    `
    
    const barcodesQuery = `
      SELECT 
        id,
        code
      FROM barcodes
      WHERE product_id = $1
      ORDER BY created_at ASC
    `

    // Execute queries concurrently for better performance
    const [productResult, specificationsResult, barcodeResult] = await Promise.all([
      query(productQuery, [productId], { logQuery: true }),
      query(specificationsQuery, [productId], { logQuery: true }),
      query(barcodesQuery, [productId], { logQuery: true })
    ])

    // Check if product exists
    if (productResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `Product with ID '${productId}' not found`,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    const productRow = productResult.rows[0]
    const specifications = specificationsResult.rows
    const barcodes = barcodeResult.rows

    // Transform the data to match your frontend interface
    const productDetails: ProductDetails = {
      id: productRow.id,
      name: productRow.name,
      model: productRow.model,
      description: productRow.description,
      subcategory_id: productRow.subcategory_id,
      brand_id: productRow.brand_id,
      sku: productRow.sku,
      warranty_period: productRow.warranty_period,
      low_stock_threshold: productRow.low_stock_threshold,
      wholesale_quantity: productRow.wholesale_quantity,
      is_active: productRow.is_active,
      is_unique: productRow.is_unique,
      created_at: productRow.created_at,
      updated_at: productRow.updated_at,
      category_id: productRow.category_id,
      category_name: productRow.category_name,
      brand_name: productRow.brand_name,
      subcategory_name: productRow.subcategory_name,
      specifications: specifications.map(spec => ({
        id: spec.id,
        spec_name: spec.spec_name,
        spec_value: spec.spec_value
      })),
      barcodes: barcodes.map(barcode => ({
        id: barcode.id,
        code: barcode.code
      }))
    }

    const duration = Date.now() - startTime

    console.log(`✅ Product details fetched successfully in ${duration}ms`, {
      productId,
      productName: productDetails.name,
      specifications: specifications.length,
      category: productDetails.category_name,
      brand: productDetails.brand_name
    })

    return NextResponse.json(
      {
        success: true,
        data: productDetails,
        message: 'Product details retrieved successfully',
        timestamp: new Date().toISOString(),
        metadata: {
          query_duration_ms: duration,
          specifications_count: specifications.length
        }
      },
      { status: 200 }
    )

  } catch (error: any) {
    const duration = Date.now() - startTime
    const params = await context.params
    
    console.error('❌ Error fetching product details:', {
      error: error.message,
      productId: params.id,
      duration,
      stack: error.stack
    })

    // Handle specific database errors
    let statusCode = 500
    let errorMessage = 'Internal server error occurred while fetching product details'

    if (error.message.includes('invalid input syntax')) {
      statusCode = 400
      errorMessage = 'Invalid product ID format'
    } else if (error.message.includes('connection')) {
      statusCode = 503
      errorMessage = 'Database connection error'
    } else if (error.code === '23505') {
      statusCode = 409
      errorMessage = 'Data conflict error'
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        message: errorMessage,
        errors: process.env.NODE_ENV === 'development' ? [error.message] : null,
        timestamp: new Date().toISOString(),
        metadata: {
          query_duration_ms: duration,
          error_code: error.code || 'UNKNOWN'
        }
      },
      { status: statusCode }
    )
  }
}

// DELETE /api/products/[id] - Delete product (soft delete)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    await ensureDbInit()
    
    // Await params in Next.js 15
    const { id: productId } = await context.params

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Invalid product ID provided',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Check if product exists
    const existsResult = await query(
      'SELECT id FROM products WHERE id = $1',
      [productId]
    )

    if (existsResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `Product with ID '${productId}' not found`,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Soft delete by setting is_active to false
    await query(
      'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1',
      [productId]
    )

    console.log(`🗑️ Product soft deleted: ${productId}`)

    return NextResponse.json(
      {
        success: true,
        data: { deleted: true },
        message: 'Product deleted successfully',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('❌ Error deleting product:', error.message)

    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Internal server error occurred while deleting product',
        errors: process.env.NODE_ENV === 'development' ? [error.message] : null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ProductDetails>>> {
  const startTime = Date.now()
  
  try {
    // Ensure database is initialized
    await initDatabase()
    
    // Await params before accessing properties (Next.js 15 requirement)
    const { id: productId } = await context.params
    
    // Validate product ID parameter
    if (!productId?.trim() || typeof productId !== 'string') {
      return createErrorResponse('Invalid or missing product ID', ['Product ID must be a valid string'], 400)
    }

    console.log(`🔄 Updating product with ID: ${productId}`)

    // Parse and validate request body
    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', ['Request body must be valid JSON'], 400)
    }

    console.log('📝 Request body received:', JSON.stringify(requestBody, null, 2))

    // Validate request data against schema
    const validationResult = updateProductSchema.safeParse(requestBody)
    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      )
      console.error('❌ Validation errors:', validationErrors)
      return createErrorResponse('Validation failed', validationErrors, 400)
    }

    const validatedData = validationResult.data

    // Perform all operations within a transaction
    await transaction(async (client) => {
      // Check if product exists
      const exists = await validateProductExists(productId, client)
      if (!exists) {
        throw new Error(`PRODUCT_NOT_FOUND:Product with ID '${productId}' not found`)
      }

      // Validate unique constraints
      const uniqueErrors = await validateUniqueFields(productId, validatedData.sku, client)
      if (uniqueErrors.length > 0) {
        throw new Error(`VALIDATION_ERROR:${uniqueErrors.join('; ')}`)
      }

      // Update product record
      await updateProductRecord(productId, validatedData, client)

      // Update specifications if provided
      if (validatedData.specifications !== undefined) {
        console.log(`🔄 Updating ${validatedData.specifications.length} specifications`)
        await updateProductSpecifications(productId, validatedData.specifications, client)
      }

      // Update barcodes if provided
      if (validatedData.barcodes !== undefined) {
        console.log(`🔄 Updating ${validatedData.barcodes.length} barcodes`)
        await updateProductBarcodes(productId, validatedData.barcodes, client)
      }
    }, { timeout: 60000, logQuery: true })

    // Fetch the updated product details
    const productDetails = await getUpdatedProduct(productId)
    if (!productDetails) {
      return createErrorResponse('Failed to retrieve updated product', undefined, 500)
    }

    console.log(`✅ Product updated successfully: ${productId}`)
    return createSuccessResponse(productDetails, 'Product updated successfully')

  } catch (error: any) {
    const duration = Date.now() - startTime
    const params = await context.params
    
    console.error('❌ Error updating product:', {
      error: error.message,
      productId: params.id,
      duration,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })

    // Handle specific error types
    if (error.message.startsWith('PRODUCT_NOT_FOUND:')) {
      return createErrorResponse(
        error.message.replace('PRODUCT_NOT_FOUND:', ''),
        undefined,
        404,
        duration
      )
    }

    if (error.message.startsWith('VALIDATION_ERROR:')) {
      return createErrorResponse(
        'Validation failed',
        [error.message.replace('VALIDATION_ERROR:', '')],
        400,
        duration
      )
    }

    // Database-specific errors
    if (error.code === '23505') {
      return createErrorResponse(
        'Duplicate data conflict',
        ['A record with this data already exists'],
        409,
        duration
      )
    }

    if (error.code === '23503') {
      return createErrorResponse(
        'Foreign key constraint violation',
        ['Referenced record does not exist'],
        400,
        duration
      )
    }

    if (error.code === '23514') {
      return createErrorResponse(
        'Check constraint violation',
        ['Data violates database constraints'],
        400,
        duration
      )
    }

    if (error.message.includes('invalid input syntax') || error.code === '22P02') {
      return createErrorResponse(
        'Invalid data format',
        process.env.NODE_ENV === 'development' ? [error.message] : undefined,
        400,
        duration
      )
    }

    if (error.message.includes('connection') || error.code === 'ECONNREFUSED') {
      return createErrorResponse(
        'Database connection error',
        undefined,
        503,
        duration
      )
    }

    if (error.message.includes('timeout')) {
      return createErrorResponse(
        'Request timeout',
        ['Operation took too long to complete'],
        408,
        duration
      )
    }

    // Generic server error
    return createErrorResponse(
      'Internal server error occurred while updating product',
      process.env.NODE_ENV === 'development' ? [error.message] : undefined,
      500,
      duration
    )
  }
}