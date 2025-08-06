// app/api/pos/products/route.ts
import { query } from '@/lib/database/connection'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ========== Types ==========
interface ProductWithPricing {
  id: string
  name: string
  model: string
  sku: string
  brand: string | null
  category: string | null
  subcategory: string | null
  availableQuantity: number
  reservedQuantity: number
  costPrice: number
  retailPrice: number
  wholesalePrice: number | null
  warrantyPeriod: number | null
  specifications: Array<{
    name: string
    value: string
    unit: string | null
  }>
  barcodes: string[]
  priceOverride: {
    price: number
    reason: string
    validUntil: string | null
  } | null
}

interface BatchInfo {
  batchId: string
  batchNumber: string | null
  quantity: number
  availableQuantity: number
  costPrice: number
  retailPrice: number
  wholesalePrice: number | null
  expiryDate: string | null
  receivedDate: string
}

// ========== Query Schemas ==========
const querySchema = z.object({
  branchId: z.string().cuid(),
  search: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().cuid().optional(),
  subcategory_id: z.string().cuid().optional(),
  brand_id: z.string().cuid().optional(),
  includeInactive: z.coerce.boolean().default(false),
  includeBatches: z.coerce.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'sku', 'price', 'stock']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// ========== Helper Functions ==========
async function getProductsWithFIFOPricing(
  filters: z.infer<typeof querySchema>
): Promise<{ products: ProductWithPricing[], total: number }> {
  const offset = (filters.page - 1) * filters.limit
  
  // Build WHERE clause
  const whereConditions: string[] = ['1=1']
  const params: any[] = []
  let paramCount = 0

  // Branch filter (required)
  whereConditions.push(`bi.branch_id = $${++paramCount}`)
  params.push(filters.branchId)

  // Active filter
  if (!filters.includeInactive) {
    whereConditions.push(`p.is_active = true`)
  }

  // Search filter
  if (filters.search) {
    whereConditions.push(`(
      p.name ILIKE $${++paramCount} OR 
      p.model ILIKE $${paramCount} OR 
      p.sku ILIKE $${paramCount} OR
      b.name ILIKE $${paramCount}
    )`)
    params.push(`%${filters.search}%`)
  }

  // Barcode filter
  if (filters.barcode) {
    whereConditions.push(`
      EXISTS (
        SELECT 1 FROM barcodes bc 
        WHERE bc.product_id = p.id 
        AND bc.code = $${++paramCount}
      )
    `)
    params.push(filters.barcode)
  }

  // Category filters
  if (filters.category_id) {
    whereConditions.push(`sc.category_id = $${++paramCount}`)
    params.push(filters.category_id)
  }

  if (filters.subcategory_id) {
    whereConditions.push(`p.subcategory_id = $${++paramCount}`)
    params.push(filters.subcategory_id)
  }

  if (filters.brand_id) {
    whereConditions.push(`p.brand_id = $${++paramCount}`)
    params.push(filters.brand_id)
  }

  const whereClause = whereConditions.join(' AND ')

  // Sort configuration
  const sortColumn = {
    name: 'p.name',
    sku: 'p.sku',
    price: 'COALESCE(po.override_price, pcp.retail_price)',
    stock: 'bi.total_quantity'
  }[filters.sortBy]

  // Main query with FIFO pricing
  const productsQuery = `
    WITH product_fifo_prices AS (
      -- Get the oldest active batch prices for each product in the branch
      SELECT DISTINCT ON (bii.branch_inventory_id)
        bi.product_id,
        bi.branch_id,
        bii.cost_price,
        bii.retail_price,
        bii.wholesale_price,
        bii.received_date,
        pb.batch_number,
        pb.expiry_date
      FROM branch_inventory bi
      INNER JOIN branch_inventory_items bii ON bii.branch_inventory_id = bi.id
      INNER JOIN purchase_batches pb ON pb.id = bii.purchase_batch_id
      WHERE bi.branch_id = $1
        AND bii.quantity > 0
        AND bii.is_active = true
      ORDER BY bii.branch_inventory_id, bii.received_date ASC, bii.fifo_order ASC, pb.fifo_sequence ASC
    ),
    active_price_overrides AS (
      -- Get active price overrides for the branch
      SELECT 
        product_id,
        override_price,
        reason,
        valid_until
      FROM price_overrides
      WHERE branch_id = $1
        AND is_active = true
        AND valid_from <= CURRENT_TIMESTAMP
        AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
    )
    SELECT 
      p.id,
      p.name,
      p.model,
      p.sku,
      p.warranty_period,
      p.wholesale_quantity,
      p.description,
      b.name as brand_name,
      c.name as category_name,
      sc.name as subcategory_name,
      bi.total_quantity,
      bi.reserved_quantity,
      bi.low_stock_threshold,
      
      -- FIFO-based pricing
      COALESCE(pfp.cost_price, pcp.cost_price, 0) as cost_price,
      COALESCE(po.override_price, pfp.retail_price, pcp.retail_price, 0) as retail_price,
      COALESCE(pfp.wholesale_price, pcp.wholesale_price) as wholesale_price,
      
      -- Price override info
      po.override_price,
      po.reason as override_reason,
      po.valid_until as override_valid_until,
      
      
      
      -- Count for pagination
      COUNT(*) OVER() as total_count
      
    FROM products p
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
    LEFT JOIN categories c ON c.id = sc.category_id
    INNER JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = $1
    LEFT JOIN product_fifo_prices pfp ON pfp.product_id = p.id AND pfp.branch_id = $1
    LEFT JOIN product_current_prices pcp ON pcp.product_id = p.id
    LEFT JOIN active_price_overrides po ON po.product_id = p.id
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${filters.sortOrder.toUpperCase()}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `

  params.push(filters.limit, offset)

  const result = await query<any>(productsQuery, params)

  if (result.rows.length === 0) {
    return { products: [], total: 0 }
  }

  const total = parseInt(result.rows[0].total_count)

  // Get specifications for all products
  const productIds = result.rows.map(row => row.id)
  const specsQuery = `
    SELECT 
      product_id,
      spec_name,
      spec_value
    FROM product_specifications
    WHERE product_id = ANY($1)
    ORDER BY spec_name
  `
  
  const specsResult = await query<any>(specsQuery, [productIds])
  const specsByProduct = specsResult.rows.reduce((acc, spec) => {
    if (!acc[spec.product_id]) acc[spec.product_id] = []
    acc[spec.product_id].push({
      name: spec.spec_name,
      value: spec.spec_value
    })
    return acc
  }, {} as Record<string, any[]>)

  // Get barcodes for all products
  const barcodesQuery = `
    SELECT 
      product_id,
      code
    FROM barcodes
    WHERE product_id = ANY($1)
    ORDER BY code
  `
  
  const barcodesResult = await query<any>(barcodesQuery, [productIds])
  const barcodesByProduct = barcodesResult.rows.reduce((acc, barcode) => {
    if (!acc[barcode.product_id]) acc[barcode.product_id] = []
    acc[barcode.product_id].push(barcode.code)
    return acc
  }, {} as Record<string, string[]>)

  // Map to response format
  const products: ProductWithPricing[] = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    model: row.model,
    sku: row.sku,
    brand: row.brand_name,
    category: row.category_name,
    subcategory: row.subcategory_name,
    availableQuantity: row.total_quantity - row.reserved_quantity,
    reservedQuantity: row.reserved_quantity,
    costPrice: parseFloat(row.cost_price),
    retailPrice: parseFloat(row.retail_price),
    wholesalePrice: row.wholesale_price ? parseFloat(row.wholesale_price) : null,
    wholesale_quantity: row.wholesale_quantity,
    warrantyPeriod: row.warranty_period,
    specifications: specsByProduct[row.id] || [],
    barcodes: barcodesByProduct[row.id] || [],
    priceOverride: row.override_price ? {
      price: parseFloat(row.override_price),
      reason: row.override_reason,
      validUntil: row.override_valid_until
    } : null
  }))

  return { products, total }
}

