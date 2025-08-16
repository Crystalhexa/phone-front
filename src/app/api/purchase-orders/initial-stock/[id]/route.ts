import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PoolClient } from 'pg'
import { ApiResponse, initDatabase, transaction } from '@/lib/database/connection'
import { createId } from '@paralleldrive/cuid2'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'
import { validateProduct } from '@/lib/services/validation.service'
import { handleApiError } from '@/lib/utils/apiHelpers'
import { AppError } from '@/lib/utils/AppError'

const addItemSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative'),
  wholesale_price: z.coerce.number().min(0, 'Wholesale price cannot be negative').optional(),
  retail_price: z.coerce.number().min(0, 'Retail price cannot be negative'),
  is_unique: z.boolean().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      await initDatabase();
      const { user: userDetails } = authedReq.user;
                const { id: idParam } = await params;

      const purchaseOrderId = idParam;

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

      const validationResult = addItemSchema.safeParse(body)
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
      await validateProduct(data.product_id)

      const result = await transaction(async (client) => {
        // Verify purchase order exists and is in DRAFT status
        const orderQuery = `
          SELECT id, status, supplier_id, branch_id, is_initial_stock 
          FROM purchase_orders 
          WHERE id = $1 AND purchased_by = $2
        `
        const orderResult = await client.query(orderQuery, [purchaseOrderId, userDetails.employee_id])
        
        if (orderResult.rows.length === 0) {
          throw new AppError('Purchase order not found', 404)
        }

        const order = orderResult.rows[0]
        if (order.status !== 'DRAFT') {
          throw new AppError('Cannot add items to a closed purchase order', 400)
        }

        // Check if product already exists in this order
        const existingItemQuery = `
          SELECT id FROM purchase_order_items 
          WHERE purchase_order_id = $1 AND product_id = $2
        `
        const existingItem = await client.query(existingItemQuery, [purchaseOrderId, data.product_id])
        
        if (existingItem.rows.length > 0) {
          throw new AppError('Product already exists in this purchase order', 400)
        }

        // Create purchase order item
        const itemId = createId()
        const lineTotal = Number((data.quantity * data.cost_price).toFixed(2))
        
        const itemQuery = `
          INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, quantity_ordered, quantity_received,
            cost_price, wholesale_price, retail_price, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `

        const itemValues = [
          itemId,
          purchaseOrderId,
          data.product_id,
          data.quantity,
          data.quantity, // For initial stock, quantity_received = quantity_ordered
          data.cost_price,
          data.wholesale_price || null,
          data.retail_price,
          lineTotal,
        ]

        await client.query(itemQuery, itemValues)

        // Create purchase batch
        const batchId = createId()
        
        // Get next FIFO sequence
        const fifoQuery = `SELECT COALESCE(MAX(fifo_sequence), 0) + 1 as next_sequence FROM purchase_batches`
        const fifoResult = await client.query(fifoQuery)
        const fifoSequence = fifoResult.rows[0].next_sequence

        const batchQuery = `
          INSERT INTO purchase_batches (
            id, purchase_order_item_id, quantity_ordered,
            quantity_received, cost_price, wholesale_price, retail_price,
            received_date, received_by, is_active, fifo_sequence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `

        const batchValues = [
          batchId,
          itemId,
          data.quantity,
          data.quantity,
          data.cost_price,
          data.wholesale_price || null,
          data.retail_price,
          new Date().toISOString(),
          userDetails.employee_id,
          true,
          fifoSequence
        ]

        await client.query(batchQuery, batchValues)

        // Generate barcodes for individual items if unique
        const barcodes: string[] = []
        if (data.is_unique) {
          // Get warranty info
          const warrantyQuery = `SELECT warranty_period FROM products WHERE id = $1`
          const warrantyResult = await client.query(warrantyQuery, [data.product_id])
          const warrantyPeriod = warrantyResult.rows[0]?.warranty_period

          let warrantyExpiry = null
          if (warrantyPeriod) {
            const expiry = new Date()
            expiry.setMonth(expiry.getMonth() + warrantyPeriod)
            warrantyExpiry = expiry.toISOString().split('T')[0]
          }

          for (let i = 0; i < data.quantity; i++) {
            const itemBarcodeId = createId()
            barcodes.push(itemBarcodeId)

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
              data.product_id,
              'AVAILABLE',
              new Date().toISOString(),
              data.cost_price,
              order.supplier_id,
              warrantyExpiry,
              'GOOD',
              order.branch_id,
              true
            ]

            await client.query(itemBarcodeQuery, itemBarcodeValues)

            // Create movement history
            await createMovementHistory(client, itemBarcodeId, null, userDetails.branch_id, 'INITIAL_STOCK', userDetails.employee_id)
          }
        }

        // Update inventory if this is initial stock
        if (order.is_initial_stock) {
          await updateInventoryForInitialStock(client, order.branch_id, data.product_id, data.quantity, batchId, data)
          await createStockLedgerEntry(client, purchaseOrderId, order.branch_id, batchId, data)
        }

        // Fetch the created item with details
        return await fetchOrderItemDetails(client, itemId, barcodes)
      })

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
        message: 'Item added successfully',
        timestamp: new Date().toISOString()
      }, { status: 201 })

    } catch (error: any) {
      return handleApiError(error)
    }
  })(request)
}
async function createMovementHistory(
  client: PoolClient,
  itemId: string,
  fromBranch: string | null,
  toBranch: string | null,
  movementType: string,
  movedBy?: string,
  reason?: string
): Promise<void> {
  const movementId = createId()

  const query = `
    INSERT INTO item_movement_history (
      id, item_id, from_branch, to_branch, movement_type,
      moved_by, reason, moved_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `

  await client.query(query, [
    movementId,
    itemId,
    fromBranch,
    toBranch,
    movementType,
    movedBy,
    reason || `${movementType.replace('_', ' ').toLowerCase()}`,
    new Date().toISOString()
  ])
}

