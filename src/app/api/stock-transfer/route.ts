// app/api/stock-transfer/route.ts
import { query, transaction } from '@/lib/database/connection'
import { createId } from '@paralleldrive/cuid2'
import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { z } from 'zod'

// ========== Updated Types for Item-wise Transfer ==========
interface TransferRequest {
  to_branch_id: string      // receiving branch (CUID) - renamed from revived_branch_id
  from_branch_id: string    // sending branch (CUID) - renamed from send_branch_id
  transfer_items: {
    product_id: string
    transfer_type: 'BATCH' | 'INDIVIDUAL'  // NEW: Transfer by batch or individual items
    batches?: {
      batch_id: string
      quantity: number      // For batch transfer
    }[]
    individual_items?: {
      item_barcode_id: string  // NEW: Individual item barcode IDs
    }[]
  }[]
  requested_by?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  notes?: string
  reason?: string           // NEW: Transfer reason
}

interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message: string
  errors?: any[] | null
  timestamp: string
}

// ========== Zod Validation Schemas ==========
const transferItemSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  transfer_type: z.enum(['BATCH', 'INDIVIDUAL']),
  batches: z.array(z.object({
    batch_id: z.string().min(1, 'Batch ID is required'),
    quantity: z.number().int().positive('Quantity must be positive')
  })).optional(),
  individual_items: z.array(z.object({
    item_barcode_id: z.string().min(1, 'Item barcode ID is required')
  })).optional()
}).refine(
  (data) => {
    if (data.transfer_type === 'BATCH') {
      return data.batches && data.batches.length > 0
    } else {
      return data.individual_items && data.individual_items.length > 0
    }
  },
  {
    message: "Batches required for BATCH transfer, individual_items required for INDIVIDUAL transfer"
  }
)

const transferRequestSchema = z.object({
  to_branch_id: z.string().min(1, 'Destination branch ID is required'),
  from_branch_id: z.string().min(1, 'Source branch ID is required'),
  transfer_items: z.array(transferItemSchema).min(1, 'At least one transfer item is required'),
  requested_by: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  notes: z.string().optional(),
  reason: z.string().optional()
}).refine(
  (data) => data.from_branch_id !== data.to_branch_id,
  {
    message: "Source and destination branches cannot be the same",
    path: ["to_branch_id"]
  }
)

// ========== Helper Functions ==========
function generateCuid(): string {
  return createId()
}

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

// ========== Validation Functions ==========
async function validateBranches(fromBranchId: string, toBranchId: string): Promise<void> {
  const result = await query(`
    SELECT id, name, is_active 
    FROM branches 
    WHERE id = ANY($1)
  `, [[fromBranchId, toBranchId]])
  
  if (result.rows.length !== 2) {
    throw new Error('One or both branches not found')
  }
  
  const inactiveBranches = result.rows.filter(branch => !branch.is_active)
  if (inactiveBranches.length > 0) {
    throw new Error(`Inactive branches: ${inactiveBranches.map(b => b.name).join(', ')}`)
  }
}