async function getProductBatches(productId: string, branchId: string): Promise<BatchInfo[]> {
  const batchQuery = `
    SELECT 
      pb.id as batch_id,
      pb.batch_number,
      bii.quantity,
      bii.reserved_quantity,
      bii.cost_price,
      bii.retail_price,
      bii.wholesale_price,
      pb.expiry_date,
      bii.received_date
    FROM branch_inventory bi
    INNER JOIN branch_inventory_items bii ON bii.branch_inventory_id = bi.id
    INNER JOIN purchase_batches pb ON pb.id = bii.purchase_batch_id
    WHERE bi.product_id = $1
      AND bi.branch_id = $2
      AND bii.quantity > 0
      AND bii.is_active = true
      AND pb.is_active = true
    ORDER BY bii.received_date ASC, bii.fifo_order ASC, pb.fifo_sequence ASC
  `

  const result = await query<any>(batchQuery, [productId, branchId])

  return result.rows.map(row => ({
    batchId: row.batch_id,
    batchNumber: row.batch_number,
    quantity: row.quantity,
    availableQuantity: row.quantity - row.reserved_quantity,
    costPrice: parseFloat(row.cost_price),
    retailPrice: parseFloat(row.retail_price),
    wholesalePrice: row.wholesale_price ? parseFloat(row.wholesale_price) : null,
    expiryDate: row.expiry_date,
    receivedDate: row.received_date
  }))
}

