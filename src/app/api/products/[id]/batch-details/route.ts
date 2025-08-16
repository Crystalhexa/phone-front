// app/api/products/[productId]/batch-details/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query, ApiResponse } from '@/lib/database/connection'

interface BatchDetail {
  batchId: string
  batchNumber: string | null
  quantity: number
  availableQuantity: number
  costPrice: number
  wholesalePrice: number | null
  retailPrice: number
  receivedDate: string
  branchReceivedDate: string | null
  receivedBy: string | null
  receivedByName: string | null
  fifoSequence: number | null
  fifoOrder: number | null
  isActive: boolean
  isBatchItemActive: boolean
}

interface BranchBatchDetails {
  branchId: string
  branchName: string
  branchCode: string
  totalQuantity: number
  totalAvailable: number
  totalSold: number
  batches: BatchDetail[]
}

interface ProductBatchResponse {
  productId: string
  productName: string
  productSku: string
  branches: BranchBatchDetails[]
  summary: {
    totalBranches: number
    totalQuantityAllBranches: number
    totalAvailableAllBranches: number
    totalSoldAllBranches: number
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ProductBatchResponse>>> {
  const startTime = Date.now()
  
  try {
    const { id: productId } = await context.params
    
    if (!productId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Product ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // First, get product details
    const productQuery = `
      SELECT id, name, sku
      FROM products 
      WHERE id = $1 AND is_active = true
    `
    
    const productResult = await query(productQuery, [productId], {
      logQuery: true,
      timeout: 10000
    })

    if (productResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Product not found or inactive',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    const product = productResult.rows[0]

    // Get branch-wise batch details directly from branch inventory and purchase batches
    const batchDetailsQuery = `
      WITH branch_inventory_summary AS (
        SELECT 
          bi.branch_id,
          bi.product_id,
          bi.total_quantity,
          bi.reserved_quantity,
          (bi.total_quantity - bi.reserved_quantity) as available_quantity
        FROM branch_inventory bi
        WHERE bi.product_id = $1 AND bi.is_active = true
      ),
      branch_batch_details AS (
        SELECT 
          bii.branch_inventory_id,
          bi.branch_id,
          bi.product_id,
          pb.id as batch_id,
          pb.batch_number,
          pb.quantity_received,
          pb.cost_price,
          pb.wholesale_price,
          pb.retail_price,
          pb.received_date,
          pb.received_by,
          pb.fifo_sequence,
          pb.is_active as batch_is_active,
          e.name as received_by_name,
          bii.quantity as batch_quantity_in_branch,
          bii.reserved_quantity as batch_reserved_in_branch,
          (bii.quantity - bii.reserved_quantity) as batch_available_in_branch,
          bii.fifo_order,
          bii.received_date as batch_received_at_branch,
          bii.is_active as batch_item_active
        FROM branch_inventory bi
        INNER JOIN branch_inventory_items bii ON bi.id = bii.branch_inventory_id
        INNER JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
        LEFT JOIN employees e ON pb.received_by = e.id
        WHERE bi.product_id = $1 
          AND bi.is_active = true
          AND bii.is_active = true
          AND pb.is_active = true
          AND (bii.quantity - bii.reserved_quantity) > 0
      )
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        b.is_active as branch_is_active,
        COALESCE(bis.total_quantity, 0) as branch_total_quantity,
        COALESCE(bis.available_quantity, 0) as branch_available_quantity,
        -- Batch details
        bbd.batch_id,
        bbd.batch_number,
        bbd.batch_quantity_in_branch as quantity,
        bbd.batch_available_in_branch as available_quantity,
        bbd.cost_price,
        bbd.wholesale_price,
        bbd.retail_price,
        bbd.received_date,
        bbd.batch_received_at_branch,
        bbd.received_by,
        bbd.received_by_name,
        bbd.fifo_sequence,
        bbd.fifo_order,
        bbd.batch_is_active,
        bbd.batch_item_active
      FROM branches b
      LEFT JOIN branch_inventory_summary bis ON b.id = bis.branch_id
      LEFT JOIN branch_batch_details bbd ON b.id = bbd.branch_id
      WHERE b.is_active = true
        AND (bis.branch_id IS NOT NULL)
        AND EXISTS (
          SELECT 1 FROM branch_batch_details bbd 
          WHERE bbd.branch_id = b.id 
          AND bbd.batch_available_in_branch > 0
        )
      ORDER BY 
        b.name ASC,
        bbd.fifo_order ASC NULLS LAST,
        bbd.fifo_sequence ASC NULLS LAST,
        bbd.batch_received_at_branch ASC NULLS LAST
    `

    const batchResult = await query(batchDetailsQuery, [productId], {
      logQuery: true,
      timeout: 15000
    })

    // Group results by branch
    const branchMap = new Map<string, BranchBatchDetails>()
    
    for (const row of batchResult.rows) {
      const branchId = row.branch_id
      
      if (!branchMap.has(branchId)) {
        branchMap.set(branchId, {
          branchId,
          branchName: row.branch_name,
          branchCode: row.branch_code,
          totalQuantity: parseInt(row.branch_total_quantity) || 0,
          totalAvailable: parseInt(row.branch_available_quantity) || 0,
          totalSold: (parseInt(row.branch_total_quantity) || 0) - (parseInt(row.branch_available_quantity) || 0),
          batches: []
        })
      }

      // Add batch details if they exist and have available quantity
      if (row.batch_id && parseInt(row.available_quantity) > 0) {
        const branch = branchMap.get(branchId)!
        branch.batches.push({
          batchId: row.batch_id,
          batchNumber: row.batch_number,
          quantity: parseInt(row.quantity) || 0,
          availableQuantity: parseInt(row.available_quantity) || 0,
          costPrice: parseFloat(row.cost_price) || 0,
          wholesalePrice: row.wholesale_price ? parseFloat(row.wholesale_price) : null,
          retailPrice: parseFloat(row.retail_price) || 0,
          receivedDate: row.received_date,
          branchReceivedDate: row.batch_received_at_branch,
          receivedBy: row.received_by,
          receivedByName: row.received_by_name,
          fifoSequence: row.fifo_sequence,
          fifoOrder: row.fifo_order,
          isActive: row.batch_is_active,
          isBatchItemActive: row.batch_item_active
        })
      }
    }

    const branches = Array.from(branchMap.values())

    // Calculate summary
    const summary = {
      totalBranches: branches.length,
      totalQuantityAllBranches: branches.reduce((sum, branch) => sum + branch.totalQuantity, 0),
      totalAvailableAllBranches: branches.reduce((sum, branch) => sum + branch.totalAvailable, 0),
      totalSoldAllBranches: branches.reduce((sum, branch) => sum + branch.totalSold, 0)
    }

    const responseData: ProductBatchResponse = {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      branches,
      summary
    }

    const duration = Date.now() - startTime

    return NextResponse.json<ApiResponse<ProductBatchResponse>>({
      success: true,
      data: responseData,
      message: `Successfully retrieved batch details for product ${product.name}`,
      timestamp: new Date().toISOString(),
      metadata: {
        duration,
        branchCount: branches.length,
        totalBatches: branches.reduce((sum, branch) => sum + branch.batches.length, 0)
      }
    })

  } catch (error: any) {
    console.error('❌ Error fetching product batch details:', error)
    
    const duration = Date.now() - startTime
    
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: 'Failed to fetch product batch details',
      errors: [
        {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      ],
      timestamp: new Date().toISOString(),
      metadata: {
        duration,
        productId: (await context.params).id
      }
    }, { status: 500 })
  }
}