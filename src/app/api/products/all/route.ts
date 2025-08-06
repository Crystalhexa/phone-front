// app/api/products/create/route.ts

import { initDatabase, query, transaction } from '@/lib/database/connection'
import cuid from 'cuid'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ========== CORS Headers ==========
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ========== Validation Schema ==========
const specificationSchema = z.object({
  spec_name: z.string().min(1, 'Specification name is required').max(100, 'Specification name too long'),
  spec_value: z.string().min(1, 'Specification value is required').max(255, 'Specification value too long')
})

const barcodeSchema = z.object({
  code: z.string().min(1, 'Barcode code is required').max(50, 'Barcode code too long')
})

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name too long'),
  model: z.string().max(255, 'Product model too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  subcategory_id: z.string().optional(),
  brand_id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required').max(1000, 'SKU too long'),
  warranty_period: z.number().int().min(0, 'Warranty period must be positive').optional(),
  is_active: z.boolean().default(true),
  is_unique: z.boolean(),
  wholesale_quantity: z.number().int().min(1, 'wholwholesale quantity must be positive').optional(),
  low_stock_threshold: z.number().min(0, 'Low stock threshold must be at least 0').max(10000, 'Low stock threshold too high').optional(),
  specifications: z.array(specificationSchema).optional(),
  barcodes: z.array(barcodeSchema).optional(),
})

