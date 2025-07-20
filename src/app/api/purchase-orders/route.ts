// app/api/purchase-orders/route.ts
import { transaction } from '@/lib/database/connection'
import { validateProducts, validateSupplier } from '@/lib/services/validation.service'
import { handleApiError } from '@/lib/utils/apiHelpers'
import { AppError } from '@/lib/utils/AppError'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'
import { CreatePurchaseOrderRequest } from '@/types/purchase_order'
import cuid from 'cuid'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'


// ========== Validation Schema ==========
const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  cost_price: z.number().min(0, 'Cost price must be non-negative'),
  wholesale_price: z.number().min(0).optional(),
  retail_price: z.number().min(0, 'Retail price must be non-negative'),
  quantity_received: z.number().min(0).optional()
})

const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier ID is required'),
  order_date: z.string().optional(),
  expected_date: z.string().optional(),
  received_date: z.string().optional(),
  status: z.enum(['PENDING', 'RECEIVED']),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required')
})


async function createPendingOrder(orderData: CreatePurchaseOrderRequest, user: any) {
  return await transaction(async (client) => {
    // Calculate totals
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + (item.cost_price * item.quantity), 0
    )
    const purchase_order_id = cuid();
    // Insert purchase order
    const orderResult = await client.query(`
      INSERT INTO purchase_orders (
        id, supplier_id, purchased_by, branch_id, 
        order_date, expected_date, status, subtotal, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      purchase_order_id,
      orderData.supplier_id,
      user.employee_id,
      user.branch_id,
      orderData.order_date || new Date().toISOString().split('T')[0],
      orderData.expected_date,
      'PENDING',
      subtotal,
      orderData.notes
    ])
    for (const item of orderData.items) {
      const line_total = item.cost_price * item.quantity
      const item_id = cuid()
      await client.query(`
        INSERT INTO purchase_order_items (
          id,purchase_order_id, product_id, quantity_ordered, 
          cost_price, wholesale_price, retail_price, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        item_id,
        purchase_order_id,
        item.product_id,
        item.quantity,
        item.cost_price,
        item.wholesale_price,
        item.retail_price,
        line_total,
      ])
    }

    return { purchase_order_id }
  })
}

// async function createReceivedOrder(orderData: CreatePurchaseOrderRequest, orderNumber: string) {
//   return await transaction(async (client) => {
//     // Calculate totals
//     const subtotal = orderData.items.reduce(
//       (sum, item) => sum + (item.cost_price * item.quantity_ordered), 0
//     )
//     const tax_amount = subtotal * 0.1
//     const total_amount = subtotal + tax_amount
//         const purchase_order_id = cuid()

//     // Insert purchase order
//     const orderResult = await client.query(`
//       INSERT INTO purchase_orders (
//         id,order_number, supplier_id, purchased_by, branch_id, 
//         order_date, expected_date, received_date, status, 
//         subtotal, tax_amount, total_amount, notes
//       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13)
//       RETURNING id
//     `, [
//       purchase_order_id,
//       orderNumber,
//       orderData.supplier_id,
//       orderData.purchased_by,
//       orderData.branch_id,
//       orderData.order_date || new Date().toISOString().split('T')[0],
//       orderData.expected_date,
//       orderData.received_date || new Date().toISOString(),
//       'RECEIVED',
//       subtotal,
//       tax_amount,
//       total_amount,
//       orderData.notes
//     ])

//     const receipt_id = cuid()

//     // Create receipt record
//     const receiptNumber = `RCP${Date.now().toString().slice(-8)}`
//     const receiptResult = await client.query(`
//       INSERT INTO purchase_receipts (
//         id,receipt_number, purchase_order_id, received_by, 
//         received_date, total_items, total_received, status
//       ) VALUES ($1, $2, $3, $4, $5, $6, $7,$8)
//       RETURNING id
//     `, [
//       receipt_id,
//       receiptNumber,
//       purchase_order_id,
//       orderData.purchased_by,
//       orderData.received_date || new Date().toISOString(),
//       orderData.items.length,
//       orderData.items.reduce((sum, item) => sum + (item.quantity_received || item.quantity_ordered), 0),
//       'COMPLETED'
//     ])


