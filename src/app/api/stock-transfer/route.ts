// app/api/stock-transfer/route.ts
import { query, transaction } from '@/lib/database/connection'
import cuid from 'cuid'
import { id } from 'date-fns/locale'
import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'

// ========== Types ==========
interface TransferRequest {
  revived_branch_id: string // receiving branch (CUID)
  send_branch_id: string    // sending branch (CUID)
  products: {
    product_id: string
    batches: {
      batch_id: string
      count: number
    }[]
  }[]
  requested_by?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  notes?: string
}

interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message: string
  errors?: any[] | null
  timestamp: string
}

// ========== Validation ==========
function validateTransferRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.revived_branch_id || typeof data.revived_branch_id !== 'string') {
    errors.push('revived_branch_id is required and must be a valid string')
  }
  if (!data.send_branch_id || typeof data.send_branch_id !== 'string') {
    errors.push('send_branch_id is required and must be a valid string')
  }
  if (data.revived_branch_id === data.send_branch_id) {
    errors.push('Source and destination branches cannot be the same')
  }
  
  // Validate CUID format (basic check)
  const cuidRegex = /^c[a-z0-9]{24}$/
  if (data.revived_branch_id && !cuidRegex.test(data.revived_branch_id)) {
    errors.push('revived_branch_id must be a valid CUID format')
  }
  if (data.send_branch_id && !cuidRegex.test(data.send_branch_id)) {
    errors.push('send_branch_id must be a valid CUID format')
  }
   if (data.requested_by && !cuidRegex.test(data.requested_by)) {
    errors.push('send_request_id must be a valid CUID format')
  }
  
  if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
    errors.push('products array is required and cannot be empty')
  } else {
    data.products.forEach((product: any, index: number) => {
      if (!product.product_id) {
        errors.push(`Product ${index}: product_id is required`)
      }
      if (!product.batches || !Array.isArray(product.batches) || product.batches.length === 0) {
        errors.push(`Product ${index}: batches array is required and cannot be empty`)
      } else {
        product.batches.forEach((batch: any, batchIndex: number) => {
          if (!batch.batch_id) {
            errors.push(`Product ${index}, Batch ${batchIndex}: batch_id is required`)
          }
          if (!batch.count || batch.count <= 0) {
            errors.push(`Product ${index}, Batch ${batchIndex}: count must be greater than 0`)
          }
        })
      }
    })
  }

  return { isValid: errors.length === 0, errors }
}

// ========== Business Logic ==========
async function generateTransferNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  
  const result = await query(`
    SELECT COUNT(*) as count 
    FROM stock_transfer_requests 
    WHERE request_number LIKE $1
  `, [`TR${year}${month}%`])
  
  const count = parseInt(result.rows[0].count) + 1
  return `TR${year}${month}${String(count).padStart(4, '0')}`
}

async function validateBranches(sendBranchId: string, receiveBranchId: string): Promise<void> {
  const result = await query(`
    SELECT id, name, is_active 
    FROM branches 
    WHERE id = ANY($1)
  `, [[sendBranchId, receiveBranchId]])
  
  if (result.rows.length !== 2) {
    throw new Error('One or both branches not found')
  }
  
  const inactiveBranches = result.rows.filter(branch => !branch.is_active)
  if (inactiveBranches.length > 0) {
    throw new Error(`Inactive branches: ${inactiveBranches.map(b => b.name).join(', ')}`)
  }
}

async function validateInventoryAvailability(
  client: PoolClient,
  sendBranchId: string,
  products: TransferRequest['products']
): Promise<void> {
  for (const product of products) {
    for (const batch of product.batches) {
      const result = await client.query(`
        SELECT 
          bii.quantity,
          bii.reserved_quantity,
          (bii.quantity - bii.reserved_quantity) as available_quantity,
          p.name as product_name,
          pb.batch_number
        FROM branch_inventory_items bii
        JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
        JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
        JOIN products p ON bi.product_id = p.id
        WHERE bi.branch_id = $1 
          AND bi.product_id = $2 
          AND pb.id = $3
      `, [sendBranchId, product.product_id, batch.batch_id])
      
      if (result.rows.length === 0) {
        throw new Error(`Batch ${batch.batch_id} not found for product ${product.product_id} in source branch`)
      }
      
      const inventoryItem = result.rows[0]
      if (inventoryItem.available_quantity < batch.count) {
        throw new Error(
          `Insufficient stock for product ${inventoryItem.product_name} ` +
          `(Batch: ${inventoryItem.batch_number}). ` +
          `Available: ${inventoryItem.available_quantity}, Requested: ${batch.count}`
        )
      }
    }
  }
}

