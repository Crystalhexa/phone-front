import { NextRequest, NextResponse } from 'next/server'
import { query, ApiResponse } from '@/lib/database/connection'
import { z } from 'zod'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'

// ========== Types ==========
export interface ScannedProduct {
  barcode: string
  scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL'
  product_id: string
  name: string
  model: string
  sku: string
  brand?: {
    name: string
    code: string
  }
  category?: {
    category: string
    subcategory: string
  }
  pricing: {
    cost_price: number
    wholesale_price?: number
    retail_price: number
    selling_price: number
  }
  inventory: {
    available_quantity: number
    is_low_stock: boolean
  }
  // For individual items
  batch_info?: {
    batch_id: string
    batch_number: string
    expiry_date?: string
  }
  // For product-level items
  requires_quantity_input: boolean
  max_quantity?: number
  warranty_period?: number
}

// ========== Validation Schema ==========
const scanRequestSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required')
})

// ========== Barcode Type Detection ==========
function detectBarcodeType(barcode: string): 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL' | 'UNKNOWN' {
  if (barcode.startsWith('ITEM_')) return 'INDIVIDUAL_ITEM'
  if (barcode.startsWith('PRO_') || barcode.startsWith('INT_')) return 'PRODUCT_LEVEL'
  return 'UNKNOWN'
}

// ========== Individual Item Scan Handler ==========
async function handleIndividualItemScan(
  barcode: string, 
  branchId: string
): Promise<ScannedProduct> {
  
  const itemQuery = `
    SELECT 
      soib.id as barcode_id,
      soib.code as barcode,
      soib.status,
      pb.id as batch_id,
      pb.batch_number,
      pb.cost_price,
      pb.wholesale_price,
      pb.retail_price,
      pb.expiry_date,
      poi.product_id,
      p.name as product_name,
      p.model,
      p.sku,
      p.warranty_period,
      b.name as brand_name,
      b.code as brand_code,
      sc.name as subcategory_name,
      c.name as category_name,
      -- Branch inventory details
      bi.total_quantity,
      bi.reserved_quantity,
      (bi.total_quantity - bi.reserved_quantity) as available_quantity,
      bi.low_stock_threshold,
      -- Batch availability in this branch
      bii.quantity as batch_quantity_in_branch,
      bii.reserved_quantity as batch_reserved_quantity,
      (bii.quantity - bii.reserved_quantity) as batch_available_quantity
    FROM sales_order_items_barcode soib
    JOIN purchase_batches pb ON soib.purchase_batch_id = pb.id
    JOIN purchase_order_items poi ON pb.purchase_order_item_id = poi.id
    JOIN products p ON poi.product_id = p.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    -- CRITICAL: Check branch inventory
    LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.branch_id = $2
    -- CRITICAL: Check if this specific batch exists in this branch
    LEFT JOIN branch_inventory_items bii ON pb.id = bii.purchase_batch_id 
                                          AND bii.branch_inventory_id = bi.id
    WHERE soib.code = $1 AND soib.is_active = true
  `

  const result = await query(itemQuery, [barcode, branchId])

  if (result.rows.length === 0) {
    throw new Error(`Individual item barcode '${barcode}' not found in system`)
  }

  const item = result.rows[0]

  // Check if item barcode status is available
  if (item.status !== 'AVAILABLE') {
    throw new Error(`Item is ${item.status.toLowerCase()} and cannot be sold`)
  }

  // Check if product exists in this branch
  if (!item.total_quantity && item.total_quantity !== 0) {
    throw new Error(`Product '${item.product_name}' is not available in this branch`)
  }

  // Check if overall product has stock in this branch
  if (!item.available_quantity || item.available_quantity <= 0) {
    throw new Error(`Product '${item.product_name}' is out of stock in this branch`)
  }

  // CRITICAL: Check if the specific batch exists in this branch
  if (!item.batch_quantity_in_branch && item.batch_quantity_in_branch !== 0) {
    throw new Error(`This specific item batch is not located in branch ${branchId}`)
  }

  // Check if the batch has available quantity in this branch
  if (!item.batch_available_quantity || item.batch_available_quantity <= 0) {
    throw new Error(`This item's batch is out of stock in this branch`)
  }

  return {
    barcode: item.barcode,
    scan_type: 'INDIVIDUAL_ITEM',
    product_id: item.product_id,
    name: item.product_name,
    model: item.model,
    sku: item.sku,
    brand: item.brand_name ? {
      name: item.brand_name,
      code: item.brand_code
    } : undefined,
    category: item.category_name ? {
      category: item.category_name,
      subcategory: item.subcategory_name
    } : undefined,
    pricing: {
      cost_price: parseFloat(item.cost_price),
      wholesale_price: item.wholesale_price ? parseFloat(item.wholesale_price) : undefined,
      retail_price: parseFloat(item.retail_price),
      selling_price: parseFloat(item.retail_price)
    },
    inventory: {
      available_quantity: item.available_quantity,
      is_low_stock: item.available_quantity <= item.low_stock_threshold
    },
    batch_info: {
      batch_id: item.batch_id,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      branch_quantity: item.batch_quantity_in_branch,
      branch_available: item.batch_available_quantity
    },
    requires_quantity_input: false, // Always 1 for individual items
    warranty_period: item.warranty_period
  }
}

