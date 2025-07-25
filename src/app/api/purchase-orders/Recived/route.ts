// app/api/purchase-orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PoolClient } from 'pg'
import { ApiResponse, initDatabase, transaction } from '@/lib/database/connection'
import { createId } from '@paralleldrive/cuid2'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'

// ========== Zod Validation Schemas ==========
const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  cost_price: z.number().positive('Cost price must be positive'),
  wholesale_price: z.number().positive('Wholesale price must be positive').optional(),
  retail_price: z.number().positive('Retail price must be positive'),
  batch_number: z.string().min(1, 'Batch number is required').max(50).optional(),
  is_unique: z.boolean().optional(),
  expiry_date: z.string().datetime().optional().nullable(),
})

const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier ID is required'),
  expected_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
})

type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>
type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>

// ========== Helper Functions ==========

function generateCuid(): string {
  return createId()
}

function calculateLineTotal(quantity: number, costPrice: number): number {
  return Number((quantity * costPrice).toFixed(2))
}

function calculateOrderTotals(items: PurchaseOrderItem[]) {
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateLineTotal(item.quantity, item.cost_price)
  }, 0)

  const totalAmount = Number(subtotal.toFixed(2))

  return { subtotal, totalAmount }
}

// ========== Database Operations ==========

async function createPurchaseOrder(
  user: any,
  client: PoolClient,
  data: PurchaseOrderInput,
  totals: ReturnType<typeof calculateOrderTotals>
): Promise<{ id: string; order_number: string }> {
  const id = generateCuid()

  const query = `
    INSERT INTO purchase_orders (
      id, supplier_id, purchased_by, branch_id,
      expected_date, status, subtotal, total_amount, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, order_number
  `

  const values = [
    id,
    data.supplier_id,
    user.user_id || null,
    user.branch_id,
    data.expected_date || null,
    'COMPLETED',
    totals.subtotal,
    totals.totalAmount,
    data.notes || null
  ]

  const result = await client.query(query, values)
  return result.rows[0]
}

async function createPurchaseOrderItems(
  client: PoolClient,
  purchaseOrderId: string,
  items: PurchaseOrderItem[]
): Promise<Array<{ id: string; product_id: string }>> {
  const createdItems = []

  for (const item of items) {
    const id = generateCuid()
    const lineTotal = calculateLineTotal(item.quantity, item.cost_price)

    const query = `
      INSERT INTO purchase_order_items (
        id, purchase_order_id, product_id, quantity_ordered, quantity_received,
        cost_price, wholesale_price, retail_price, line_total, batch_number, expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, product_id
    `

    const values = [
      id,
      purchaseOrderId,
      item.product_id,
      item.quantity,
      item.quantity, // Mark as received immediately since status is COMPLETED
      item.cost_price,
      item.wholesale_price || null,
      item.retail_price,
      lineTotal,
      item.batch_number || null,
      item.expiry_date || null
    ]

    const result = await client.query(query, values)
    createdItems.push(result.rows[0])
  }

  return createdItems
}

async function createPurchaseBatches(
  client: PoolClient,
  orderItems: Array<{ id: string; product_id: string }>,
  itemsData: PurchaseOrderItem[],
  user:any,
  supplier_id:string
): Promise<string[]> {
  const batchIds: string[] = []

  // Get next FIFO sequence number
  const fifoQuery = `SELECT COALESCE(MAX(fifo_sequence), 0) + 1 as next_sequence FROM purchase_batches`
  const fifoResult = await client.query(fifoQuery)
  let currentFifoSequence = fifoResult.rows[0].next_sequence

  for (let i = 0; i < orderItems.length; i++) {
    const orderItem = orderItems[i]
    const itemData = itemsData[i]
    const batchId = generateCuid()

    // Generate batch number if not provided
    const batchNumber = itemData.batch_number || `BATCH_${Date.now()}_${i + 1}`

    const batchInsertQuery = `
      INSERT INTO purchase_batches (
        id, batch_number, purchase_order_item_id, quantity_ordered,
        quantity_received, cost_price, wholesale_price, retail_price,
        expiry_date, received_date, received_by, is_active, fifo_sequence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `

    const batchInsertValues = [
      batchId,
      batchNumber,
      orderItem.id,
      itemData.quantity,
      itemData.quantity, // Mark as fully received
      itemData.cost_price,
      itemData.wholesale_price || null,
      itemData.retail_price,
      itemData.expiry_date || null,
      new Date().toISOString(), // received_date
      user.user_id,
      true,
      currentFifoSequence++
    ]

    const batchResult = await client.query(batchInsertQuery, batchInsertValues)
    batchIds.push(batchResult.rows[0].id)

    // Create individual item barcodes if item is marked as unique
    if (itemData.is_unique) {
      await createItemBarcodes(client, batchId, orderItem.product_id, itemData, supplier_id,user)
    }
  }

  return batchIds
}

