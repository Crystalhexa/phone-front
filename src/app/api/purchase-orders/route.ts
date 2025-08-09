// app/api/purchase-orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PoolClient } from 'pg'
import { ApiResponse, initDatabase, transaction } from '@/lib/database/connection'
import { createId } from '@paralleldrive/cuid2'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'
import { validateProducts, validateSupplier } from '@/lib/services/validation.service'
import { handleApiError } from '@/lib/utils/apiHelpers'
import { AppError } from '@/lib/utils/AppError'

// ========== Zod Validation Schemas ==========
const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative').default(0),
  wholesale_price: z.coerce.number().min(0, 'Wholesale price cannot be negative').default(0).optional(),
  retail_price: z.coerce.number().min(0, 'Retail price cannot be negative').default(0),
  quantity_received: z.coerce.number().min(0).default(0).optional(),
  is_unique: z.boolean().optional(),
});

const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier ID is required'),
  order_date: z.string().datetime().optional(),
  expected_date: z.string().datetime().optional(),
  received_date: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'RECEIVED']),
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
      order_date, expected_date, received_date, status, 
      subtotal, total_amount, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, order_number
  `

  const values = [
    id,
    data.supplier_id,
    user.user_id,
    user.branch_id,
    data.order_date || new Date().toISOString(),
    data.expected_date || null,
    data.status === 'RECEIVED' ? (data.received_date || new Date().toISOString()) : null,
    data.status=== 'RECEIVED' ?"COMPLETED":"PENDING",
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
  items: PurchaseOrderItem[],
  status: string
): Promise<Array<{ id: string; product_id: string }>> {
  const createdItems = []

  for (const item of items) {
    const id = generateCuid()
    const lineTotal = calculateLineTotal(item.quantity, item.cost_price)
    
    // For RECEIVED orders, set quantity_received to quantity if not specified
    const quantityReceived = status === 'RECEIVED' 
      ? (item.quantity_received ?? item.quantity) 
      : (item.quantity_received ?? 0)

    const query = `
      INSERT INTO purchase_order_items (
        id, purchase_order_id, product_id, quantity_ordered, quantity_received,
        cost_price, wholesale_price, retail_price, line_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, product_id
    `

    const values = [
      id,
      purchaseOrderId,
      item.product_id,
      item.quantity,
      quantityReceived,
      item.cost_price,
      item.wholesale_price || null,
      item.retail_price,
      lineTotal,
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
  user: any,
  supplier_id: string,
  status: string
): Promise<string[]> {
  // Only create batches for RECEIVED orders
  if (status !== 'RECEIVED') {
    return []
  }

  const batchIds: string[] = []

  // Get next FIFO sequence number
  const fifoQuery = `SELECT COALESCE(MAX(fifo_sequence), 0) + 1 as next_sequence FROM purchase_batches`
  const fifoResult = await client.query(fifoQuery)
  let currentFifoSequence = fifoResult.rows[0].next_sequence

  for (let i = 0; i < orderItems.length; i++) {
    const orderItem = orderItems[i]
    const itemData = itemsData[i]
    const quantityReceived = itemData.quantity_received ?? itemData.quantity
    
    // Skip if no quantity received
    if (quantityReceived <= 0) continue

    const batchId = generateCuid()

    const batchInsertQuery = `
      INSERT INTO purchase_batches (
        id, purchase_order_item_id, quantity_ordered,
        quantity_received, cost_price, wholesale_price, retail_price,
        received_date, received_by, is_active, fifo_sequence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `

    const batchInsertValues = [
      batchId,
      orderItem.id,
      itemData.quantity,
      quantityReceived,
      itemData.cost_price,
      itemData.wholesale_price || null,
      itemData.retail_price,
      new Date().toISOString(),
      user.user_id || user.employee_id,
      true,
      currentFifoSequence++
    ]

    const batchResult = await client.query(batchInsertQuery, batchInsertValues)
    batchIds.push(batchResult.rows[0].id)

    // Create individual item barcodes if item is marked as unique
    if (itemData.is_unique) {
      await createItemBarcodes(client, batchId, orderItem.product_id, itemData, supplier_id, user, quantityReceived)
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
  user: any,
  quantityReceived: number
): Promise<void> {
  // Calculate warranty expiry if product has warranty
  const warrantyQuery = `SELECT warranty_period FROM products WHERE id = $1`
  const warrantyResult = await client.query(warrantyQuery, [productId])
  const warrantyPeriod = warrantyResult.rows[0]?.warranty_period

  let warrantyExpiry = null
  if (warrantyPeriod) {
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + warrantyPeriod)
    warrantyExpiry = expiry.toISOString().split('T')[0]
  }

  for (let j = 0; j < quantityReceived; j++) {
    const itemBarcodeId = generateCuid()

    const itemBarcodeQuery = `
      INSERT INTO item_barcodes (
        id, purchase_batch_id, product_id, status,
        purchased_at, purchase_cost, supplier_id, warranty_expiry,
        condition, location_branch, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `

    const itemBarcodeValues = [
      itemBarcodeId,
      batchId,
      productId,
      'AVAILABLE',
      new Date().toISOString(),
      itemData.cost_price,
      supplierId,
      warrantyExpiry,
      'GOOD',
      user.branch_id,
      true
    ]

    await client.query(itemBarcodeQuery, itemBarcodeValues)

    // Create movement history entry
    await createItemMovementHistory(
      client, 
      itemBarcodeId, 
      null, 
      user.branch_id, 
      'PURCHASE_RECEIVED', 
      null, 
      user.user_id || user.employee_id
    )
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

async function updateBranchInventory(
  client: PoolClient,
  branchId: string,
  items: Array<{ product_id: string; quantity_received: number; cost_price: number }>
): Promise<void> {
  for (const item of items) {
    // Skip if no quantity received
    if (item.quantity_received <= 0) continue

    const updateQuery = `
      UPDATE branch_inventory
      SET total_quantity = total_quantity + $1,
          last_restock_date = $2,
          updated_at = $3
      WHERE branch_id = $4 AND product_id = $5
    `

    await client.query(updateQuery, [
      item.quantity_received,
      new Date().toISOString(),
      new Date().toISOString(),
      branchId,
      item.product_id
    ])
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
    const quantityReceived = itemData.quantity_received ?? itemData.quantity

    // Skip if no quantity received
    if (quantityReceived <= 0) continue

    // Get branch inventory ID
    const inventoryQuery = `
      SELECT id FROM branch_inventory
      WHERE branch_id = $1 AND product_id = $2
    `

    const inventoryResult = await client.query(inventoryQuery, [branchId, orderItem.product_id])

    if (inventoryResult.rows.length === 0) {
      throw new AppError(`Branch inventory not found for product ${orderItem.product_id}`, 404)
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
        received_date, is_active, fifo_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `

    await client.query(insertQuery, [
      id,
      branchInventoryId,
      batchId,
      quantityReceived,
      0,
      itemData.cost_price,
      itemData.wholesale_price || null,
      itemData.retail_price,
      new Date().toISOString(),
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
    const quantityReceived = itemData.quantity_received ?? itemData.quantity
    
    // Skip if no quantity received
    if (quantityReceived <= 0) continue

    const id = generateCuid()

    const query = `
      INSERT INTO product_stock_ledgers (
        id, product_id, branch_id, batch_id, quantity,
        entry_type, reference_id, reference_type,
        cost_price, selling_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `

    await client.query(query, [
      id,
      orderItem.product_id,
      branchId,
      batchId,
      quantityReceived,
      'PURCHASE',
      purchaseOrderId,
      'purchase_order',
      itemData.cost_price,
      itemData.retail_price
    ])
  }
}

async function fetchCreatedOrder(client: PoolClient, orderId: string) {
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

  const orderResult = await client.query(orderQuery, [orderId])
  return orderResult.rows[0]
}

// ========== Main API Handler ==========
export async function POST(request: NextRequest) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      // Initialize database if needed
      await initDatabase();
      
      const { user: userDetails } = authedReq.user


      // Parse request body
      let body
      try {
        body = await request.json()
      } catch {
        return NextResponse.json<ApiResponse>({
          success: false,
          data: null,
          message: 'Invalid JSON payload',
          timestamp: new Date().toISOString()
        }, { status: 400 })
      }

      // Validate input with Zod
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

      // Business validations
      await validateSupplier(data.supplier_id)
      await validateProducts(data.items)

      // Calculate totals
      const totals = calculateOrderTotals(data.items)

      // Execute transaction
      const result = await transaction(async (client) => {
        // 1. Create purchase order
        const purchaseOrder = await createPurchaseOrder(userDetails, client, data, totals)

        // 2. Create purchase order items
        const orderItems = await createPurchaseOrderItems(client, purchaseOrder.id, data.items, data.status)

        let batchIds: string[] = []

        // For RECEIVED orders, create inventory records
        if (data.status === 'RECEIVED') {
          // 3. Create purchase batches (with individual item barcodes if needed)
          batchIds = await createPurchaseBatches(
            client, 
            orderItems, 
            data.items, 
            userDetails,
            data.supplier_id,
            data.status
          )

          // 4. Update branch inventory
          await updateBranchInventory(
            client, 
            userDetails.branch_id, 
            data.items.map((item, idx) => ({
              product_id: orderItems[idx].product_id,
              quantity_received: item.quantity_received ?? item.quantity,
              cost_price: item.cost_price
            }))
          )

          // 5. Create branch inventory items (only if we have batches)
          if (batchIds.length > 0) {
            await createBranchInventoryItems(
              client, 
              userDetails.branch_id, 
              batchIds, 
              orderItems, 
              data.items
            )

            // 6. Create stock ledger entries
            await createStockLedgerEntries(
              client,
              purchaseOrder.id,
              userDetails.branch_id,
              batchIds,
              orderItems,
              data.items
            )
          }
        }

        // Fetch created order with full details
        return await fetchCreatedOrder(client, purchaseOrder.id)
      })

      const statusMessage = data.status === 'PENDING' 
        ? 'Purchase order created successfully' 
        : 'Purchase order received successfully'

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
        message: statusMessage,
        timestamp: new Date().toISOString()
      }, { status: 201 })

    } catch (error: any) {
      return handleApiError(error)
    }
  })(request)
}