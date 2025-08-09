import { initDatabase, query } from '@/lib/database/connection'
import { NextRequest, NextResponse } from 'next/server'

// ================== TYPES & INTERFACES ==================
interface QueryParams {
  branch_id?: string
  category_id?: string
  subcategory_id?: string
  brand_id?: string
  search?: string
  sku?: string
  barcode?: string
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED' | 'ALL'
  sort?: 'name' | 'created_at' | 'stock' | 'brand' | 'category'
  order?: 'asc' | 'desc'
  page?: string
  limit?: string
  include_inactive?: string
  low_stock_only?: string
  has_stock?: string
  min_stock?: string
  max_stock?: string
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
  
  current_prices: {
    cost_price: number
    wholesale_price: number | null
    retail_price: number
    last_updated: string
  } | null
  
  // NEW: Latest batch pricing information
  latest_batch_pricing: {
    batch_id: string
    batch_number: string | null
    cost_price: number
    wholesale_price: number | null
    retail_price: number
    received_date: string | null
    purchase_order_id: string
    supplier_id: string
    quantity_received: number
  } | null
  
  branch_stock: Array<{
    branch_id: string
    branch_name: string
    branch_code: string
    total_quantity: number
    available_quantity: number
    reserved_quantity: number
    low_stock_threshold: number
    stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED'
    average_cost_price: number | null
    last_restock_date: string | null
    last_sale_date: string | null
  }>
  total_system_stock: number
  total_available_stock: number
  overall_stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED'
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
    WITH product_stock_summary AS (
      SELECT 
        p.id as product_id,
        COUNT(bi.id) as branches_with_stock,
        COALESCE(SUM(bi.total_quantity), 0) as total_system_stock,
        COALESCE(SUM(bi.total_quantity - bi.reserved_quantity), 0) as total_available_stock,
        CASE 
          WHEN COALESCE(SUM(bi.total_quantity - bi.reserved_quantity), 0) = 0 THEN 'OUT_OF_STOCK'
          WHEN COALESCE(SUM(bi.total_quantity - bi.reserved_quantity), 0) <= COALESCE(MIN(bi.low_stock_threshold), 5) THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as overall_stock_status
      FROM products p
      LEFT JOIN branch_inventory bi ON p.id = bi.product_id
      GROUP BY p.id
    ),
    latest_batch_pricing AS (
      SELECT DISTINCT ON (poi.product_id)
        poi.product_id,
        pb.id as batch_id,
        pb.batch_number,
        pb.cost_price,
        pb.wholesale_price,
        pb.retail_price,
        pb.received_date,
        pb.quantity_received,
        po.id as purchase_order_id,
        po.supplier_id
      FROM purchase_order_items poi
      JOIN purchase_batches pb ON poi.id = pb.purchase_order_item_id
      JOIN purchase_orders po ON poi.purchase_order_id = po.id
      WHERE pb.received_date IS NOT NULL
        AND pb.is_active = true
      ORDER BY poi.product_id, pb.received_date DESC, pb.created_at DESC
    ),
    filtered_products AS (
      SELECT DISTINCT p.*
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN barcodes bc ON p.id = bc.product_id
      LEFT JOIN branch_inventory bi ON p.id = bi.product_id
      LEFT JOIN product_stock_summary pss ON p.id = pss.product_id
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
  
  if (params.stock_status && params.stock_status !== 'ALL') {
    queryText += ` AND pss.overall_stock_status = $${paramIndex}`
    queryParams.push(params.stock_status)
    paramIndex++
  }
  
  if (params.low_stock_only === 'true') {
    queryText += ` AND pss.overall_stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')`
  }
  
  if (params.branch_id) {
    queryText += ` AND bi.branch_id = $${paramIndex}`
    queryParams.push(params.branch_id)
    paramIndex++
  }
  
  if (params.has_stock === 'true') {
    queryText += ` AND pss.total_available_stock > 0`
  }
  
  if (params.min_stock) {
    queryText += ` AND pss.total_available_stock >= $${paramIndex}`
    queryParams.push(parseInt(params.min_stock))
    paramIndex++
  }
  
  if (params.max_stock) {
    queryText += ` AND pss.total_available_stock <= $${paramIndex}`
    queryParams.push(parseInt(params.max_stock))
    paramIndex++
  }
  
  queryText += `
    )
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
      jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'logo_url', b.logo_url
      ) as brand,
      
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
      ELSE NULL END as subcategory,
      
      -- Current prices (from product_current_prices table)
      CASE WHEN pcp.product_id IS NOT NULL THEN
        jsonb_build_object(
          'cost_price', pcp.cost_price,
          'wholesale_price', pcp.wholesale_price,
          'retail_price', pcp.retail_price,
          'last_updated', pcp.last_updated
        )
      ELSE NULL END as current_prices,
      
      -- NEW: Latest batch pricing information
      CASE WHEN lbp.product_id IS NOT NULL THEN
        jsonb_build_object(
          'batch_id', lbp.batch_id,
          'batch_number', lbp.batch_number,
          'cost_price', lbp.cost_price,
          'wholesale_price', lbp.wholesale_price,
          'retail_price', lbp.retail_price,
          'received_date', lbp.received_date,
          'purchase_order_id', lbp.purchase_order_id,
          'supplier_id', lbp.supplier_id,
          'quantity_received', lbp.quantity_received
        )
      ELSE NULL END as latest_batch_pricing,
      
      -- Stock summary
      pss.total_system_stock,
      pss.total_available_stock,
      pss.overall_stock_status
      
    FROM filtered_products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    LEFT JOIN product_current_prices pcp ON p.id = pcp.product_id
    LEFT JOIN latest_batch_pricing lbp ON p.id = lbp.product_id
    LEFT JOIN product_stock_summary pss ON p.id = pss.product_id
  `
  
  // Add ordering
  const sortBy = params.sort || 'created_at'
  const sortOrder = (params.order || 'desc').toUpperCase()
  
  switch (sortBy) {
    case 'name':
      queryText += ` ORDER BY p.name ${sortOrder}`
      break
    case 'stock':
      queryText += ` ORDER BY pss.total_available_stock ${sortOrder}`
      break
    case 'brand':
      queryText += ` ORDER BY b.name ${sortOrder}`
      break
    case 'category':
      queryText += ` ORDER BY c.name ${sortOrder}, sc.name ${sortOrder}`
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
    WITH product_stock_summary AS (
      SELECT 
        p.id as product_id,
        COALESCE(SUM(bi.total_quantity - bi.reserved_quantity), 0) as total_available_stock,
        CASE 
          WHEN COALESCE(SUM(bi.total_quantity - bi.reserved_quantity), 0) = 0 THEN 'OUT_OF_STOCK'
          WHEN COALESCE(SUM(bi.total_quantity - bi.reserved_quantity), 0) <= COALESCE(MIN(bi.low_stock_threshold), 5) THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as overall_stock_status
      FROM products p
      LEFT JOIN branch_inventory bi ON p.id = bi.product_id
      GROUP BY p.id
    )
    SELECT COUNT(DISTINCT p.id) as count
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    LEFT JOIN barcodes bc ON p.id = bc.product_id
    LEFT JOIN branch_inventory bi ON p.id = bi.product_id
    LEFT JOIN product_stock_summary pss ON p.id = pss.product_id
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
  
  if (params.stock_status && params.stock_status !== 'ALL') {
    queryText += ` AND pss.overall_stock_status = $${paramIndex}`
    queryParams.push(params.stock_status)
    paramIndex++
  }
  
  if (params.low_stock_only === 'true') {
    queryText += ` AND pss.overall_stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')`
  }
  
  if (params.branch_id) {
    queryText += ` AND bi.branch_id = $${paramIndex}`
    queryParams.push(params.branch_id)
    paramIndex++
  }
  
  if (params.has_stock === 'true') {
    queryText += ` AND pss.total_available_stock > 0`
  }
  
  if (params.min_stock) {
    queryText += ` AND pss.total_available_stock >= $${paramIndex}`
    queryParams.push(parseInt(params.min_stock))
    paramIndex++
  }
  
  if (params.max_stock) {
    queryText += ` AND pss.total_available_stock <= $${paramIndex}`
    queryParams.push(parseInt(params.max_stock))
    paramIndex++
  }
  
  return { queryText, queryParams }
}

// ================== RESULT PROCESSORS ==================
async function processProductResults(rows: any[], branchId?: string): Promise<ProductResponse[]> {
  if (rows.length === 0) return []
  
  const productIds = rows.map(row => row.id)
  
  // Get additional details in parallel
  const [branchStockMap, barcodesMap, specificationsMap] = await Promise.all([
    getBranchStockDetails(productIds, branchId),
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
    current_prices: row.current_prices,
    latest_batch_pricing: row.latest_batch_pricing, // NEW: Latest batch pricing
    branch_stock: branchStockMap.get(row.id) || [],
    total_system_stock: parseInt(row.total_system_stock) || 0,
    total_available_stock: parseInt(row.total_available_stock) || 0,
    overall_stock_status: row.overall_stock_status,
    barcodes: barcodesMap.get(row.id) || [],
    specifications: specificationsMap.get(row.id) || []
  }))
}

async function getBranchStockDetails(productIds: string[], branchId?: string): Promise<Map<string, any[]>> {
  if (productIds.length === 0) return new Map()
  
  let stockQuery = `
    SELECT 
      bi.product_id,
      jsonb_build_object(
        'branch_id', br.id,
        'branch_name', br.name,
        'branch_code', br.code,
        'total_quantity', bi.total_quantity,
        'available_quantity', bi.total_quantity - bi.reserved_quantity,
        'reserved_quantity', bi.reserved_quantity,
        'low_stock_threshold', bi.low_stock_threshold,
        'stock_status', CASE 
          WHEN (bi.total_quantity - bi.reserved_quantity) <= 0 THEN 'OUT_OF_STOCK'
          WHEN (bi.total_quantity - bi.reserved_quantity) <= bi.low_stock_threshold THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END,
        'last_restock_date', bi.last_restock_date,
        'last_sale_date', bi.last_sale_date
      ) as branch_stock
    FROM branch_inventory bi
    JOIN branches br ON bi.branch_id = br.id
    WHERE bi.product_id = ANY($1) AND br.is_active = true
  `
  
  const params = [productIds]
  
  stockQuery += ` ORDER BY br.name`
  
  const result = await query(stockQuery, params)
  const stockMap = new Map<string, any[]>()
  
  result.rows.forEach(row => {
    if (!stockMap.has(row.product_id)) {
      stockMap.set(row.product_id, [])
    }
    stockMap.get(row.product_id)!.push(row.branch_stock)
  })
  
  return stockMap
}

async function getProductBarcodes(productIds: string[]): Promise<Map<string, any[]>> {
  if (productIds.length === 0) return new Map()
  
  const barcodeQuery = `
    SELECT 
      product_id,
      jsonb_build_object(
        'code', code
      ) as barcode_info
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
    barcodeMap.get(row.product_id)!.push(row.barcode_info)
  })
  
  return barcodeMap
}

async function getProductSpecifications(productIds: string[]): Promise<Map<string, any[]>> {
  if (productIds.length === 0) return new Map()
  
  const specQuery = `
    SELECT 
      product_id,
      jsonb_build_object(
        'spec_name', spec_name,
        'spec_value', spec_value
      ) as spec_info
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
    specMap.get(row.product_id)!.push(row.spec_info)
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
  
  // Validate sort options
  const validSortFields = ['name', 'created_at', 'stock', 'brand', 'category']
  if (params.sort && !validSortFields.includes(params.sort)) {
    errors.push(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`)
  }
  
  const validSortOrders = ['asc', 'desc']
  if (params.order && !validSortOrders.includes(params.order)) {
    errors.push('Sort order must be asc or desc')
  }
  
  // Validate stock status
  const validStockStatuses = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'NOT_STOCKED', 'ALL']
  if (params.stock_status && !validStockStatuses.includes(params.stock_status)) {
    errors.push(`Invalid stock status. Must be one of: ${validStockStatuses.join(', ')}`)
  }
  
  // Validate stock numbers
  if (params.min_stock) {
    const minStock = parseInt(params.min_stock)
    if (isNaN(minStock) || minStock < 0) {
      errors.push('Minimum stock must be a non-negative integer')
    }
  }
  
  if (params.max_stock) {
    const maxStock = parseInt(params.max_stock)
    if (isNaN(maxStock) || maxStock < 0) {
      errors.push('Maximum stock must be a non-negative integer')
    }
  }
  
  if (params.min_stock && params.max_stock) {
    const minStock = parseInt(params.min_stock)
    const maxStock = parseInt(params.max_stock)
    if (minStock > maxStock) {
      errors.push('Minimum stock cannot be greater than maximum stock')
    }
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
      branch_id: searchParams.get('branch_id') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      subcategory_id: searchParams.get('subcategory_id') || undefined,
      brand_id: searchParams.get('brand_id') || undefined,
      search: searchParams.get('search') || undefined,
      sku: searchParams.get('sku') || undefined,
      barcode: searchParams.get('barcode') || undefined,
      stock_status: (searchParams.get('stock_status') as any) || undefined,
      sort: (searchParams.get('sort') as any) || 'created_at',
      order: (searchParams.get('order') as any) || 'desc',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '15',
      include_inactive: searchParams.get('include_inactive') || 'false',
      low_stock_only: searchParams.get('low_stock_only') || 'false',
      has_stock: searchParams.get('has_stock') || undefined,
      min_stock: searchParams.get('min_stock') || undefined,
      max_stock: searchParams.get('max_stock') || undefined
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
    const products = await processProductResults(result.rows, params.branch_id)
    
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