async function createTransferRequest(
  client: PoolClient,
  transferData: TransferRequest,
  transferNumber: string
): Promise<string> {

  const transfer_id = cuid()
  const result = await client.query(`
    INSERT INTO stock_transfer_requests (
      id,
      request_number,
      from_branch_id,
      to_branch_id,
      requested_by,
      priority,
      notes,
      status,
      requested_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7,$8, NOW())
    RETURNING id
  `, [
    transfer_id,
    transferNumber,
    transferData.send_branch_id,
    transferData.revived_branch_id,
    transferData.requested_by,
    transferData.priority || 'NORMAL',
    transferData.notes || null,
    'PENDING'
  ])
  
  return result.rows[0].id
}

async function createTransferItems(
  client: PoolClient,
  transferRequestId: string,
  products: TransferRequest['products']
): Promise<void> {
  for (const product of products) {
    for (const batch of product.batches) {
      // Get batch details for pricing
      const batchResult = await client.query(`
        SELECT cost_price, wholesale_price, retail_price
        FROM purchase_batches
        WHERE id = $1
      `, [batch.batch_id])
      
      if (batchResult.rows.length === 0) {
        throw new Error(`Batch ${batch.batch_id} not found`)
      }
      
      const batchData = batchResult.rows[0]
      const transfer_items_id = cuid();
      
      await client.query(`
        INSERT INTO stock_transfer_items (
          id,
          transfer_request_id,
          product_id,
          batch_id,
          quantity_requested,
          unit_cost_price,
          unit_wholesale_price,
          unit_retail_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7,$8)
      `, [
        transfer_items_id,
        transferRequestId,
        product.product_id,
        batch.batch_id,
        batch.count,
        batchData.cost_price,
        batchData.wholesale_price,
        batchData.retail_price
      ])
    }
  }
}

async function reserveInventory(
  client: PoolClient,
  sendBranchId: string,
  products: TransferRequest['products']
): Promise<void> {
  for (const product of products) {
    for (const batch of product.batches) {
      // Reserve quantity in source branch
      await client.query(`
        UPDATE branch_inventory_items 
        SET reserved_quantity = reserved_quantity + $1
        WHERE branch_inventory_id = (
          SELECT id FROM branch_inventory 
          WHERE branch_id = $2 AND product_id = $3
        ) AND purchase_batch_id = $4
      `, [batch.count, sendBranchId, product.product_id, batch.batch_id])
      
      // Update main inventory reserved quantity
      await client.query(`
        UPDATE branch_inventory 
        SET reserved_quantity = reserved_quantity + $1
        WHERE branch_id = $2 AND product_id = $3
      `, [batch.count, sendBranchId, product.product_id])
    }
  }
}

async function createStockLedgerEntries(
  client: PoolClient,
  transferRequestId: string,
  sendBranchId: string,
  receiveBranchId: string,
  products: TransferRequest['products']
): Promise<void> {
  for (const product of products) {
    for (const batch of product.batches) {
      // Get batch pricing for ledger
      const batchResult = await client.query(`
        SELECT cost_price, retail_price
        FROM purchase_batches
        WHERE id = $1
      `, [batch.batch_id])
      
      const batchData = batchResult.rows[0]
      const product_stock_ledgers_id_in= cuid();
      // Create TRANSFER_OUT entry for source branch
      await client.query(`
        INSERT INTO product_stock_ledgers (
          id,
          product_id,
          branch_id,
          batch_id,
          quantity,
          entry_type,
          reference_type,
          reference_id,
          cost_price,
          selling_price,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)
      `, [
        product_stock_ledgers_id_in,
        product.product_id,
        sendBranchId,
        batch.batch_id,
        -batch.count, // Negative for outgoing
        'TRANSFER_OUT',
        'TRANSFER_REQUEST',
        transferRequestId,
        batchData.cost_price,
        batchData.retail_price,
        `Transfer out to branch ${receiveBranchId}`
      ])
            const product_stock_ledgers_id_out= cuid();

      // Create TRANSFER_IN entry for destination branch
      await client.query(`
        INSERT INTO product_stock_ledgers (
        id,
          product_id,
          branch_id,
          batch_id,
          quantity,
          entry_type,
          reference_type,
          reference_id,
          cost_price,
          selling_price,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)
      `, [
        product_stock_ledgers_id_out,
        product.product_id,
        receiveBranchId,
        batch.batch_id,
        batch.count, // Positive for incoming
        'TRANSFER_IN',
        'TRANSFER_REQUEST',
        transferRequestId,
        batchData.cost_price,
        batchData.retail_price,
        `Transfer in from branch ${sendBranchId}`
      ])
    }
  }
}