// ========== Product Level Scan Handler ==========
async function handleProductLevelScan(
  barcode: string, 
  branchId: string
): Promise<ScannedProduct> {
  
  const productQuery = `
    SELECT 
      bc.id as barcode_id,
      bc.code as barcode,
      bc.type,
      p.id as product_id,
      p.name as product_name,
      p.model,
      p.sku,
      p.warranty_period,
      b.name as brand_name,
      b.code as brand_code,
      sc.name as subcategory_name,
      c.name as category_name,
      pcp.cost_price,
      pcp.wholesale_price,
      pcp.retail_price,
      -- Branch-specific inventory
      bi.total_quantity,
      bi.reserved_quantity,
      (bi.total_quantity - bi.reserved_quantity) as available_quantity,
      bi.low_stock_threshold,
      -- Count available batches in this branch
      COUNT(bii.id) FILTER (WHERE bii.quantity > 0) as available_batches_count,
      SUM(bii.quantity) FILTER (WHERE bii.quantity > 0) as total_batch_quantity
    FROM barcodes bc
    JOIN products p ON bc.product_id = p.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    LEFT JOIN categories c ON sc.category_id = c.id
    LEFT JOIN product_current_prices pcp ON p.id = pcp.product_id
    -- CRITICAL: Branch inventory check
    LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.branch_id = $2
    -- CRITICAL: Check available batches in this branch
    LEFT JOIN branch_inventory_items bii ON bi.id = bii.branch_inventory_id 
                                          AND bii.quantity > 0 
                                          AND bii.is_active = true
    WHERE bc.code = $1 AND bc.is_active = true
    GROUP BY bc.id, bc.code, bc.type, p.id, p.name, p.model, p.sku, p.warranty_period,
             b.name, b.code, sc.name, c.name, pcp.cost_price, pcp.wholesale_price, 
             pcp.retail_price, bi.total_quantity, bi.reserved_quantity, bi.low_stock_threshold
  `

  const result = await query(productQuery, [barcode, branchId])

  if (result.rows.length === 0) {
    throw new Error(`Product barcode '${barcode}' not found in system`)
  }

  const product = result.rows[0]

  // Check if product exists in this branch
  if (!product.total_quantity && product.total_quantity !== 0) {
    throw new Error(`Product '${product.product_name}' is not available in branch ${branchId}`)
  }

  // Check if product has stock in this branch
  if (!product.available_quantity || product.available_quantity <= 0) {
    throw new Error(`Product '${product.product_name}' is out of stock in this branch`)
  }

  // Check if there are available batches in this branch
  if (!product.available_batches_count || product.available_batches_count <= 0) {
    throw new Error(`No available batches for product '${product.product_name}' in this branch`)
  }

  // Verify batch quantity matches inventory quantity
  if (product.total_batch_quantity !== product.total_quantity) {
    console.warn(`Inventory mismatch for product ${product.product_id} in branch ${branchId}: 
                  inventory=${product.total_quantity}, batches=${product.total_batch_quantity}`)
  }

  return {
    barcode: product.barcode,
    scan_type: 'PRODUCT_LEVEL',
    product_id: product.product_id,
    name: product.product_name,
    model: product.model,
    sku: product.sku,
    brand: product.brand_name ? {
      name: product.brand_name,
      code: product.brand_code
    } : undefined,
    category: product.category_name ? {
      category: product.category_name,
      subcategory: product.subcategory_name
    } : undefined,
    pricing: {
      cost_price: parseFloat(product.cost_price || '0'),
      wholesale_price: product.wholesale_price ? parseFloat(product.wholesale_price) : undefined,
      retail_price: parseFloat(product.retail_price || '0'),
      selling_price: parseFloat(product.retail_price || '0')
    },
    inventory: {
      available_quantity: product.available_quantity || 0,
      is_low_stock: (product.available_quantity || 0) <= (product.low_stock_threshold || 0)
    },
    requires_quantity_input: true,
    max_quantity: product.available_quantity || 0,
    warranty_period: product.warranty_period
  }
}

// ========== Main API Handler ==========
export async function POST(request: NextRequest) {
    return withPermission('create_product')(async (authedReq: AuthenticatedRequest)=>{
  try {
    const body = await request.json()
    const { user: userDetails } = authedReq.user;

    // Validate request
    const validation = scanRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Validation failed',
        errors: validation.error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const { barcode } = validation.data

    console.log(barcode)
    // Detect barcode type
    const barcodeType = detectBarcodeType(barcode)

    if (barcodeType === 'UNKNOWN') {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Invalid barcode format',
        errors: [{
          code: 'INVALID_BARCODE_FORMAT',
          message: 'Barcode format not recognized. Expected format: ITEM_xxx or PRO_xxx',
          barcode
        }],
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    let scannedProduct: ScannedProduct

    // Route to appropriate handler
    try {
      if (barcodeType === 'INDIVIDUAL_ITEM') {
        scannedProduct = await handleIndividualItemScan(barcode, userDetails.branch_id)
      } else {
        scannedProduct = await handleProductLevelScan(barcode, userDetails.branch_id)
      }
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        data: null,
        message: error.message,
        errors: [{
          code: barcodeType === 'INDIVIDUAL_ITEM' ? 'ITEM_NOT_AVAILABLE' : 'PRODUCT_NOT_FOUND',
          message: error.message,
          barcode
        }],
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    // Success response with product data for frontend
    return NextResponse.json({
      success: true,
      data: scannedProduct,
      message: `Product scanned successfully - ${scannedProduct.requires_quantity_input ? 'enter quantity' : 'ready to add to cart'}`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error in barcode scan API:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: 'Internal server error',
      errors: [{ message: 'An unexpected error occurred while scanning barcode' }],
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
})(request);
}