async function validateBatchAvailability(
  client: PoolClient,
  fromBranchId: string,
  productId: string,
  batchId: string,
  requestedQuantity: number
): Promise<void> {
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
      AND bii.is_active = true
  `, [fromBranchId, productId, batchId])
  
  if (result.rows.length === 0) {
    throw new Error(`Batch ${batchId} not found for product in source branch`)
  }
  
  const inventoryItem = result.rows[0]
  if (inventoryItem.available_quantity < requestedQuantity) {
    throw new Error(
      `Insufficient stock for product ${inventoryItem.product_name} ` +
      `(Batch: ${inventoryItem.batch_number}). ` +
      `Available: ${inventoryItem.available_quantity}, Requested: ${requestedQuantity}`
    )
  }
}

async function validateIndividualItemAvailability(
  client: PoolClient,
  fromBranchId: string,
  itemBarcodeIds: string[]
): Promise<void> {
  const result = await client.query(`
    SELECT 
      ib.id,
      ib.code,
      ib.status,
      ib.location_branch,
      p.name as product_name
    FROM item_barcodes ib
    JOIN products p ON ib.product_id = p.id
    WHERE ib.id = ANY($1)
      AND ib.is_active = true
  `, [itemBarcodeIds])
  
  if (result.rows.length !== itemBarcodeIds.length) {
    const foundIds = result.rows.map(r => r.id)
    const missingIds = itemBarcodeIds.filter(id => !foundIds.includes(id))
    throw new Error(`Item barcodes not found: ${missingIds.join(', ')}`)
  }
  
  // Check if items are available for transfer
  for (const item of result.rows) {
    if (item.status !== 'AVAILABLE') {
      throw new Error(`Item ${item.code} is not available for transfer. Status: ${item.status}`)
    }
    
    if (item.location_branch !== fromBranchId) {
      throw new Error(`Item ${item.code} is not in the source branch`)
    }
  }
}

async function validateTransferAvailability(
  client: PoolClient,
  fromBranchId: string,
  transferItems: TransferRequest['transfer_items']
): Promise<void> {
  for (const item of transferItems) {
    if (item.transfer_type === 'BATCH' && item.batches) {
      for (const batch of item.batches) {
        await validateBatchAvailability(
          client,
          fromBranchId,
          item.product_id,
          batch.batch_id,
          batch.quantity
        )
      }
    } else if (item.transfer_type === 'INDIVIDUAL' && item.individual_items) {
      const itemBarcodeIds = item.individual_items.map(i => i.item_barcode_id)
      await validateIndividualItemAvailability(client, fromBranchId, itemBarcodeIds)
    }
  }
}

// ========== Database Operations ==========
async function createTransferRequest(
  client: PoolClient,
  transferData: TransferRequest,
  transferNumber: string
): Promise<string> {
  const transferRequestId = generateCuid()
  
  const result = await client.query(`
    INSERT INTO stock_transfer_requests (
      id, request_number, from_branch_id, to_branch_id,
      requested_by, priority, request_reason, notes,
      status, requested_at, approved_at, dispatched_at, completed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW(), NOW())
    RETURNING id
  `, [
    transferRequestId,
    transferNumber,
    transferData.from_branch_id,
    transferData.to_branch_id,
    transferData.requested_by || null,
    transferData.priority || 'NORMAL',
    transferData.reason || 'Stock transfer between branches',
    transferData.notes || null,
    'COMPLETED' // Immediately mark as completed
  ])
  
  return result.rows[0].id
}

async function createTransferItems(
  client: PoolClient,
  transferRequestId: string,
  transferItems: TransferRequest['transfer_items']
): Promise<void> {
  for (const item of transferItems) {
    if (item.transfer_type === 'BATCH' && item.batches) {
      // Handle batch transfers
      for (const batch of item.batches) {
        await createBatchTransferItem(client, transferRequestId, item.product_id, batch)
      }
    } else if (item.transfer_type === 'INDIVIDUAL' && item.individual_items) {
      // Handle individual item transfers
      for (const individualItem of item.individual_items) {
        await createIndividualTransferItem(
          client, 
          transferRequestId, 
          item.product_id, 
          individualItem.item_barcode_id
        )
      }
    }
  }
}

async function createBatchTransferItem(
  client: PoolClient,
  transferRequestId: string,
  productId: string,
  batch: { batch_id: string; quantity: number }
): Promise<void> {
  // Get batch pricing information
  const batchResult = await client.query(`
    SELECT cost_price, wholesale_price, retail_price
    FROM purchase_batches
    WHERE id = $1
  `, [batch.batch_id])
  
  if (batchResult.rows.length === 0) {
    throw new Error(`Batch ${batch.batch_id} not found`)
  }
  
  const batchData = batchResult.rows[0]
  const transferItemId = generateCuid()
  
  await client.query(`
    INSERT INTO stock_transfer_items (
      id, transfer_request_id, product_id, batch_id,
      quantity_requested, quantity_approved, quantity_dispatched, quantity_received,
      unit_cost_price, unit_wholesale_price, unit_retail_price,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
    transferItemId,
    transferRequestId,
    productId,
    batch.batch_id,
    batch.quantity,
    batch.quantity,
    batch.quantity,
    batch.quantity,
    batchData.cost_price,
    batchData.wholesale_price,
    batchData.retail_price,
    `Batch transfer: ${batch.quantity} units`
  ])
}