//     // Process each item
//     for (const item of orderData.items) {
//       const line_total = item.cost_price * item.quantity_ordered
//       const quantity_received = item.quantity_received || item.quantity_ordered
//       const batch_number = item.batch_number || `BATCH${Date.now()}${Math.random().toString(36).substr(2, 5)}`

//       const purchase_order_item_id = cuid()

//       // Insert order item
//       const orderItemResult = await client.query(`
//         INSERT INTO purchase_order_items (
//           id,purchase_order_id, product_id, quantity_ordered, quantity_received,
//           cost_price, wholesale_price, retail_price, line_total,
//           batch_number, expiry_date
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)
//         RETURNING id
//       `, [
//         purchase_order_item_id,
//         purchase_order_id,
//         item.product_id,
//         item.quantity_ordered,
//         quantity_received,
//         item.cost_price,
//         item.wholesale_price,
//         item.retail_price,
//         line_total,
//         batch_number,
//         item.expiry_date
//       ])

//             const batch_id =cuid()


//       // Create purchase batch
//       const batchResult = await client.query(`
//         INSERT INTO purchase_batches (
//           id,batch_number, purchase_order_item_id, quantity_ordered, 
//           quantity_received, cost_price, wholesale_price, retail_price,
//           expiry_date, received_date, received_by, fifo_sequence
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11, 
//           COALESCE((SELECT MAX(fifo_sequence) FROM purchase_batches) + 1, 1))
//         RETURNING id
//       `, [
//         batch_id,
//         batch_number,
//         purchase_order_item_id,
//         item.quantity_ordered,
//         quantity_received,
//         item.cost_price,
//         item.wholesale_price,
//         item.retail_price,
//         item.expiry_date,
//         orderData.received_date || new Date().toISOString(),
//         orderData.purchased_by
//       ])

//       const recipt_item_id = cuid()
//       // Create receipt item
//       await client.query(`
//         INSERT INTO purchase_receipt_items (
//           id,receipt_id, purchase_order_item_id, quantity_received,
//           quantity_expected, batch_number, expiry_date, condition,
//           cost_price, wholesale_price, retail_price
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)
//       `, [
//         recipt_item_id,
//         receipt_id,
//         purchase_order_item_id,
//         quantity_received,
//         item.quantity_ordered,
//         batch_number,
//         item.expiry_date,
//         'GOOD',
//         item.cost_price,
//         item.wholesale_price,
//         item.retail_price
//       ])

//       // Update or create branch inventory
//       const inventoryResult = await client.query(`
//         SELECT id, total_quantity, average_cost_price
//         FROM branch_inventory 
//         WHERE branch_id = $1 AND product_id = $2
//       `, [orderData.branch_id, item.product_id])

//       let branch_inventory_id: string
//       let new_average_cost: number

//       if (inventoryResult.rows.length > 0) {
//         // Update existing inventory
//         const existing = inventoryResult.rows[0]
//         const current_qty = existing.total_quantity
//         const current_avg_cost = parseFloat(existing.average_cost_price) || 0

//         // Calculate weighted average cost
//         const total_cost = (current_qty * current_avg_cost) + (quantity_received * item.cost_price)
//         const total_qty = current_qty + quantity_received
//         new_average_cost = total_cost / total_qty

//         await client.query(`
//           UPDATE branch_inventory 
//           SET total_quantity = total_quantity + $1,
//               average_cost_price = $2,
//               last_restock_date = $3,
//               updated_at = NOW()
//           WHERE id = $4
//         `, [quantity_received, new_average_cost, new Date().toISOString(), existing.id])

//         branch_inventory_id = existing.id
//       } else {
//         branch_inventory_id = cuid()
//         // Create new inventory record
//         const newInventoryResult = await client.query(`
//           INSERT INTO branch_inventory (
//             id,branch_id, product_id, total_quantity, average_cost_price,
//             last_restock_date
//           ) VALUES ($1, $2, $3, $4, $5,$6)
//           RETURNING id
//         `, [
//           branch_inventory_id,
//           orderData.branch_id,
//           item.product_id,
//           quantity_received,
//           item.cost_price,
//           new Date().toISOString()
//         ])

//         new_average_cost = item.cost_price
//       }