async function updateInventoryForInitialStock(
  client: PoolClient,
  branchId: string,
  productId: string,
  quantity: number,
  batchId: string,
  itemData: any
): Promise<void> {
  // Update branch inventory
  const updateInventoryQuery = `
    UPDATE branch_inventory
    SET total_quantity = total_quantity + $1,
        last_restock_date = $2,
        updated_at = $3
    WHERE branch_id = $4 AND product_id = $5
  `

  await client.query(updateInventoryQuery, [
    quantity,
    new Date().toISOString(),
    new Date().toISOString(),
    branchId,
    productId
  ])

  // Create branch inventory item
  const inventoryQuery = `
    SELECT id FROM branch_inventory
    WHERE branch_id = $1 AND product_id = $2
  `
  const inventoryResult = await client.query(inventoryQuery, [branchId, productId])

  if (inventoryResult.rows.length === 0) {
    throw new AppError(`Branch inventory not found for product ${productId}`, 404)
  }

  const branchInventoryId = inventoryResult.rows[0].id

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
      received_date, is_active, fifo_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `

  await client.query(insertQuery, [
    createId(),
    branchInventoryId,
    batchId,
    quantity,
    0,
    itemData.cost_price,
    itemData.wholesale_price || null,
    itemData.retail_price,
    new Date().toISOString(),
    true,
    fifoOrder
  ])
}

async function createStockLedgerEntry(
  client: PoolClient,
  purchaseOrderId: string,
  branchId: string,
  batchId: string,
  itemData: any
): Promise<void> {
  const query = `
    INSERT INTO product_stock_ledgers (
      id, product_id, branch_id, batch_id, quantity,
      entry_type, reference_id, reference_type,
      cost_price, selling_price
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `

  await client.query(query, [
    createId(),
    itemData.product_id,
    branchId,
    batchId,
    itemData.quantity,
    'INITIAL_STOCK',
    purchaseOrderId,
    'purchase_order',
    itemData.cost_price,
    itemData.retail_price
  ])
}

async function fetchOrderItemDetails(
  client: PoolClient,
  itemId: string,
  barcodes: string[]
): Promise<any> {
  const query = `
    SELECT 
      poi.id,
      poi.product_id,
      p.name as product_name,
      p.sku as product_sku,
      p.is_unique,
      poi.quantity_ordered,
      poi.cost_price,
      poi.wholesale_price,
      poi.retail_price,
      poi.line_total,
      pb.id as batch_id,
      poi.created_at
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_id = p.id
    LEFT JOIN purchase_batches pb ON poi.id = pb.purchase_order_item_id
    WHERE poi.id = $1
  `

  const result = await client.query(query, [itemId])
  const item = result.rows[0]

  return {
    ...item,
    barcodes: barcodes.map(barcode => ({
      id: barcode,
      barcode: barcode,
      status: 'AVAILABLE'
    }))
  }
}