async function createIndividualTransferItem(
  client: PoolClient,
  transferRequestId: string,
  productId: string,
  itemBarcodeId: string
): Promise<void> {
  // Get item and batch information
  const itemResult = await client.query(`
    SELECT 
      ib.purchase_batch_id,
      ib.purchase_cost,
      pb.wholesale_price,
      pb.retail_price,
      ib.code
    FROM item_barcodes ib
    JOIN purchase_batches pb ON ib.purchase_batch_id = pb.id
    WHERE ib.id = $1
  `, [itemBarcodeId])
  
  if (itemResult.rows.length === 0) {
    throw new Error(`Item barcode ${itemBarcodeId} not found`)
  }
  
  const itemData = itemResult.rows[0]
  const transferItemId = generateCuid()
  console.log("ssds",itemData.purchase_batch_id)
  await client.query(`
    INSERT INTO stock_transfer_items (
      id, transfer_request_id, product_id, batch_id,
      quantity_requested, quantity_approved, quantity_dispatched, quantity_received,
      unit_cost_price, unit_wholesale_price, unit_retail_price,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
    transferItemId,
    transferRequestId,
    productId,
    itemData.purchase_batch_id,
    1, // Individual items are quantity 1
    1,
    1,
    1,
    itemData.purchase_cost,
    itemData.wholesale_price,
    itemData.retail_price,
    `Individual item transfer: ${itemData.code}`
  ])
}

async function executeItemTransfers(
  client: PoolClient,
  transferRequestId: string,
  fromBranchId: string,
  toBranchId: string,
  transferItems: TransferRequest['transfer_items'],
  requestedBy?: string
): Promise<void> {
  for (const item of transferItems) {
    if (item.transfer_type === 'BATCH' && item.batches) {
      // Handle batch transfers
      for (const batch of item.batches) {
        await executeBatchTransfer(
          client, 
          transferRequestId, 
          fromBranchId, 
          toBranchId, 
          item.product_id, 
          batch,
          requestedBy
        )
      }
    } else if (item.transfer_type === 'INDIVIDUAL' && item.individual_items) {
      // Handle individual item transfers
      for (const individualItem of item.individual_items) {
        await executeIndividualItemTransfer(
          client, 
          transferRequestId, 
          fromBranchId, 
          toBranchId, 
          individualItem.item_barcode_id,
          requestedBy
        )
      }
    }
  }
}

async function executeBatchTransfer(
  client: PoolClient,
  transferRequestId: string,
  fromBranchId: string,
  toBranchId: string,
  productId: string,
  batch: { batch_id: string; quantity: number },
  requestedBy?: string
): Promise<void> {
  // Get batch details
  const batchResult = await client.query(`
    SELECT cost_price, wholesale_price, retail_price, received_date, expiry_date
    FROM purchase_batches
    WHERE id = $1
  `, [batch.batch_id])
  
  const batchData = batchResult.rows[0]
  
  // 1. Update source branch inventory items
  await client.query(`
    UPDATE branch_inventory_items 
    SET quantity = quantity - $1,
        updated_at = NOW()
    WHERE branch_inventory_id = (
      SELECT id FROM branch_inventory 
      WHERE branch_id = $2 AND product_id = $3
    ) AND purchase_batch_id = $4
  `, [batch.quantity, fromBranchId, productId, batch.batch_id])
  
  // 2. Update source branch main inventory
  await client.query(`
    UPDATE branch_inventory 
    SET total_quantity = total_quantity - $1,
        last_sale_date = NOW(),
        updated_at = NOW()
    WHERE branch_id = $2 AND product_id = $3
  `, [batch.quantity, fromBranchId, productId])
  
  // 3. Handle destination branch inventory
  await updateDestinationInventory(
    client, 
    toBranchId, 
    productId, 
    batch.batch_id, 
    batch.quantity, 
    batchData
  )
  
  // 4. Create stock ledger entries
  await createBatchStockLedgerEntries(
    client, 
    transferRequestId, 
    fromBranchId, 
    toBranchId, 
    productId, 
    batch, 
    batchData
  )
}

async function executeIndividualItemTransfer(
  client: PoolClient,
  transferRequestId: string,
  fromBranchId: string,
  toBranchId: string,
  itemBarcodeId: string,
  requestedBy?: string
): Promise<void> {
  // 1. Update item barcode location and create movement history
  await client.query(`
    UPDATE item_barcodes 
    SET location_branch = $1,
        updated_at = NOW()
    WHERE id = $2
  `, [toBranchId, itemBarcodeId])
  
  // 2. Create item movement history
  const movementId = generateCuid()
  await client.query(`
    INSERT INTO item_movement_history (
      id, item_id, from_branch, to_branch, movement_type,
      reference_id, moved_by, reason, moved_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  `, [
    movementId,
    itemBarcodeId,
    fromBranchId,
    toBranchId,
    'TRANSFER_OUT',
    transferRequestId,
    requestedBy || null,
    'Individual item transfer between branches'
  ])
  
  // 3. Get item details for inventory updates
  const itemResult = await client.query(`
    SELECT 
      ib.product_id,
      ib.purchase_batch_id,
      ib.purchase_cost,
      pb.wholesale_price,
      pb.retail_price
    FROM item_barcodes ib
    JOIN purchase_batches pb ON ib.purchase_batch_id = pb.id
    WHERE ib.id = $1
  `, [itemBarcodeId])
  
  const itemData = itemResult.rows[0]
  
  // 4. Update source branch inventory (decrease by 1)
  await client.query(`
    UPDATE branch_inventory_items 
    SET quantity = quantity - 1,
        updated_at = NOW()
    WHERE branch_inventory_id = (
      SELECT id FROM branch_inventory 
      WHERE branch_id = $1 AND product_id = $2
    ) AND purchase_batch_id = $3
  `, [fromBranchId, itemData.product_id, itemData.purchase_batch_id])
  
  await client.query(`
    UPDATE branch_inventory 
    SET total_quantity = total_quantity - 1,
        updated_at = NOW()
    WHERE branch_id = $1 AND product_id = $2
  `, [fromBranchId, itemData.product_id])
  
  // 5. Update destination branch inventory (increase by 1)
  await updateDestinationInventory(
    client, 
    toBranchId, 
    itemData.product_id, 
    itemData.purchase_batch_id, 
    1, 
    {
      cost_price: itemData.purchase_cost,
      wholesale_price: itemData.wholesale_price,
      retail_price: itemData.retail_price,
      received_date: new Date(),
      expiry_date: null
    }
  )
  
  // 6. Create stock ledger entries for individual item
  await createIndividualItemStockLedgerEntries(
    client, 
    transferRequestId, 
    fromBranchId, 
    toBranchId, 
    itemData
  )
}

async function updateDestinationInventory(
  client: PoolClient,
  toBranchId: string,
  productId: string,
  batchId: string,
  quantity: number,
  batchData: any
): Promise<void> {
  // Check if destination branch has inventory record for this product
  const destInventoryResult = await client.query(`
    SELECT id, total_quantity, average_cost_price 
    FROM branch_inventory 
    WHERE branch_id = $1 AND product_id = $2
  `, [toBranchId, productId])
  
  let destInventoryId: string
  
  if (destInventoryResult.rows.length === 0) {
    // Create new inventory record for destination branch
    destInventoryId = generateCuid()
    await client.query(`
      INSERT INTO branch_inventory (
        id, branch_id, product_id, total_quantity, reserved_quantity,
        low_stock_threshold, reorder_quantity, last_restock_date, average_cost_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
    `, [
      destInventoryId, 
      toBranchId, 
      productId, 
      quantity, 
      0, 
      5, 
      20, 
      batchData.cost_price
    ])
  } else {
    // Update existing inventory record with weighted average cost
    const current = destInventoryResult.rows[0]
    const currentQty = current.total_quantity || 0
    const currentAvgCost = current.average_cost_price || 0
    
    const newTotalQty = currentQty + quantity
    const newAvgCost = newTotalQty > 0 
      ? ((currentQty * currentAvgCost + quantity * batchData.cost_price) / newTotalQty)
      : batchData.cost_price
    
    destInventoryId = current.id
    await client.query(`
      UPDATE branch_inventory 
      SET total_quantity = total_quantity + $1,
          average_cost_price = $2,
          last_restock_date = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [quantity, Number(newAvgCost.toFixed(2)), destInventoryId])
  }
  
  // Check if destination branch already has this batch
  const existingBatchResult = await client.query(`
    SELECT id, quantity FROM branch_inventory_items
    WHERE branch_inventory_id = $1 AND purchase_batch_id = $2
  `, [destInventoryId, batchId])
  
  if (existingBatchResult.rows.length === 0) {
    // Create new batch item in destination branch
    const branchInventoryItemId = generateCuid()
    
    // Get next FIFO order
    const fifoQuery = `
      SELECT COALESCE(MAX(fifo_order), 0) + 1 as next_order
      FROM branch_inventory_items
      WHERE branch_inventory_id = $1
    `
    const fifoResult = await client.query(fifoQuery, [destInventoryId])
    const fifoOrder = fifoResult.rows[0].next_order
    
    await client.query(`
      INSERT INTO branch_inventory_items (
        id, branch_inventory_id, purchase_batch_id, quantity, reserved_quantity,
        cost_price, wholesale_price, retail_price, received_date, expiry_date,
        is_active, fifo_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, true, $10)
    `, [
      branchInventoryItemId,
      destInventoryId,
      batchId,
      quantity,
      0,
      batchData.cost_price,
      batchData.wholesale_price,
      batchData.retail_price,
      batchData.expiry_date,
      fifoOrder
    ])
  } else {
    // Update existing batch quantity in destination branch
    await client.query(`
      UPDATE branch_inventory_items 
      SET quantity = quantity + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [quantity, existingBatchResult.rows[0].id])
  }
}

async function createBatchStockLedgerEntries(
  client: PoolClient,
  transferRequestId: string,
  fromBranchId: string,
  toBranchId: string,
  productId: string,
  batch: { batch_id: string; quantity: number },
  batchData: any
): Promise<void> {
  // Create TRANSFER_OUT entry for source branch
  const outLedgerId = generateCuid()
  await client.query(`
    INSERT INTO product_stock_ledgers (
      id, product_id, branch_id, batch_id, quantity, entry_type,
      reference_type, reference_id, cost_price, selling_price, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    outLedgerId,
    productId,
    fromBranchId,
    batch.batch_id,
    -batch.quantity, // Negative for outgoing
    'TRANSFER_OUT',
    'stock_transfer_request',
    transferRequestId,
    batchData.cost_price,
    batchData.retail_price,
    `Batch transfer out to branch ${toBranchId}`
  ])
  
  // Create TRANSFER_IN entry for destination branch
  const inLedgerId = generateCuid()
  await client.query(`
    INSERT INTO product_stock_ledgers (
      id, product_id, branch_id, batch_id, quantity, entry_type,
      reference_type, reference_id, cost_price, selling_price, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    inLedgerId,
    productId,
    toBranchId,
    batch.batch_id,
    batch.quantity, // Positive for incoming
    'TRANSFER_IN',
    'stock_transfer_request',
    transferRequestId,
    batchData.cost_price,
    batchData.retail_price,
    `Batch transfer in from branch ${fromBranchId}`
  ])
}

async function createIndividualItemStockLedgerEntries(
  client: PoolClient,
  transferRequestId: string,
  fromBranchId: string,
  toBranchId: string,
  itemData: any
): Promise<void> {
  // Create TRANSFER_OUT entry for source branch
  const outLedgerId = generateCuid()
  await client.query(`
    INSERT INTO product_stock_ledgers (
      id, product_id, branch_id, batch_id, quantity, entry_type,
      reference_type, reference_id, cost_price, selling_price, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    outLedgerId,
    itemData.product_id,
    fromBranchId,
    itemData.purchase_batch_id,
    -1, // Negative for outgoing
    'TRANSFER_OUT',
    'stock_transfer_request',
    transferRequestId,
    itemData.purchase_cost,
    itemData.retail_price,
    `Individual item transfer out to branch ${toBranchId}`
  ])
  
  // Create TRANSFER_IN entry for destination branch
  const inLedgerId = generateCuid()
  await client.query(`
    INSERT INTO product_stock_ledgers (
      id, product_id, branch_id, batch_id, quantity, entry_type,
      reference_type, reference_id, cost_price, selling_price, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    inLedgerId,
    itemData.product_id,
    toBranchId,
    itemData.purchase_batch_id,
    1, // Positive for incoming
    'TRANSFER_IN',
    'stock_transfer_request',
    transferRequestId,
    itemData.purchase_cost,
    itemData.retail_price,
    `Individual item transfer in from branch ${fromBranchId}`
  ])
}

async function createTransferLog(
  client: PoolClient,
  transferRequestId: string,
  employeeId: string | null,
  action: string,
  notes?: string
): Promise<void> {
  const transferLogId = generateCuid()
  await client.query(`
    INSERT INTO stock_transfer_logs (
      id, transfer_request_id, employee_id, action_type, notes, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    transferLogId,
    transferRequestId,
    employeeId,
    action,
    notes || 'Stock transfer completed instantly',
    JSON.stringify({ 
      timestamp: new Date().toISOString(),
      auto_completed: true,
      transfer_type: 'INSTANT'
    })
  ])
}

// ========== API Handler ==========
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = transferRequestSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const transferData: TransferRequest = validationResult.data
    
    // Execute transfer transaction
    const result = await transaction(async (client) => {
      // 1. Validate branches
      await validateBranches(transferData.from_branch_id, transferData.to_branch_id)
      
      // 2. Validate inventory availability
      await validateTransferAvailability(client, transferData.from_branch_id, transferData.transfer_items)
      
      // 3. Generate transfer number
      const transferNumber = await generateTransferNumber()
      
      // 4. Create transfer request (marked as COMPLETED)
      const transferRequestId = await createTransferRequest(client, transferData, transferNumber)
      
      // 5. Create transfer items
      await createTransferItems(client, transferRequestId, transferData.transfer_items)
      
      // 6. Execute complete inventory transfers
      await executeItemTransfers(
        client,
        transferRequestId,
        transferData.from_branch_id,
        transferData.to_branch_id,
        transferData.transfer_items,
        transferData.requested_by
      )
      
      // 7. Create transfer completion log
      await createTransferLog(
        client,
        transferRequestId,
        transferData.requested_by || null,
        'COMPLETED',
        'Stock transfer completed instantly - no approval required'
      )
      
      return {
        transferRequestId,
        transferNumber,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        summary: {
          total_batch_transfers: transferData.transfer_items.filter(item => item.transfer_type === 'BATCH').length,
          total_individual_transfers: transferData.transfer_items.filter(item => item.transfer_type === 'INDIVIDUAL').length,
          total_products: transferData.transfer_items.length
        }
      }
    }, { timeout: 120000 }) // Increased timeout for complex transfers
    
    const duration = Date.now() - startTime
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: 'Stock transfer completed successfully',
      timestamp: new Date().toISOString()
    }, { status: 200 })
    
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
               error.message.includes('not available for transfer') ||
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
        fb.code as from_branch_code,
        tb.name as to_branch_name,
        tb.code as to_branch_code,
        e1.name as requested_by_name,
        e2.name as approved_by_name,
        json_agg(
          json_build_object(
            'id', sti.id,
            'product_id', sti.product_id,
            'product_name', p.name,
            'product_sku', p.sku,
            'batch_id', sti.batch_id,
            'batch_number', pb.batch_number,
            'quantity_requested', sti.quantity_requested,
            'quantity_approved', sti.quantity_approved,
            'quantity_dispatched', sti.quantity_dispatched,
            'quantity_received', sti.quantity_received,
            'unit_cost_price', sti.unit_cost_price,
            'unit_wholesale_price', sti.unit_wholesale_price,
            'unit_retail_price', sti.unit_retail_price,
            'notes', sti.notes,
            'individual_items', CASE 
              WHEN sti.quantity_requested = 1 THEN (
                SELECT json_agg(
                  json_build_object(
                    'id', ib.id,
                    'code', ib.code,
                    'status', ib.status,
                    'location_branch', ib.location_branch
                  )
                )
                FROM item_barcodes ib 
                WHERE ib.purchase_batch_id = sti.batch_id 
                  AND ib.location_branch = str.to_branch_id
                  AND ib.product_id = sti.product_id
                LIMIT sti.quantity_received
              )
              ELSE NULL
            END
          )
        ) as items,
        (
          SELECT json_agg(
            json_build_object(
              'id', stl.id,
              'employee_id', stl.employee_id,
              'employee_name', e.name,
              'action_type', stl.action_type,
              'notes', stl.notes,
              'created_at', stl.created_at
            ) ORDER BY stl.created_at
          )
          FROM stock_transfer_logs stl
          LEFT JOIN employees e ON stl.employee_id = e.id
          WHERE stl.transfer_request_id = str.id
        ) as logs
      FROM stock_transfer_requests str
      LEFT JOIN branches fb ON str.from_branch_id = fb.id
      LEFT JOIN branches tb ON str.to_branch_id = tb.id
      LEFT JOIN employees e1 ON str.requested_by = e1.id
      LEFT JOIN employees e2 ON str.approved_by = e2.id
      LEFT JOIN stock_transfer_items sti ON str.id = sti.transfer_request_id
      LEFT JOIN products p ON sti.product_id = p.id
      LEFT JOIN purchase_batches pb ON sti.batch_id = pb.id
      WHERE ${whereClause}
      GROUP BY str.id, fb.name, fb.code, tb.name, tb.code, e1.name, e2.name
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

