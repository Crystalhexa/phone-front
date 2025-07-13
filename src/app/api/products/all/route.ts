// app/api/products/create/route.ts

import { ApiResponse, initDatabase, query, transaction } from '@/lib/database/connection'
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
  spec_value: z.string().min(1, 'Specification value is required').max(255, 'Specification value too long'),
  spec_unit: z.string().max(20, 'Specification unit too long').optional(),
})

const barcodeSchema = z.object({
  code: z.string().min(1, 'Barcode code is required').max(50, 'Barcode code too long'),
  type: z.enum(['INTERNAL', 'EAN13', 'UPC', 'CODE128']).default('INTERNAL'),
  is_active: z.boolean().default(true),
})

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name too long'),
  model: z.string().min(1, 'Product model is required').max(255, 'Product model too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  subcategory_id: z.string().optional(),
  brand_id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
  warranty_period: z.number().int().min(0, 'Warranty period must be positive').optional(),
  is_active: z.boolean().default(true),
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

    const { name, model, description, subcategory_id, brand_id, sku, warranty_period, is_active, specifications, barcodes } = parsed.data

    await initDatabase()

    // Create product with transaction
    const result = await transaction(async (client) => {
      // 3. Create product
      const productId = cuid()
      const productInsertQuery = `
        INSERT INTO products (
          id, name, model, description, subcategory_id, brand_id, sku, 
          warranty_period, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
        RETURNING id, name, model, sku, description, subcategory_id, brand_id, warranty_period, is_active, created_at
      `
      const productResult = await client.query(productInsertQuery, [
        productId,
        name,
        model,
        description || null,
        subcategory_id || null,
        brand_id || null,
        sku,
        warranty_period || null,
        is_active
      ])

      const product = productResult.rows[0]

      // 4. Create specifications
      const createdSpecifications: any[] = []
      if (specifications && specifications.length > 0) {
        const specInsertQuery = `
          INSERT INTO product_specifications (
            id, product_id, spec_name, spec_value, spec_unit, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
          RETURNING id, spec_name, spec_value, spec_unit
        `

        for (const spec of specifications) {
          const specId = cuid()
          const specResult = await client.query(specInsertQuery, [
            specId,
            productId,
            spec.spec_name,
            spec.spec_value,
            spec.spec_unit || null
          ])
          createdSpecifications.push(specResult.rows[0])
        }
      }

      // 5. Create barcodes
      const createdBarcodes: any[] = []
      if (barcodes && barcodes.length > 0) {
        const barcodeInsertQuery = `
          INSERT INTO barcodes (
            id, product_id, code, type, is_active, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW()) 
          RETURNING id, code, type, is_active
        `

        for (const barcode of barcodes) {
          const barcodeId = cuid()
          const barcodeResult = await client.query(barcodeInsertQuery, [
            barcodeId,
            productId,
            barcode.code,
            barcode.type,
            barcode.is_active
          ])
          createdBarcodes.push(barcodeResult.rows[0])
        }
      }

      return {
        ...product,
        specifications: createdSpecifications,
        barcodes: createdBarcodes
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: result,
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

// ========== OPTIONS Handler ==========
export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

// ========== Types ==========
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
  
  // Brand details
  brand: {
    id: string
    name: string
    code: string
    logo_url: string | null
  } | null
  
  // Category details
  subcategory: {
    id: string
    name: string
    category: {
      id: string
      name: string
      description: string | null
    }
  } | null
  
  // Specifications
  specifications: {
    id: string
    spec_name: string
    spec_value: string
    spec_unit: string | null
  }[]
  
  // Barcodes
  barcodes: {
    id: string
    code: string
    type: string
    is_active: boolean
  }[]
  
  // Stock information for the specific branch
  stock: {
    total_quantity: number
    reserved_quantity: number
    available_quantity: number
    low_stock_threshold: number
    reorder_quantity: number
    last_restock_date: string | null
    last_sale_date: string | null
    is_low_stock: boolean
    
    // Batch details with pricing
    batches: {
      id: string
      batch_number: string
      quantity: number
      cost_price: number
      wholesale_price: number | null
      retail_price: number
      expiry_date: string | null
      received_date: string
      supplier_name: string
    }[]
  } | null
  
  // Current pricing (from latest batch or average)
  pricing: {
    cost_price: number
    wholesale_price: number | null
    retail_price: number
    currency: string
  } | null
}

interface QueryParams {
  branch_id?: string
  category_id?: string
  subcategory_id?: string
  brand_id?: string
  search?: string
  sku?: string
  barcode?: string
  sort?: 'name' | 'created_at' | 'updated_at' | 'brand' | 'category'
  order?: 'asc' | 'desc'
  page?: string
  limit?: string
  include_inactive?: string
  low_stock_only?: string
}

// ========== Main API Handler ==========
export async function GET(request: NextRequest) {
  try {
    await initDatabase()
    
    const { searchParams } = new URL(request.url)
    const params: QueryParams = {
      branch_id: searchParams.get('branch_id') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      subcategory_id: searchParams.get('subcategory_id') || undefined,
      brand_id: searchParams.get('brand_id') || undefined,
      search: searchParams.get('search') || undefined,
      sku: searchParams.get('sku') || undefined,
      barcode: searchParams.get('barcode') || undefined,
      sort: (searchParams.get('sort') as any) || 'created_at',
      order: (searchParams.get('order') as any) || 'desc',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
      include_inactive: searchParams.get('include_inactive') || 'false',
      low_stock_only: searchParams.get('low_stock_only') || 'false'
    }

    // Validation
    
    const page = parseInt(params.page!)
    const limit = parseInt(params.limit!)
    const offset = (page - 1) * limit

    // Build the main query
    const { queryText, queryParams } = buildProductQuery(params, offset, limit)
    
    // Execute the main query
    const result = await query<any>(queryText, queryParams)
    
    // Get total count for pagination
    const countQuery = buildCountQuery(params)
    const countResult = await query<{ count: string }>(countQuery.queryText, countQuery.queryParams)
    const totalCount = parseInt(countResult.rows[0]?.count || '0')

    // Process and structure the results
    const products = await processProductResults(result.rows, params.branch_id!)

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
        }
      },
      message: `Retrieved ${products.length} products`,
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

// ========== Query Builder ==========
function buildProductQuery(params: QueryParams, offset: number, limit: number) {
  let queryText = `
    SELECT DISTINCT
      p.id,
      p.name,
      p.model,
      p.description,
      p.sku,
      p.warranty_period,
      p.is_active,
      p.created_at,
      p.updated_at,
      
      -- Brand details
      b.id as brand_id,
      b.name as brand_name,
      b.code as brand_code,
      b.logo_url as brand_logo_url,
      
      -- Category details
      sc.id as subcategory_id,
      sc.name as subcategory_name,
      c.id as category_id,
      c.name as category_name,
      c.description as category_description,
      
      -- Stock details
      bi.total_quantity,
      bi.reserved_quantity,
      bi.low_stock_threshold,
      bi.reorder_quantity,
      bi.last_restock_date,
      bi.last_sale_date,
      
      -- Low stock indicator
      CASE 
        WHEN bi.total_quantity <= bi.low_stock_threshold THEN true 
        ELSE false 
      END as is_low_stock
      
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.branch_id = $1
    LEFT JOIN barcodes bc ON p.id = bc.product_id AND bc.is_active = true
  `

  const queryParams: any[] = [params.branch_id]
  let paramIndex = 2

  // WHERE conditions
  const whereConditions: string[] = []

  // Active products filter
  if (params.include_inactive !== 'true') {
    whereConditions.push('p.is_active = true')
  }

  // Low stock filter
  if (params.low_stock_only === 'true') {
    whereConditions.push('bi.total_quantity <= bi.low_stock_threshold')
  }

  // Category filter
  if (params.category_id) {
    whereConditions.push(`c.id = $${paramIndex}`)
    queryParams.push(params.category_id)
    paramIndex++
  }

  // Subcategory filter
  if (params.subcategory_id) {
    whereConditions.push(`sc.id = $${paramIndex}`)
    queryParams.push(params.subcategory_id)
    paramIndex++
  }

  // Brand filter
  if (params.brand_id) {
    whereConditions.push(`b.id = $${paramIndex}`)
    queryParams.push(params.brand_id)
    paramIndex++
  }

  // SKU exact match
  if (params.sku) {
    whereConditions.push(`p.sku = $${paramIndex}`)
    queryParams.push(params.sku)
    paramIndex++
  }

  // Barcode search
  if (params.barcode) {
    whereConditions.push(`bc.code = $${paramIndex}`)
    queryParams.push(params.barcode)
    paramIndex++
  }

  // General search (name, model, description)
  if (params.search) {
    whereConditions.push(`(
      p.name ILIKE $${paramIndex} OR 
      p.model ILIKE $${paramIndex} OR 
      p.description ILIKE $${paramIndex} OR
      p.sku ILIKE $${paramIndex}
    )`)
    queryParams.push(`%${params.search}%`)
    paramIndex++
  }

  // Add WHERE clause
  if (whereConditions.length > 0) {
    queryText += ' WHERE ' + whereConditions.join(' AND ')
  }

  // ORDER BY
  const sortColumn = getSortColumn(params.sort!)
  queryText += ` ORDER BY ${sortColumn} ${params.order!.toUpperCase()}`

  // PAGINATION
  queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  queryParams.push(limit, offset)

  return { queryText, queryParams }
}

function buildCountQuery(params: QueryParams) {
  let queryText = `
    SELECT COUNT(DISTINCT p.id) as count
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.branch_id = $1
    LEFT JOIN barcodes bc ON p.id = bc.product_id AND bc.is_active = true
  `

  const queryParams: any[] = [params.branch_id]
  let paramIndex = 2

  const whereConditions: string[] = []

  if (params.include_inactive !== 'true') {
    whereConditions.push('p.is_active = true')
  }

  if (params.low_stock_only === 'true') {
    whereConditions.push('bi.total_quantity <= bi.low_stock_threshold')
  }

  if (params.category_id) {
    whereConditions.push(`c.id = $${paramIndex}`)
    queryParams.push(params.category_id)
    paramIndex++
  }

  if (params.subcategory_id) {
    whereConditions.push(`sc.id = $${paramIndex}`)
    queryParams.push(params.subcategory_id)
    paramIndex++
  }

  if (params.brand_id) {
    whereConditions.push(`b.id = $${paramIndex}`)
    queryParams.push(params.brand_id)
    paramIndex++
  }

  if (params.sku) {
    whereConditions.push(`p.sku = $${paramIndex}`)
    queryParams.push(params.sku)
    paramIndex++
  }

  if (params.barcode) {
    whereConditions.push(`bc.code = $${paramIndex}`)
    queryParams.push(params.barcode)
    paramIndex++
  }

  if (params.search) {
    whereConditions.push(`(
      p.name ILIKE $${paramIndex} OR 
      p.model ILIKE $${paramIndex} OR 
      p.description ILIKE $${paramIndex} OR
      p.sku ILIKE $${paramIndex}
    )`)
    queryParams.push(`%${params.search}%`)
    paramIndex++
  }

  if (whereConditions.length > 0) {
    queryText += ' WHERE ' + whereConditions.join(' AND ')
  }

  return { queryText, queryParams }
}

function getSortColumn(sort: string): string {
  switch (sort) {
    case 'name': return 'p.name'
    case 'created_at': return 'p.created_at'
    case 'updated_at': return 'p.updated_at'
    case 'brand': return 'b.name'
    case 'category': return 'c.name'
    default: return 'p.created_at'
  }
}

// ========== Result Processor ==========
async function processProductResults(rows: any[], branchId: string): Promise<ProductResponse[]> {
  if (rows.length === 0) return []

  const productIds = rows.map(row => row.id)
  
  // Fetch specifications
  const specsResult = await query(`
    SELECT 
      product_id,
      id,
      spec_name,
      spec_value,
      spec_unit
    FROM product_specifications 
    WHERE product_id = ANY($1)
    ORDER BY spec_name
  `, [productIds])

  // Fetch barcodes
  const barcodesResult = await query(`
    SELECT 
      product_id,
      id,
      code,
      type,
      is_active
    FROM barcodes 
    WHERE product_id = ANY($1) AND is_active = true
    ORDER BY created_at DESC
  `, [productIds])

  // Fetch batch details with pricing
  const batchesResult = await query(`
    SELECT 
      bii.branch_inventory_id,
      bi.product_id,
      pb.id,
      pb.batch_number,
      bii.quantity,
      bii.cost_price,
      bii.wholesale_price,
      bii.retail_price,
      bii.expiry_date,
      bii.received_date,
      s.name as supplier_name
    FROM branch_inventory_items bii
    JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
    JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
    JOIN suppliers s ON pb.supplier_id = s.id
    WHERE bi.branch_id = $1 AND bi.product_id = ANY($2) AND bii.is_active = true
    ORDER BY bii.received_date DESC
  `, [branchId, productIds])

  // Group results by product
  const specificationsMap = new Map<string, any[]>()
  const barcodesMap = new Map<string, any[]>()
  const batchesMap = new Map<string, any[]>()

  specsResult.rows.forEach((spec: { product_id: string; id: any; spec_name: any; spec_value: any; spec_unit: any }) => {
    if (!specificationsMap.has(spec.product_id)) {
      specificationsMap.set(spec.product_id, [])
    }
    specificationsMap.get(spec.product_id)!.push({
      id: spec.id,
      spec_name: spec.spec_name,
      spec_value: spec.spec_value,
      spec_unit: spec.spec_unit
    })
  })

  barcodesResult.rows.forEach((barcode: { product_id: string; id: any; code: any; type: any; is_active: any }) => {
    if (!barcodesMap.has(barcode.product_id)) {
      barcodesMap.set(barcode.product_id, [])
    }
    barcodesMap.get(barcode.product_id)!.push({
      id: barcode.id,
      code: barcode.code,
      type: barcode.type,
      is_active: barcode.is_active
    })
  })

  batchesResult.rows.forEach((batch: { product_id: string; id: any; batch_number: any; quantity: any; cost_price: string; wholesale_price: string; retail_price: string; expiry_date: any; received_date: any; supplier_name: any }) => {
    if (!batchesMap.has(batch.product_id)) {
      batchesMap.set(batch.product_id, [])
    }
    batchesMap.get(batch.product_id)!.push({
      id: batch.id,
      batch_number: batch.batch_number,
      quantity: batch.quantity,
      cost_price: parseFloat(batch.cost_price),
      wholesale_price: batch.wholesale_price ? parseFloat(batch.wholesale_price) : null,
      retail_price: parseFloat(batch.retail_price),
      expiry_date: batch.expiry_date,
      received_date: batch.received_date,
      supplier_name: batch.supplier_name
    })
  })

  // Process each product
  return rows.map(row => {
    const productId = row.id
    const batches = batchesMap.get(productId) || []
    
    // Calculate current pricing (weighted average or latest batch)
    let currentPricing = null
    if (batches.length > 0) {
      const latestBatch = batches[0] // Already sorted by received_date DESC
      currentPricing = {
        cost_price: latestBatch.cost_price,
        wholesale_price: latestBatch.wholesale_price,
        retail_price: latestBatch.retail_price,
        currency: 'LKR' // You can make this dynamic
      }
    }

    const product: ProductResponse = {
      id: row.id,
      name: row.name,
      model: row.model,
      description: row.description,
      sku: row.sku,
      warranty_period: row.warranty_period,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      
      brand: row.brand_id ? {
        id: row.brand_id,
        name: row.brand_name,
        code: row.brand_code,
        logo_url: row.brand_logo_url
      } : null,
      
      subcategory: row.subcategory_id ? {
        id: row.subcategory_id,
        name: row.subcategory_name,
        category: {
          id: row.category_id,
          name: row.category_name,
          description: row.category_description
        }
      } : null,
      
      specifications: specificationsMap.get(productId) || [],
      barcodes: barcodesMap.get(productId) || [],
      
      stock: row.total_quantity !== null ? {
        total_quantity: row.total_quantity,
        reserved_quantity: row.reserved_quantity,
        available_quantity: row.total_quantity - row.reserved_quantity,
        low_stock_threshold: row.low_stock_threshold,
        reorder_quantity: row.reorder_quantity,
        last_restock_date: row.last_restock_date,
        last_sale_date: row.last_sale_date,
        is_low_stock: row.is_low_stock,
        batches
      } : null,
      
      pricing: currentPricing
    }

    return product
  })
}