async function createItemBarcodes(
  client: PoolClient,
  batchId: string,
  productId: string,
  itemData: PurchaseOrderItem,
  supplierId: string,
    user:any,
): Promise<void> {
  // Calculate warranty expiry if product has warranty
  const warrantyQuery = `SELECT warranty_period FROM products WHERE id = $1`
  const warrantyResult = await client.query(warrantyQuery, [productId])
  const warrantyPeriod = warrantyResult.rows[0]?.warranty_period

  let warrantyExpiry = null
  if (warrantyPeriod) {
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + warrantyPeriod)
    warrantyExpiry = expiry.toISOString().split('T')[0] // Date only
  }

  for (let j = 0; j < itemData.quantity; j++) {
    const itemBarcodeId = generateCuid()

    // Get next barcode sequence number
    const { rows } = await client.query(`SELECT nextval('barcode_sequence')`)
    const seq = rows[0].nextval
    const paddedSeq = String(seq).padStart(8, '0')
    const barcodeCode = `ITEM${paddedSeq}`

    const itemBarcodeQuery = `
      INSERT INTO item_barcodes (
        id, purchase_batch_id, product_id, code, type, status,
        purchased_at, purchase_cost, supplier_id, warranty_expiry,
        condition, location_branch, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `

    const itemBarcodeValues = [
      itemBarcodeId,
      batchId,
      productId,
      barcodeCode,
      'INTERNAL',
      'AVAILABLE',
      new Date().toISOString(),
      itemData.cost_price,
      supplierId,
      warrantyExpiry,
      'GOOD',
      user.branch_id, // Current location
      true
    ]

    await client.query(itemBarcodeQuery, itemBarcodeValues)

    // Create movement history entry
    await createItemMovementHistory(client, itemBarcodeId, null, user.branch_id, 'PURCHASE_RECEIVED', null, user.user_id)
  }
}

async function createItemMovementHistory(
  client: PoolClient,
  itemId: string,
  fromBranch: string | null,
  toBranch: string | null,
  movementType: string,
  referenceId: string | null,
  movedBy: string | null,
  reason?: string
): Promise<void> {
  const movementId = generateCuid()

  const query = `
    INSERT INTO item_movement_history (
      id, item_id, from_branch, to_branch, movement_type,
      reference_id, moved_by, reason, moved_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `

  await client.query(query, [
    movementId,
    itemId,
    fromBranch,
    toBranch,
    movementType,
    referenceId,
    movedBy,
    reason || `${movementType.replace('_', ' ').toLowerCase()}`,
    new Date().toISOString()
  ])
}

async function updateProductPriceHistory(
  client: PoolClient,
  productId: string,
  itemData: PurchaseOrderItem,
  createdBy?: string
): Promise<void> {
  // Check if there's already an active price for today
  const checkQuery = `
    SELECT 1 FROM product_price_history 
    WHERE product_id = $1 
    AND DATE(effective_date) = CURRENT_DATE 
    AND is_active = true
  `
  
  const existing = await client.query(checkQuery, [productId])
  
  if (existing.rows.length === 0) {
    const priceHistoryId = generateCuid()
    
    const insertQuery = `
      INSERT INTO product_price_history (
        id, product_id, effective_date, cost_price, wholesale_price,
        retail_price, is_active, created_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `

    await client.query(insertQuery, [
      priceHistoryId,
      productId,
      new Date().toISOString(),
      itemData.cost_price,
      itemData.wholesale_price || null,
      itemData.retail_price,
      true,
      createdBy,
      'Purchase order price update'
    ])

    // Update current prices table
    const upsertCurrentPriceQuery = `
      INSERT INTO product_current_prices (
        product_id, cost_price, wholesale_price, retail_price, last_updated
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (product_id) 
      DO UPDATE SET 
        cost_price = EXCLUDED.cost_price,
        wholesale_price = EXCLUDED.wholesale_price,
        retail_price = EXCLUDED.retail_price,
        last_updated = EXCLUDED.last_updated
    `

    await client.query(upsertCurrentPriceQuery, [
      productId,
      itemData.cost_price,
      itemData.wholesale_price || null,
      itemData.retail_price,
      new Date().toISOString()
    ])
  }
}