// ========== API Route Handler ==========
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const filters = querySchema.parse(searchParams)

    // Get products with FIFO pricing
    const { products, total } = await getProductsWithFIFOPricing(filters)

    // If requested, get batch details for each product
    if (filters.includeBatches && products.length > 0) {
      const productsWithBatches = await Promise.all(
        products.map(async (product) => {
          const batches = await getProductBatches(product.id, filters.branchId)
          return { ...product, batches }
        })
      )

      return NextResponse.json({
        success: true,
        data: {
          products: productsWithBatches,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages: Math.ceil(total / filters.limit)
          }
        },
        message: 'Products retrieved successfully',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit)
        }
      },
      message: 'Products retrieved successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching products:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Invalid request parameters',
        errors: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to fetch products',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// ========== Single Product Endpoint ==========
// app/api/pos/products/[productId]/route.ts
// export async function GET_SINGLE(
//   request: NextRequest,
//   { params }: { params: { productId: string } }
// ) {
//   try {
//     const searchParams = Object.fromEntries(request.nextUrl.searchParams)
//     const branchId = searchParams.branchId

//     if (!branchId) {
//       return NextResponse.json({
//         success: false,
//         data: null,
//         message: 'Branch ID is required',
//         timestamp: new Date().toISOString()
//       }, { status: 400 })
//     }