async function createTransferLog(
  client: PoolClient,
  transferRequestId: string,
  employeeId: string | null,
  action: string,
  notes?: string
): Promise<void> {
  const stock_transfer_logs = cuid()
  await client.query(`
    INSERT INTO stock_transfer_logs (
    id,
      transfer_request_id,
      employee_id,
      action_type,
      notes,
      metadata
    ) VALUES ($1, $2, $3, $4, $5,$6)
  `, [
    stock_transfer_logs,
    transferRequestId,
    employeeId,
    action,
    notes || `Transfer request created`,
    JSON.stringify({ timestamp: new Date().toISOString() })
  ])
}

// ========== API Handler ==========
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    // Parse request body
    const body: TransferRequest = await request.json()
    console.log(body)
    // Validate request
    const validation = validateTransferRequest(body)
    if (!validation.isValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Validation failed',
        errors: validation.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    // Execute transfer transaction
    const result = await transaction(async (client) => {
      // 1. Validate branches
      await validateBranches(body.send_branch_id, body.revived_branch_id)
      
      // 2. Validate inventory availability
      await validateInventoryAvailability(client, body.send_branch_id, body.products)
      
      // 3. Generate transfer number
      const transferNumber = await generateTransferNumber()
      
      // 4. Create transfer request
      const transferRequestId = await createTransferRequest(client, body, transferNumber)
      
      // 5. Create transfer items
      await createTransferItems(client, transferRequestId, body.products)
      
      // 6. Reserve inventory
      await reserveInventory(client, body.send_branch_id, body.products)
      
      // 7. Create stock ledger entries
      await createStockLedgerEntries(
        client,
        transferRequestId,
        body.send_branch_id,
        body.revived_branch_id,
        body.products
      )
      
      // 8. Create transfer log
      await createTransferLog(
        client,
        transferRequestId,
        body.requested_by || null,
        'PENDING',
        'Transfer request created and inventory reserved'
      )
      
      return {
        transferRequestId,
        transferNumber,
        status: 'PENDING'
      }
    }, { timeout: 60000 })
    
    const duration = Date.now() - startTime
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: 'Stock transfer request created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    console.error('❌ Stock transfer API error:', {
      error: error.message,
      duration,
      stack: error.stack
    })
    
    // Handle specific database errors
    let statusCode = 500
    let message = 'Internal server error'
    
    if (error.message.includes('not found')) {
      statusCode = 404
      message = error.message
    } else if (error.message.includes('Insufficient stock') || 
               error.message.includes('Validation failed')) {
      statusCode = 400
      message = error.message
    } else if (error.message.includes('Circuit breaker')) {
      statusCode = 503
      message = 'Service temporarily unavailable'
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message,
      errors: [error.message],
      timestamp: new Date().toISOString()
    }, { status: statusCode })
  }
}

// ========== GET Handler for Transfer Status ==========
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const transferId = searchParams.get('id')
    const transferNumber = searchParams.get('number')
    
    if (!transferId && !transferNumber) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Transfer ID or transfer number is required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    const whereClause = transferId ? 'str.id = $1' : 'str.request_number = $1'
    const paramValue = transferId || transferNumber
    
    const result = await query(`
      SELECT 
        str.*,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        e1.name as requested_by_name,
        e2.name as approved_by_name,
        json_agg(
          json_build_object(
            'id', sti.id,
            'product_id', sti.product_id,
            'batch_id', sti.batch_id,
            'quantity_requested', sti.quantity_requested,
            'quantity_approved', sti.quantity_approved,
            'quantity_dispatched', sti.quantity_dispatched,
            'quantity_received', sti.quantity_received,
            'unit_cost_price', sti.unit_cost_price,
            'unit_retail_price', sti.unit_retail_price,
            'product_name', p.name,
            'batch_number', pb.batch_number
          )
        ) as items
      FROM stock_transfer_requests str
      LEFT JOIN branches fb ON str.from_branch_id = fb.id
      LEFT JOIN branches tb ON str.to_branch_id = tb.id
      LEFT JOIN employees e1 ON str.requested_by = e1.id
      LEFT JOIN employees e2 ON str.approved_by = e2.id
      LEFT JOIN stock_transfer_items sti ON str.id = sti.transfer_request_id
      LEFT JOIN products p ON sti.product_id = p.id
      LEFT JOIN purchase_batches pb ON sti.batch_id = pb.id
      WHERE ${whereClause}
      GROUP BY str.id, fb.name, tb.name, e1.name, e2.name
    `, [paramValue])
    
    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Transfer request not found',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Transfer request retrieved successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Get transfer API error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: 'Failed to retrieve transfer request',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}