async function updateBranchInventory(
  client: PoolClient,
  branchId: string,
  items: Array<{ product_id: string; quantity_ordered: number; cost_price: number }>
): Promise<void> {
  for (const item of items) {
    // Check if inventory record exists
    const checkQuery = `
      SELECT id, total_quantity, average_cost_price
      FROM branch_inventory
      WHERE branch_id = $1 AND product_id = $2
    `

    const existing = await client.query(checkQuery, [branchId, item.product_id])

    if (existing.rows.length === 0) {
      // Create new inventory record
      const id = generateCuid()
      const insertQuery = `
        INSERT INTO branch_inventory (
          id, branch_id, product_id, total_quantity, reserved_quantity,
          low_stock_threshold, reorder_quantity, last_restock_date, average_cost_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `

      await client.query(insertQuery, [
        id,
        branchId,
        item.product_id,
        item.quantity_ordered,
        0,
        5, // Default low stock threshold
        20, // Default reorder quantity
        new Date().toISOString(),
        item.cost_price
      ])
    } else {
      // Update existing inventory with weighted average cost
      const current = existing.rows[0]
      const currentQty = current.total_quantity || 0
      const currentAvgCost = current.average_cost_price || 0
      
      const newTotalQty = currentQty + item.quantity_ordered
      const newAvgCost = newTotalQty > 0 
        ? ((currentQty * currentAvgCost + item.quantity_ordered * item.cost_price) / newTotalQty)
        : item.cost_price

      const updateQuery = `
        UPDATE branch_inventory
        SET total_quantity = total_quantity + $1,
            average_cost_price = $2,
            last_restock_date = $3,
            updated_at = $4
        WHERE branch_id = $5 AND product_id = $6
      `

      await client.query(updateQuery, [
        item.quantity_ordered,
        Number(newAvgCost.toFixed(2)),
        new Date().toISOString(),
        new Date().toISOString(),
        branchId,
        item.product_id
      ])
    }
  }
}

async function createBranchInventoryItems(
  client: PoolClient,
  branchId: string,
  batchIds: string[],
  orderItems: Array<{ product_id: string }>,
  itemsData: PurchaseOrderItem[]
): Promise<void> {
  for (let i = 0; i < batchIds.length; i++) {
    const batchId = batchIds[i]
    const orderItem = orderItems[i]
    const itemData = itemsData[i]

    // Get branch inventory ID
    const inventoryQuery = `
      SELECT id FROM branch_inventory
      WHERE branch_id = $1 AND product_id = $2
    `

    const inventoryResult = await client.query(inventoryQuery, [branchId, orderItem.product_id])

    if (inventoryResult.rows.length === 0) {
      throw new Error(`Branch inventory not found for product ${orderItem.product_id}`)
    }

    const branchInventoryId = inventoryResult.rows[0].id
    const id = generateCuid()

    // Get next FIFO order for this inventory
    const fifoQuery = `
      SELECT COALESCE(MAX(fifo_order), 0) + 1 as next_order
      FROM branch_inventory_items
      WHERE branch_inventory_id = $1
    `

    const fifoResult = await client.query(fifoQuery, [branchInventoryId])
    const fifoOrder = fifoResult.rows[0].next_order

    const insertQuery = `
      INSERT INTO branch_inventory_items (
        id, branch_inventory_id, purchase_batch_id, quantity,
        reserved_quantity, cost_price, wholesale_price, retail_price,
        received_date, expiry_date, is_active, fifo_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `

    await client.query(insertQuery, [
      id,
      branchInventoryId,
      batchId,
      itemData.quantity,
      0,
      itemData.cost_price,
      itemData.wholesale_price || null,
      itemData.retail_price,
      new Date().toISOString(),
      itemData.expiry_date || null,
      true,
      fifoOrder
    ])
  }
}

async function createStockLedgerEntries(
  client: PoolClient,
  purchaseOrderId: string,
  branchId: string,
  batchIds: string[],
  orderItems: Array<{ product_id: string }>,
  itemsData: PurchaseOrderItem[]
): Promise<void> {
  for (let i = 0; i < batchIds.length; i++) {
    const batchId = batchIds[i]
    const orderItem = orderItems[i]
    const itemData = itemsData[i]
    const id = generateCuid()

    const query = `
      INSERT INTO product_stock_ledgers (
        id, product_id, branch_id, batch_id, quantity,
        entry_type, reference_id, reference_type,
        cost_price, selling_price, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `

    const batchNumber = itemData.batch_number || `BATCH_${Date.now()}_${i + 1}`

    await client.query(query, [
      id,
      orderItem.product_id,
      branchId,
      batchId,
      itemData.quantity,
      'PURCHASE',
      purchaseOrderId,
      'purchase_order',
      itemData.cost_price,
      itemData.retail_price,
      `Purchase Order - Batch: ${batchNumber}`
    ])
  }
}