// ========== Additional Utility Endpoints ==========

// GET available items for transfer from a specific branch
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const productId = searchParams.get('product_id')
    
    if (!branchId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Branch ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    let productFilter = ''
    let queryParams = [branchId]
    
    if (productId) {
      productFilter = 'AND p.id = $2'
      queryParams.push(productId)
    }
    
    // Get available batches for transfer
    const batchResult = await query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        pb.id as batch_id,
        pb.batch_number,
        pb.expiry_date,
        bii.quantity,
        bii.reserved_quantity,
        (bii.quantity - bii.reserved_quantity) as available_quantity,
        bii.cost_price,
        bii.wholesale_price,
        bii.retail_price,
        bii.fifo_order
      FROM branch_inventory_items bii
      JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
      JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
      JOIN products p ON bi.product_id = p.id
      WHERE bi.branch_id = $1 
        AND bii.is_active = true 
        AND (bii.quantity - bii.reserved_quantity) > 0
        ${productFilter}
      ORDER BY p.name, bii.fifo_order
    `, queryParams)
    
    // Get available individual items for transfer
    const itemResult = await query(`
      SELECT 
        ib.id as item_barcode_id,
        ib.code as barcode_code,
        ib.status,
        ib.condition,
        ib.warranty_expiry,
        ib.purchase_cost,
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        pb.id as batch_id,
        pb.batch_number,
        pb.expiry_date
      FROM item_barcodes ib
      JOIN products p ON ib.product_id = p.id
      JOIN purchase_batches pb ON ib.purchase_batch_id = pb.id
      WHERE ib.location_branch = $1 
        AND ib.status = 'AVAILABLE'
        AND ib.is_active = true
        ${productFilter}
      ORDER BY p.name, ib.purchased_at
    `, queryParams)
    
    const availableItems = {
      batches: batchResult.rows,
      individual_items: itemResult.rows,
      summary: {
        total_batches: batchResult.rows.length,
        total_individual_items: itemResult.rows.length,
        products_count: [...new Set([...batchResult.rows, ...itemResult.rows].map(item => item.product_id))].length
      }
    }
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: availableItems,
      message: 'Available items retrieved successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Get available items API error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: 'Failed to retrieve available items',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}