//       // Create inventory item record
//       await client.query(`
//         INSERT INTO branch_inventory_items (
//           branch_inventory_id, purchase_batch_id, quantity,
//           cost_price, wholesale_price, retail_price,
//           received_date, expiry_date, fifo_order
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
//           COALESCE((SELECT MAX(fifo_order) FROM branch_inventory_items WHERE branch_inventory_id = $1) + 1, 1))
//       `, [
//         branch_inventory_id,
//         batch_id,
//         quantity_received,
//         item.cost_price,
//         item.wholesale_price,
//         item.retail_price,
//         orderData.received_date || new Date().toISOString(),
//         item.expiry_date
//       ])

//       // Create stock ledger entry
//       await client.query(`
//         INSERT INTO product_stock_ledgers (
//           product_id, branch_id, batch_id, quantity, entry_type,
//           reference_id, reference_type, cost_price, selling_price
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//       `, [
//         item.product_id,
//         orderData.branch_id,
//         batch_id,
//         quantity_received,
//         'PURCHASE_RECEIVED',
//         purchase_order_id,
//         'PURCHASE_ORDER',
//         item.cost_price,
//         item.retail_price
//       ])

//       // Update product prices if this is from main branch
//       const branchInfo = await validateBranch(orderData.branch_id)
//       if (branchInfo.is_main_branch) {
//         // Check if we need to update product price history
//         const priceHistoryResult = await client.query(`
//           SELECT cost_price, wholesale_price, retail_price
//           FROM product_price_history
//           WHERE product_id = $1 AND is_active = true
//           ORDER BY effective_date DESC
//           LIMIT 1
//         `, [item.product_id])

//         const needsPriceUpdate = priceHistoryResult.rows.length === 0 || 
//           priceHistoryResult.rows[0].cost_price !== item.cost_price ||
//           priceHistoryResult.rows[0].wholesale_price !== item.wholesale_price ||
//           priceHistoryResult.rows[0].retail_price !== item.retail_price

//         if (needsPriceUpdate) {
//           // Deactivate old price records
//           await client.query(`
//             UPDATE product_price_history 
//             SET is_active = false 
//             WHERE product_id = $1 AND is_active = true
//           `, [item.product_id])

//           // Insert new price record
//           await client.query(`
//             INSERT INTO product_price_history (
//               product_id, effective_date, cost_price, wholesale_price,
//               retail_price, created_by, reason
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7)
//           `, [
//             item.product_id,
//             new Date().toISOString(),
//             item.cost_price,
//             item.wholesale_price,
//             item.retail_price,
//             orderData.purchased_by,
//             `Price updated from purchase order ${orderNumber}`
//           ])

//           // Update current prices table
//           await client.query(`
//             INSERT INTO product_current_prices (
//               product_id, cost_price, wholesale_price, retail_price, last_updated
//             ) VALUES ($1, $2, $3, $4, $5)
//             ON CONFLICT (product_id) DO UPDATE SET
//               cost_price = EXCLUDED.cost_price,
//               wholesale_price = EXCLUDED.wholesale_price,
//               retail_price = EXCLUDED.retail_price,
//               last_updated = EXCLUDED.last_updated
//           `, [
//             item.product_id,
//             item.cost_price,
//             item.wholesale_price,
//             item.retail_price,
//             new Date().toISOString()
//           ])
//         }
//       }
//     }

//     return { 
//       purchase_order_id, 
//       order_number: orderNumber, 
//       receipt_number: receiptNumber 
//     }
//   })
// }

// ========== API Route Handler ==========
export async function POST(request: NextRequest) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      let body
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({
          success: false,
          message: 'Invalid JSON payload',
          timestamp: new Date().toISOString()
        }, { status: 400 })
      }
      // Zod validation
      const validatedData = createPurchaseOrderSchema.parse(body)
      // Business validations
      await validateSupplier(validatedData.supplier_id)
      await validateProducts(validatedData.items)
      // Handle order creation based on status
      let result
      if (validatedData.status === 'PENDING') {
        result = await createPendingOrder(validatedData, authedReq.user)
      } else {
        // result = await createReceivedOrder(validatedData)
        throw new AppError('Received orders not implemented yet', 501)
      }

      // Success response
      return NextResponse.json({
        success: true,
        message: `Purchase order ${validatedData.status.toLowerCase()} successfully`,
        data: result,
        timestamp: new Date().toISOString()
      }, { status: 201 })

    } catch (error: any) {
      return handleApiError(error);
    }
  })(request);
}