//     // Get single product with detailed FIFO info
//     const productQuery = `
//       WITH product_fifo_prices AS (
//         SELECT DISTINCT ON (bii.branch_inventory_id)
//           bi.product_id,
//           bii.cost_price,
//           bii.retail_price,
//           bii.wholesale_price,
//           pb.batch_number,
//           pb.expiry_date,
//           bii.received_date
//         FROM branch_inventory bi
//         INNER JOIN branch_inventory_items bii ON bii.branch_inventory_id = bi.id
//         INNER JOIN purchase_batches pb ON pb.id = bii.purchase_batch_id
//         WHERE bi.branch_id = $1
//           AND bi.product_id = $2
//           AND bii.quantity > 0
//           AND bii.is_active = true
//           AND pb.is_active = true
//         ORDER BY bii.branch_inventory_id, bii.received_date ASC, bii.fifo_order ASC
//       )
//       SELECT 
//         p.*,
//         b.name as brand_name,
//         c.name as category_name,
//         sc.name as subcategory_name,
//         bi.total_quantity,
//         bi.reserved_quantity,
//         bi.low_stock_threshold,
//         bi.reorder_quantity,
//         COALESCE(pfp.cost_price, pcp.cost_price, 0) as fifo_cost_price,
//         COALESCE(po.override_price, pfp.retail_price, pcp.retail_price, 0) as fifo_retail_price,
//         COALESCE(pfp.wholesale_price, pcp.wholesale_price) as fifo_wholesale_price,
//         po.override_price,
//         po.reason as override_reason,
//         po.valid_until as override_valid_until
//       FROM products p
//       LEFT JOIN brands b ON b.id = p.brand_id
//       LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
//       LEFT JOIN categories c ON c.id = sc.category_id
//       LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = $1
//       LEFT JOIN product_fifo_prices pfp ON pfp.product_id = p.id
//       LEFT JOIN product_current_prices pcp ON pcp.product_id = p.id
//       LEFT JOIN price_overrides po ON po.product_id = p.id 
//         AND po.branch_id = $1 
//         AND po.is_active = true
//         AND po.valid_from <= CURRENT_TIMESTAMP
//         AND (po.valid_until IS NULL OR po.valid_until > CURRENT_TIMESTAMP)
//       WHERE p.id = $2
//     `

//     const result = await query<any>(productQuery, [branchId, params.productId])

//     if (result.rows.length === 0) {
//       return NextResponse.json({
//         success: false,
//         data: null,
//         message: 'Product not found',
//         timestamp: new Date().toISOString()
//       }, { status: 404 })
//     }

//     const product = result.rows[0]
    
//     // Get batches
//     const batches = await getProductBatches(params.productId, branchId)

//     // Get specifications
//     const specsResult = await query<any>(
//       'SELECT * FROM product_specifications WHERE product_id = $1',
//       [params.productId]
//     )

//     // Get barcodes
//     const barcodesResult = await query<any>(
//       'SELECT code, type FROM barcodes WHERE product_id = $1 AND is_active = true',
//       [params.productId]
//     )

//     const response = {
//       id: product.id,
//       name: product.name,
//       model: product.model,
//       sku: product.sku,
//       description: product.description,
//       brand: product.brand_name,
//       category: product.category_name,
//       subcategory: product.subcategory_name,
//       warrantyPeriod: product.warranty_period,
//       inventory: {
//         totalQuantity: product.total_quantity || 0,
//         availableQuantity: (product.total_quantity || 0) - (product.reserved_quantity || 0),
//         reservedQuantity: product.reserved_quantity || 0,
//         lowStockThreshold: product.low_stock_threshold,
//         reorderQuantity: product.reorder_quantity
//       },
//       pricing: {
//         costPrice: parseFloat(product.fifo_cost_price),
//         retailPrice: parseFloat(product.fifo_retail_price),
//         wholesalePrice: product.fifo_wholesale_price ? parseFloat(product.fifo_wholesale_price) : null,
//         priceOverride: product.override_price ? {
//           price: parseFloat(product.override_price),
//           reason: product.override_reason,
//           validUntil: product.override_valid_until
//         } : null
//       },
//       specifications: specsResult.rows.map(spec => ({
//         name: spec.spec_name,
//         value: spec.spec_value,
//         unit: spec.spec_unit
//       })),
//       barcodes: barcodesResult.rows.map(b => ({
//         code: b.code,
//         type: b.type
//       })),
//       batches
//     }

//     return NextResponse.json({
//       success: true,
//       data: response,
//       message: 'Product retrieved successfully',
//       timestamp: new Date().toISOString()
//     })
//   } catch (error) {
//     console.error('Error fetching product:', error)
    
//     return NextResponse.json({
//       success: false,
//       data: null,
//       message: error instanceof Error ? error.message : 'Failed to fetch product',
//       timestamp: new Date().toISOString()
//     }, { status: 500 })
//   }
// }