// ========== Main API Handler ==========
export async function POST(request: NextRequest) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      // Initialize database if needed
      await initDatabase()

      // Extract user details from authenticated request
      const { user: userDetails } = authedReq.user

      // Parse request body
      const body = await authedReq.json()

      // Validate input
      const validationResult = purchaseOrderSchema.safeParse(body)

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

      const data = validationResult.data

      // Calculate totals
      const totals = calculateOrderTotals(data.items)

      // Execute transaction
      const result = await transaction(async (client) => {
        // 1. Create purchase order
        const purchaseOrder = await createPurchaseOrder(userDetails, client, data, totals)

        // 2. Create purchase order items
        const orderItems = await createPurchaseOrderItems(client, purchaseOrder.id, data.items)

        // 3. Create purchase batches (with individual item barcodes if needed)
        const batchIds = await createPurchaseBatches(
          client, 
          orderItems, 
          data.items, 
          userDetails,
          data.supplier_id
        )

        // 4. Update product price history for each item
        for (let i = 0; i < orderItems.length; i++) {
          await updateProductPriceHistory(
            client, 
            orderItems[i].product_id, 
            data.items[i], 
            userDetails?.employee_id
          )
        }

        // 5. Update branch inventory
        await updateBranchInventory(
          client, 
          userDetails.branch_id, 
          data.items.map((item, idx) => ({
            product_id: orderItems[idx].product_id,
            quantity_ordered: item.quantity,
            cost_price: item.cost_price
          }))
        )

        // 6. Create branch inventory items
        await createBranchInventoryItems(
          client, 
          userDetails.branch_id, 
          batchIds, 
          orderItems, 
          data.items
        )

        // 7. Create stock ledger entries
        await createStockLedgerEntries(
          client,
          purchaseOrder.id,
          userDetails.branch_id,
          batchIds,
          orderItems,
          data.items
        )

        // Fetch created order with full details
        const orderQuery = `
          SELECT 
            po.id,
            po.order_number,
            po.supplier_id,
            po.purchased_by,
            po.branch_id,
            po.order_date,
            po.expected_date,
            po.received_date,
            po.status,
            po.subtotal,
            po.tax_amount,
            po.total_amount,
            po.notes,
            po.created_at,
            po.updated_at,
            s.name as supplier_name,
            s.code as supplier_code,
            b.name as branch_name,
            u.username as purchased_by_name,
            json_agg(
              json_build_object(
                'id', poi.id,
                'product_id', poi.product_id,
                'product_name', p.name,
                'product_sku', p.sku,
                'quantity_ordered', poi.quantity_ordered,
                'quantity_received', poi.quantity_received,
                'cost_price', poi.cost_price,
                'wholesale_price', poi.wholesale_price,
                'retail_price', poi.retail_price,
                'line_total', poi.line_total,
                'batch_number', poi.batch_number,
                'expiry_date', poi.expiry_date,
                'batch_id', pb.id,
                'individual_items_count', CASE 
                  WHEN EXISTS(
                    SELECT 1 FROM item_barcodes ib 
                    WHERE ib.purchase_batch_id = pb.id
                  ) THEN (
                    SELECT COUNT(*) FROM item_barcodes ib 
                    WHERE ib.purchase_batch_id = pb.id
                  )
                  ELSE 0
                END
              )
            ) as items
          FROM purchase_orders po
          LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
          LEFT JOIN products p ON poi.product_id = p.id
          LEFT JOIN purchase_batches pb ON poi.id = pb.purchase_order_item_id
          LEFT JOIN suppliers s ON po.supplier_id = s.id
          LEFT JOIN branches b ON po.branch_id = b.id
          LEFT JOIN users u ON po.purchased_by = u.id
          WHERE po.id = $1
          GROUP BY po.id, s.name, s.code, b.name, u.username
        `

        const orderResult = await client.query(orderQuery, [purchaseOrder.id])
        return orderResult.rows[0]
      })

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
        message: 'Purchase order created successfully',
        timestamp: new Date().toISOString()
      }, { status: 201 })

    } catch (error: any) {
      console.error('Purchase order creation error:', error)

      // Handle specific PostgreSQL errors
      const pgErrors: Record<string, string> = {
        '23505': 'Duplicate entry found',
        '23503': 'Referenced record not found',
        '23502': 'Required field is missing',
        '23514': 'Check constraint violation',
        '22P02': 'Invalid input syntax',
        '22003': 'Numeric value out of range'
      }

      const message = pgErrors[error.code] || error.message || 'Failed to create purchase order'

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message,
        errors: [{
          code: error.code,
          detail: error.detail,
          hint: error.hint
        }],
        timestamp: new Date().toISOString()
      }, { status: error.code === '23503' ? 404 : 500 })
    }
  })(request)
}