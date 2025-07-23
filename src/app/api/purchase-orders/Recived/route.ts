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

  const totalAmount = Number((subtotal).toFixed(2))

  return { subtotal, totalAmount }
}

// ========== Database Operations ==========
async function createPurchaseOrder(
  user: any,
  client: PoolClient,
  data: PurchaseOrderInput,
  totals: ReturnType<typeof calculateOrderTotals>
): Promise<string> {
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
  return result.rows[0].id
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
      0, // quantity_received starts at 0
      item.cost_price,
      item.wholesale_price || null,
      item.retail_price,
      lineTotal,
      item.batch_number,
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
  itemsData: PurchaseOrderItem[]
): Promise<string[]> {
  const batchIds: string[] = []

  const today = new Date().toISOString().split("T")[0].replace(/-/g, '') // e.g., "20250722"
  for (let i = 0; i < orderItems.length; i++) {
    const orderItem = orderItems[i]
    const itemData = itemsData[i]
    const batchId = generateCuid()

    const batchInsertQuery = `
      INSERT INTO purchase_batches (
        id, batch_number, purchase_order_item_id, quantity_ordered,
        quantity_received, cost_price, wholesale_price, retail_price,
        expiry_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `

    const batchInsertValues = [
      batchId,
      itemData.batch_number,
      orderItem.id,
      itemData.quantity,
      0,
      itemData.cost_price,
      itemData.wholesale_price || null,
      itemData.retail_price,
      itemData.expiry_date || null,
      true
    ]

    const batchResult = await client.query(batchInsertQuery, batchInsertValues)
    batchIds.push(batchResult.rows[0].id)

    // ✅ Insert barcodes if item is marked as unique
    if (itemData.is_unique) {
      const barcodeInsertQuery = `
        INSERT INTO sales_order_items_barcode (
          id, purchase_batch_id, code, type, is_active, created_at
        ) VALUES ($1, $2, $3, 'INTERNAL', true, NOW())
      `

      for (let j = 0; j < itemData.quantity; j++) {
        const barcodeId = generateCuid()

        // 🚀 Get next number from the sequence
        const { rows } = await client.query(`SELECT nextval('barcode_sequence')`);
        const seq = rows[0].nextval;

        const padded = String(seq).padStart(6, '0');
        const barcodeCode = `KRE-${today}-${padded}`;

        const values = [
          barcodeId,
          batchId,
          barcodeCode,
         
        ];

        await client.query(barcodeInsertQuery, values);
      }

    }
  }

  return batchIds
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
          average_cost_price, last_restock_date
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `

      await client.query(insertQuery, [
        id,
        branchId,
        item.product_id,
        item.quantity_ordered,
        0,
        item.cost_price
      ])
    } else {
      // Update existing inventory with weighted average cost
      const current = existing.rows[0]
      const newTotalQty = current.total_quantity + item.quantity_ordered
      const newAvgCost = (
        (current.total_quantity * (current.average_cost_price || 0) +
          item.quantity_ordered * item.cost_price) / newTotalQty
      ).toFixed(2)

      const updateQuery = `
        UPDATE branch_inventory
        SET total_quantity = total_quantity + $1,
            average_cost_price = $2,
            last_restock_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE branch_id = $3 AND product_id = $4
      `

      await client.query(updateQuery, [
        item.quantity_ordered,
        newAvgCost,
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

    // Get next FIFO order
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, $11)
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
      `Purchase Order - Batch: ${itemData.batch_number}`
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
        const purchaseOrderId = await createPurchaseOrder(userDetails, client, data, totals)

        // 2. Create purchase order items
        const orderItems = await createPurchaseOrderItems(client, purchaseOrderId, data.items)

        // 3. Create purchase batches
        const batchIds = await createPurchaseBatches(client, orderItems, data.items)

        // 4. Update branch inventory
        await updateBranchInventory(client, userDetails.branch_id, data.items.map((item, idx) => ({
          product_id: orderItems[idx].product_id,
          quantity_ordered: item.quantity,
          cost_price: item.cost_price
        })))

        // 5. Create branch inventory items
        await createBranchInventoryItems(client, userDetails.branch_id, batchIds, orderItems, data.items)

        // 6. Create stock ledger entries
        await createStockLedgerEntries(
          client,
          purchaseOrderId,
          userDetails.branch_id,
          batchIds,
          orderItems,
          data.items
        )

        // Fetch created order with details
        const orderQuery = `
          SELECT 
            po.id,
            po.order_number,
            po.supplier_id,
            po.purchased_by,
            po.branch_id,
            po.order_date,
            po.expected_date,
            po.status,
            po.subtotal,
            po.tax_amount,
            po.total_amount,
            po.notes,
            po.created_at,
            json_agg(
              json_build_object(
                'id', poi.id,
                'product_id', poi.product_id,
                'quantity_ordered', poi.quantity_ordered,
                'cost_price', poi.cost_price,
                'wholesale_price', poi.wholesale_price,
                'retail_price', poi.retail_price,
                'line_total', poi.line_total,
                'batch_number', poi.batch_number,
                'expiry_date', poi.expiry_date
              )
            ) as items
          FROM purchase_orders po
          LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
          WHERE po.id = $1
          GROUP BY po.id
        `

        const orderResult = await client.query(orderQuery, [purchaseOrderId])
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
  })(request);
}