// ========== POST Handler ==========
export async function POST(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: parsed.error.format(),
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders })
    }

    const { name, model, description, subcategory_id, brand_id, sku, warranty_period, is_active, specifications, wholesale_quantity,low_stock_threshold,is_unique,barcodes } = parsed.data

    await initDatabase()

    // Create product with transaction
    const result = await transaction(async (client) => {
      // 1. Create product
      const productId = cuid()
      const productInsertQuery = `
        INSERT INTO products (
          id, name, model, description, subcategory_id, brand_id,low_stock_threshold, sku, 
          warranty_period, is_active,is_unique,wholesale_quantity, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11,$12,NOW(), NOW()) 
        RETURNING id, name, model,low_stock_threshold, sku, description, subcategory_id, brand_id, is_unique,warranty_period, is_active, created_at
      `
      const productResult = await client.query(productInsertQuery, [
        productId,
        name,
        model,
        description || null,
        subcategory_id || null,
        brand_id || null,
        low_stock_threshold || 5, // Default low stock threshold
        sku,
        warranty_period || null,
        is_active,
        is_unique || false,
        wholesale_quantity
      ])

      const product = productResult.rows[0]

      // 2. Create specifications
      const createdSpecifications: any[] = []
      if (specifications && specifications.length > 0) {
        const specInsertQuery = `
          INSERT INTO product_specifications (
            id, product_id, spec_name, spec_value, created_at, updated_at
          ) VALUES ($1, $2, $3, $4,NOW(), NOW()) 
          RETURNING id, spec_name, spec_value
        `

        for (const spec of specifications) {
          const specId = cuid()
          const specResult = await client.query(specInsertQuery, [
            specId,
            productId,
            spec.spec_name,
            spec.spec_value
          ])
          createdSpecifications.push(specResult.rows[0])
        }
      }
      // 3. Create barcodes
      const createdBarcodes: any[] = []
      if(barcodes && barcodes.length > 0) {
        const barcodeInsertQuery = `
          INSERT INTO barcodes (
            id, product_id, code, created_at
          ) VALUES ($1, $2, $3, NOW()) 
          RETURNING id, code
        `
        for (const barcode of barcodes) {
          // Validate barcode uniqueness
          const existingBarcode = await client.query(`
            SELECT id FROM barcodes WHERE code = $1
          `, [barcode.code])

          if (existingBarcode.rows.length > 0) {
            throw new Error(`BARCODE_EXISTS:${barcode.code}`)
          }

          const barcodeId = cuid()
          const barcodeResult = await client.query(barcodeInsertQuery, [
            barcodeId,
            productId,
            barcode.code
          ])
          createdBarcodes.push(barcodeResult.rows[0])
        }
      }
      // 4. Get all active branches
      const { rows: branchRows } = await client.query(`
        SELECT id FROM branches WHERE is_active = true
      `)

      // 5. Create branch_inventory records for all active branches
      let inventoryRecordsCreated = 0
      if (branchRows.length > 0) {
        const inventoryValues = branchRows.map((branch, index) => {
          const baseIndex = index * 9 // 9 parameters per record
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`
        }).join(', ')

        const inventoryParams = branchRows.flatMap(branch => [
          cuid(), // id
          branch.id, // branch_id
          productId, // product_id
          0, // total_quantity
          0, // reserved_quantity
          low_stock_threshold, // low_stock_threshold (default)
          20, // reorder_quantity (default)
          null, // last_restock_date
          null, // last_sale_date
        ])

        await client.query(`
          INSERT INTO branch_inventory (
            id, branch_id, product_id, total_quantity, reserved_quantity,
            low_stock_threshold, reorder_quantity, last_restock_date, last_sale_date
          ) VALUES ${inventoryValues}
        `, inventoryParams)

        inventoryRecordsCreated = branchRows.length
      }

      return {
        ...product,
        specifications: createdSpecifications,
        barcodes: createdBarcodes,
        inventoryRecordsCreated
      }
    })

    return NextResponse.json({
      success: true,
      message: `Product created successfully with inventory initialized across ${result.inventoryRecordsCreated} branches`,
      data: {
        id: result.id,
        name: result.name,
        model: result.model,
        sku: result.sku,
        description: result.description,
        subcategory_id: result.subcategory_id,
        brand_id: result.brand_id,
        warranty_period: result.warranty_period,
        is_active: result.is_active,
        created_at: result.created_at,
        specifications: result.specifications,
        barcodes: result.barcodes,
        inventoryRecordsCreated: result.inventoryRecordsCreated
      },
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders })

  } catch (error: any) {
    // Handle specific business logic errors
    if (error.message === 'SKU_EXISTS') {
      return NextResponse.json({
        success: false,
        message: 'A product with the same SKU already exists.',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders })
    }

    if (error.message.startsWith('BARCODE_EXISTS:')) {
      const duplicateCodes = error.message.split(':')[1]
      return NextResponse.json({
        success: false,
        message: `Barcode codes already exist: ${duplicateCodes}`,
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders })
    }

    // PostgreSQL constraint errors
    if (error.code === '23505') {
      const constraint = error.constraint ?? ''
      let field = 'field'
      let message = 'A product with the same data already exists.'

      if (constraint.includes('sku')) {
        field = 'SKU'
        message = 'A product with the same SKU already exists.'
      } else if (constraint.includes('code')) {
        field = 'barcode'
        message = 'A barcode with the same code already exists.'
      }

      return NextResponse.json({
        success: false,
        message,
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders })
    }

    // Foreign key constraint errors
    if (error.code === '23503') {
      const constraint = error.constraint ?? ''
      let message = 'Invalid reference to related data.'

      if (constraint.includes('brand_id')) {
        message = 'The specified brand does not exist.'
      } else if (constraint.includes('subcategory_id')) {
        message = 'The specified subcategory does not exist.'
      }

      return NextResponse.json({
        success: false,
        message,
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders })
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred while creating the product.',
      data: null,
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500, headers: corsHeaders })
  }
}

interface QueryParams {
  branch_id?: string
  category_id?: string
  subcategory_id?: string
  brand_id?: string
  search?: string
  sku?: string
  barcode?: string
  sort?: 'name' | 'created_at' | 'brand' | 'category'
  order?: 'asc' | 'desc'
  page?: string
  limit?: string
  include_inactive?: string
}

interface ProductResponse {
  id: string
  name: string
  model: string
  description: string | null
  sku: string
  warranty_period: number | null
  is_active: boolean
  created_at: string
  updated_at: string

  brand: {
    id: string
    name: string
    code: string
    logo_url: string | null
  } | null

  subcategory: {
    id: string
    name: string
    category: {
      id: string
      name: string
    }
  } | null

  barcodes: Array<{
    code: string
  }>

  specifications: Array<{
    spec_name: string
    spec_value: string
  }>
}

interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message?: string
  errors?: string[]
  timestamp: string
}

// ================== QUERY BUILDERS ==================
function buildProductQuery(params: QueryParams, offset: number, limit: number): { queryText: string; queryParams: any[] } {
  const queryParams: any[] = []
  let paramIndex = 1

  let queryText = `
    SELECT 
      p.id,
      p.name,
      p.model,
      p.description,
      p.sku,
      p.warranty_period,
      p.is_active,
      p.created_at,
      p.updated_at,
      
      -- Brand info
      CASE WHEN b.id IS NOT NULL THEN
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'logo_url', b.logo_url
        )
      ELSE NULL END as brand,
      
      -- Category info
      CASE WHEN sc.id IS NOT NULL THEN
        jsonb_build_object(
          'id', sc.id,
          'name', sc.name,
          'category', jsonb_build_object(
            'id', c.id,
            'name', c.name
          )
        )
      ELSE NULL END as subcategory
      
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    LEFT JOIN barcodes bc ON p.id = bc.product_id 
    WHERE 1=1
  `

  // Apply filters
  if (params.search) {
    queryText += ` AND (
      LOWER(p.name) LIKE LOWER($${paramIndex}) OR 
      LOWER(p.model) LIKE LOWER($${paramIndex}) OR 
      LOWER(p.sku) LIKE LOWER($${paramIndex})
    )`
    queryParams.push(`%${params.search}%`)
    paramIndex++
  }

  if (params.sku) {
    queryText += ` AND LOWER(p.sku) = LOWER($${paramIndex})`
    queryParams.push(params.sku)
    paramIndex++
  }

  if (params.category_id) {
    queryText += ` AND sc.category_id = $${paramIndex}`
    queryParams.push(params.category_id)
    paramIndex++
  }

  if (params.subcategory_id) {
    queryText += ` AND p.subcategory_id = $${paramIndex}`
    queryParams.push(params.subcategory_id)
    paramIndex++
  }

  if (params.brand_id) {
    queryText += ` AND p.brand_id = $${paramIndex}`
    queryParams.push(params.brand_id)
    paramIndex++
  }

  if (params.barcode) {
    queryText += ` AND bc.code = $${paramIndex}`
    queryParams.push(params.barcode)
    paramIndex++
  }

  if (params.include_inactive !== 'true') {
    queryText += ` AND p.is_active = true`
  }

  // Add ordering
  const sortBy = params.sort || 'created_at'
  const sortOrder = (params.order || 'desc').toUpperCase()

  switch (sortBy) {
    case 'name':
      queryText += ` ORDER BY p.name ${sortOrder}`
      break
    case 'brand':
      queryText += ` ORDER BY b.name ${sortOrder}, p.name ASC`
      break
    case 'category':
      queryText += ` ORDER BY c.name ${sortOrder}, sc.name ${sortOrder}, p.name ASC`
      break
    default:
      queryText += ` ORDER BY p.created_at ${sortOrder}`
  }

  // Add pagination
  queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  queryParams.push(limit, offset)

  return { queryText, queryParams }
}

function buildCountQuery(params: QueryParams): { queryText: string; queryParams: any[] } {
  const queryParams: any[] = []
  let paramIndex = 1

  let queryText = `
    SELECT COUNT(DISTINCT p.id) as count
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    LEFT JOIN barcodes bc ON p.id = bc.product_id 
    WHERE 1=1
  `

  // Apply same filters as main query
  if (params.search) {
    queryText += ` AND (
      LOWER(p.name) LIKE LOWER($${paramIndex}) OR 
      LOWER(p.model) LIKE LOWER($${paramIndex}) OR 
      LOWER(p.sku) LIKE LOWER($${paramIndex})
    )`
    queryParams.push(`%${params.search}%`)
    paramIndex++
  }

  if (params.sku) {
    queryText += ` AND LOWER(p.sku) = LOWER($${paramIndex})`
    queryParams.push(params.sku)
    paramIndex++
  }

  if (params.category_id) {
    queryText += ` AND sc.category_id = $${paramIndex}`
    queryParams.push(params.category_id)
    paramIndex++
  }

  if (params.subcategory_id) {
    queryText += ` AND p.subcategory_id = $${paramIndex}`
    queryParams.push(params.subcategory_id)
    paramIndex++
  }

  if (params.brand_id) {
    queryText += ` AND p.brand_id = $${paramIndex}`
    queryParams.push(params.brand_id)
    paramIndex++
  }

  if (params.barcode) {
    queryText += ` AND bc.code = $${paramIndex}`
    queryParams.push(params.barcode)
    paramIndex++
  }

  if (params.include_inactive !== 'true') {
    queryText += ` AND p.is_active = true`
  }

  return { queryText, queryParams }
}

// ================== RESULT PROCESSORS ==================
async function processProductResults(rows: any[]): Promise<ProductResponse[]> {
  if (rows.length === 0) return []

  const productIds = rows.map(row => row.id)

  // Get additional details in parallel
  const [barcodesMap, specificationsMap] = await Promise.all([
    getProductBarcodes(productIds),
    getProductSpecifications(productIds)
  ])

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    model: row.model,
    description: row.description,
    sku: row.sku,
    warranty_period: row.warranty_period,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    brand: row.brand,
    subcategory: row.subcategory,
    barcodes: barcodesMap.get(row.id) || [],
    specifications: specificationsMap.get(row.id) || []
  }))
}

async function getProductBarcodes(productIds: string[]): Promise<Map<string, any[]>> {
  if (productIds.length === 0) return new Map()

  const barcodeQuery = `
    SELECT 
      product_id,
      code
    FROM barcodes
    WHERE product_id = ANY($1)
    ORDER BY created_at DESC
  `

  const result = await query(barcodeQuery, [productIds])
  const barcodeMap = new Map<string, any[]>()

  result.rows.forEach(row => {
    if (!barcodeMap.has(row.product_id)) {
      barcodeMap.set(row.product_id, [])
    }
    barcodeMap.get(row.product_id)!.push({
      code: row.code
    })
  })

  return barcodeMap
}

async function getProductSpecifications(productIds: string[]): Promise<Map<string, any[]>> {
  if (productIds.length === 0) return new Map()

  const specQuery = `
    SELECT 
      product_id,
      spec_name,
      spec_value
    FROM product_specifications
    WHERE product_id = ANY($1)
    ORDER BY spec_name
  `

  const result = await query(specQuery, [productIds])
  const specMap = new Map<string, any[]>()

  result.rows.forEach(row => {
    if (!specMap.has(row.product_id)) {
      specMap.set(row.product_id, [])
    }
    specMap.get(row.product_id)!.push({
      spec_name: row.spec_name,
      spec_value: row.spec_value
    })
  })

  return specMap
}

// ================== VALIDATION ==================
function validateParams(params: QueryParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate pagination
  if (params.page) {
    const page = parseInt(params.page)
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive integer')
    }
  }

  if (params.limit) {
    const limit = parseInt(params.limit)
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100')
    }
  }

  // Validate sort options (removed 'stock' since we don't fetch stock data)
  const validSortFields = ['name', 'created_at', 'brand', 'category']
  if (params.sort && !validSortFields.includes(params.sort)) {
    errors.push(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`)
  }

  const validSortOrders = ['asc', 'desc']
  if (params.order && !validSortOrders.includes(params.order)) {
    errors.push('Sort order must be asc or desc')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// ================== MAIN API HANDLER ==================
export async function GET(request: NextRequest) {
  try {
    await initDatabase()

    const { searchParams } = new URL(request.url)
    const params: QueryParams = {
      category_id: searchParams.get('category_id') || undefined,
      subcategory_id: searchParams.get('subcategory_id') || undefined,
      brand_id: searchParams.get('brand_id') || undefined,
      search: searchParams.get('search') || undefined,
      sku: searchParams.get('sku') || undefined,
      barcode: searchParams.get('barcode') || undefined,
      sort: (searchParams.get('sort') as any) || 'created_at',
      order: (searchParams.get('order') as any) || 'desc',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '15',
      include_inactive: searchParams.get('include_inactive') || 'false',
    }

    // Validation
    const validation = validateParams(params)
    if (!validation.isValid) {
      const response: ApiResponse = {
        success: false,
        data: null,
        message: 'Validation failed',
        errors: validation.errors,
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(response, { status: 400 })
    }

    const page = parseInt(params.page!)
    const limit = Math.min(parseInt(params.limit!), 100) // Cap at 100
    const offset = (page - 1) * limit

    // Build and execute queries
    const { queryText, queryParams } = buildProductQuery(params, offset, limit)
    const countQuery = buildCountQuery(params)

    // Execute queries in parallel
    const [result, countResult] = await Promise.all([
      query<any>(queryText, queryParams),
      query<{ count: string }>(countQuery.queryText, countQuery.queryParams)
    ])

    const totalCount = parseInt(countResult.rows[0]?.count || '0')

    // Process and structure the results
    const products = await processProductResults(result.rows)

    const response: ApiResponse<{
      products: ProductResponse[]
      pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
        has_next: boolean
        has_prev: boolean
      }
      summary: {
        returned_count: number
        total_count: number
        filters_applied: QueryParams
      }
    }> = {
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit),
          has_next: page < Math.ceil(totalCount / limit),
          has_prev: page > 1
        },
        summary: {
          returned_count: products.length,
          total_count: totalCount,
          filters_applied: params
        }
      },
      message: `Retrieved ${products.length} of ${totalCount} products`,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Products API Error:', error)

    const response: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to fetch products',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 500 })
  }
}