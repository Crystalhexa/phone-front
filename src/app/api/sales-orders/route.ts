// app/api/sales-orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PoolClient } from 'pg'
import { ApiResponse, initDatabase, transaction, query } from '@/lib/database/connection'
import { createId } from '@paralleldrive/cuid2'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'

// ========== Enhanced Types and Interfaces ==========
interface BatchInfo {
  batch_id: string
  quantity: number
}

interface CartItem {
  type: 'BATCH' | 'INDIVIDUAL'
  product_id: string
  unit_price: number
  discount?: number
  batches?: BatchInfo[]       // For batch items - array of batches
  item_barcodes?: string[]    // For individual items - array of barcode IDs
}

interface Customer {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  nic?: string
  customer_type?: 'RETAIL' | 'WHOLESALE' | 'CORPORATE' | 'DISTRIBUTOR' | 'VIP'
}

interface PlaceOrderRequest {
  customer?: Customer
  items: CartItem[]
  payment_method?: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'CREDIT' | 'CHEQUE' | 'INSTALLMENT'
  payment_status?: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  discount?: number
  notes?: string
  delivery_date?: string
}

interface OrderSummary {
  total_products: number
  batch_products: number
  individual_products: number
  total_quantity: number
  subtotal: number
  discount: number
  total_amount: number
  profit_margin?: number
}

// ========== Enhanced Validation Schemas ==========
const batchInfoSchema = z.object({
  batch_id: z.string().min(1, 'Batch ID is required'),
  quantity: z.number().int().positive('Quantity must be positive')
})

const cartItemSchema = z.object({
  type: z.enum(['BATCH', 'INDIVIDUAL'], {
    required_error: 'Item type is required',
    invalid_type_error: 'Item type must be BATCH or INDIVIDUAL'
  }),
  product_id: z.string().min(1, 'Product ID is required'),
  unit_price: z.number().positive('Unit price must be positive'),
  discount: z.number().min(0).optional().default(0),
  batches: z.array(batchInfoSchema).optional(),
  item_barcodes: z.array(z.string().min(1, 'Item barcode ID is required')).optional()
}).refine(
  (data) => {
    if (data.type === 'BATCH') {
      return data.batches && data.batches.length > 0
    } else {
      return data.item_barcodes && data.item_barcodes.length > 0
    }
  },
  {
    message: "Batch items require batches array. Individual items require item_barcodes array.",
    path: ['batches', 'item_barcodes']
  }
)

const customerSchema = z.object({
  customer_id: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
  nic: z.string().min(10).max(20).optional(),
  customer_type: z.enum(['RETAIL', 'WHOLESALE', 'CORPORATE', 'DISTRIBUTOR', 'VIP']).optional().default('RETAIL')
}).optional()

const placeOrderSchema = z.object({
  customer: customerSchema,
  items: z.array(cartItemSchema).min(1, 'At least one item is required'),
  payment_method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CREDIT', 'CHEQUE', 'INSTALLMENT']).optional().default('CASH'),
  payment_status: z.enum(['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'REFUNDED']).optional().default('PAID'),
  discount: z.number().min(0).optional().default(0),
  notes: z.string().max(1000).optional(),
  delivery_date: z.string().datetime().optional()
})

// ========== Enhanced Helper Functions ==========
function generateCuid(): string {
  return createId()
}



function calculateOrderTotals(items: CartItem[], orderDiscount: number = 0): OrderSummary {
  let subtotal = 0
  let totalQuantity = 0
  let batchProducts = 0
  let individualProducts = 0

  items.forEach(item => {
    if (item.type === 'BATCH' && item.batches) {
      batchProducts++
      const batchTotal = item.batches.reduce((batchSum, batch) => {
        totalQuantity += batch.quantity
        return batchSum + (item.unit_price * batch.quantity)
      }, 0)
      const itemDiscount = item.discount || 0
      subtotal += (batchTotal - itemDiscount)
    } else if (item.type === 'INDIVIDUAL' && item.item_barcodes) {
      individualProducts++
      totalQuantity += item.item_barcodes.length
      const individualTotal = item.unit_price * item.item_barcodes.length
      const itemDiscount = item.discount || 0
      subtotal += (individualTotal - itemDiscount)
    }
  })

  const totalAmount = Number((subtotal - orderDiscount).toFixed(2))

  return { 
    total_products: items.length,
    batch_products: batchProducts,
    individual_products: individualProducts,
    total_quantity: totalQuantity,
    subtotal: Number(subtotal.toFixed(2)), 
    discount: orderDiscount,
    total_amount: totalAmount
  }
}

// ========== Enhanced Validation Functions ==========
async function validateCartItems(
  client: PoolClient,
  branchId: string,
  items: CartItem[]
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []

  // ✅ NEW: Track all barcodes and batches used in this order
  const usedItemBarcodes = new Set<string>()
  const usedBatchAllocations = new Map<string, number>() // batch_id -> total_quantity

  for (const item of items) {
    try {
      // Validate product exists and is active
      const productResult = await client.query(`
        SELECT id, name, is_active, warranty_period 
        FROM products 
        WHERE id = $1
      `, [item.product_id])

      if (productResult.rows.length === 0) {
        errors.push(`Product ${item.product_id} not found`)
        continue
      }

      const product = productResult.rows[0]
      if (!product.is_active) {
        errors.push(`Product ${product.name} is inactive`)
        continue
      }

      if (item.type === 'BATCH' && item.batches) {
        for (const batch of item.batches) {
          // ✅ NEW: Check for duplicate batch allocations
          const batchKey = `${batch.batch_id}-${item.product_id}`
          const currentTotal = usedBatchAllocations.get(batchKey) || 0
          const newTotal = currentTotal + batch.quantity
          
          // Validate individual batch
          const batchValidation = await validateBatchItem(
            client, 
            branchId, 
            item.product_id, 
            batch.batch_id, 
            newTotal // ✅ Check against cumulative quantity
          )
          
          if (!batchValidation.isValid) {
            errors.push(...batchValidation.errors)
          }
          warnings.push(...batchValidation.warnings)
          
          // ✅ Update tracking
          usedBatchAllocations.set(batchKey, newTotal)
        }
      } else if (item.type === 'INDIVIDUAL' && item.item_barcodes) {
        for (const itemBarcodeId of item.item_barcodes) {
          // ✅ NEW: Check for duplicate individual items
          if (usedItemBarcodes.has(itemBarcodeId)) {
            errors.push(`Individual item ${itemBarcodeId} is included multiple times in this order`)
            continue
          }

          const itemValidation = await validateIndividualItem(client, branchId, item.product_id, itemBarcodeId)
          if (!itemValidation.isValid) {
            errors.push(...itemValidation.errors)
          }
          warnings.push(...itemValidation.warnings)
          
          // ✅ Track this barcode as used
          usedItemBarcodes.add(itemBarcodeId)
        }
      }
    } catch (error: any) {
      errors.push(`Validation error for product ${item.product_id}: ${error.message}`)
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}
function validateCartStructure(items: CartItem[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Group items by product to check for mixed types
  const productItemTypes = new Map<string, Set<string>>()
  
  for (const item of items) {
    if (!productItemTypes.has(item.product_id)) {
      productItemTypes.set(item.product_id, new Set())
    }
    productItemTypes.get(item.product_id)!.add(item.type)
  }
  
  // Check for products with mixed item types
  for (const [productId, types] of productItemTypes) {
    if (types.size > 1) {
      errors.push(`Product ${productId} cannot have both BATCH and INDIVIDUAL items in the same order`)
    }
  }
  
  // Validate array contents match type
  for (const item of items) {
    if (item.type === 'BATCH') {
      if (!item.batches || item.batches.length === 0) {
        errors.push(`BATCH item for product ${item.product_id} must have batches array`)
      }
      if (item.item_barcodes && item.item_barcodes.length > 0) {
        errors.push(`BATCH item for product ${item.product_id} should not have item_barcodes`)
      }
    } else if (item.type === 'INDIVIDUAL') {
      if (!item.item_barcodes || item.item_barcodes.length === 0) {
        errors.push(`INDIVIDUAL item for product ${item.product_id} must have item_barcodes array`)
      }
      if (item.batches && item.batches.length > 0) {
        errors.push(`INDIVIDUAL item for product ${item.product_id} should not have batches`)
      }
    }
  }
  
  return { isValid: errors.length === 0, errors }
}

async function validateCompleteCart(
  client: PoolClient,
  branchId: string,
  items: CartItem[]
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
  // First validate structure
  const structureValidation = validateCartStructure(items)
  if (!structureValidation.isValid) {
    return {
      isValid: false,
      errors: structureValidation.errors,
      warnings: []
    }
  }
  
  // Then validate items with duplicate detection
  return await validateCartItems(client, branchId, items)
}
async function validateBatchItem(
  client: PoolClient,
  branchId: string,
  productId: string,
  batchId: string,
  quantity: number
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []

  const query = `
    SELECT 
      bii.quantity,
      bii.reserved_quantity,
      (bii.quantity - bii.reserved_quantity) as available_quantity,
      p.name as product_name,
      pb.batch_number,
      pb.expiry_date,
      pb.is_active as batch_active,
      bi.low_stock_threshold
    FROM branch_inventory_items bii
    JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
    JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
    JOIN products p ON bi.product_id = p.id
    WHERE bi.branch_id = $1 
      AND bi.product_id = $2 
      AND pb.id = $3
      AND bii.is_active = true
  `

  const result = await client.query(query, [branchId, productId, batchId])

  if (result.rows.length === 0) {
    errors.push(`Batch ${batchId} not found for product in this branch`)
    return { isValid: false, errors, warnings }
  }

  const batchInfo = result.rows[0]

  // Check if batch is active
  if (!batchInfo.batch_active) {
    errors.push(`Batch ${batchInfo.batch_number} is inactive`)
  }

  // Check expiry
  if (batchInfo.expiry_date) {
    const expiryDate = new Date(batchInfo.expiry_date)
    const today = new Date()
    const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    
    if (expiryDate < today) {
      errors.push(`Batch ${batchInfo.batch_number} has expired`)
    } else if (daysDiff <= 30) {
      warnings.push(`Batch ${batchInfo.batch_number} expires in ${daysDiff} days`)
    }
  }

  // Check availability
  if (batchInfo.available_quantity < quantity) {
    errors.push(
      `Insufficient stock for product ${batchInfo.product_name} ` +
      `(Batch: ${batchInfo.batch_number}). ` +
      `Available: ${batchInfo.available_quantity}, Requested: ${quantity}`
    )
  }

  // Check low stock warning
  const remainingAfterSale = batchInfo.available_quantity - quantity
  if (remainingAfterSale <= batchInfo.low_stock_threshold) {
    warnings.push(`${batchInfo.product_name} will be low stock after this sale (${remainingAfterSale} remaining)`)
  }

  return { isValid: errors.length === 0, errors, warnings }
}

async function validateIndividualItem(
  client: PoolClient,
  branchId: string,
  productId: string,
  itemBarcodeId: string
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []

  const query = `
    SELECT 
      ib.id,
      ib.code,
      ib.status,
      ib.condition,
      ib.location_branch,
      ib.warranty_expiry,
      ib.is_active,
      p.name as product_name,
      pb.expiry_date as batch_expiry
    FROM item_barcodes ib
    JOIN products p ON ib.product_id = p.id
    JOIN purchase_batches pb ON ib.purchase_batch_id = pb.id
    WHERE ib.id = $1 
      AND ib.product_id = $2
      AND ib.is_active = true
  `

  const result = await client.query(query, [itemBarcodeId, productId])

  if (result.rows.length === 0) {
    errors.push(`Individual item ${itemBarcodeId} not found`)
    return { isValid: false, errors, warnings }
  }

  const itemInfo = result.rows[0]

  // Check status
  if (itemInfo.status !== 'AVAILABLE') {
    errors.push(`Item ${itemInfo.code} is ${itemInfo.status.toLowerCase()} and cannot be sold`)
  }

  // Check condition
  if (['DAMAGED', 'EXPIRED', 'DEFECTIVE'].includes(itemInfo.condition)) {
    errors.push(`Item ${itemInfo.code} condition is ${itemInfo.condition.toLowerCase()} and cannot be sold`)
  }

  // Check location
  if (itemInfo.location_branch !== branchId) {
    errors.push(`Item ${itemInfo.code} is not in this branch`)
  }

  // Check warranty expiry
  if (itemInfo.warranty_expiry) {
    const warrantyDate = new Date(itemInfo.warranty_expiry)
    const today = new Date()
    const daysDiff = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    
    if (warrantyDate < today) {
      warnings.push(`Item ${itemInfo.code} warranty has expired`)
    } else if (daysDiff <= 30) {
      warnings.push(`Item ${itemInfo.code} warranty expires in ${daysDiff} days`)
    }
  }

  // Check batch expiry
  if (itemInfo.batch_expiry) {
    const expiryDate = new Date(itemInfo.batch_expiry)
    const today = new Date()
    const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    
    if (expiryDate < today) {
      errors.push(`Item ${itemInfo.code} from expired batch`)
    } else if (daysDiff <= 30) {
      warnings.push(`Item ${itemInfo.code} batch expires in ${daysDiff} days`)
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

async function validateCustomer(
  client: PoolClient,
  customer?: Customer
): Promise<{ customerId: string | null; isNewCustomer: boolean }> {
  if (!customer || (!customer.customer_id && !customer.phone && !customer.email && !customer.name)) {
    return { customerId: null, isNewCustomer: false } // Anonymous customer
  }

  if (customer.customer_id) {
    // Validate existing customer
    const result = await client.query(`
      SELECT id, name, customer_type, is_active 
      FROM customers 
      WHERE id = $1
    `, [customer.customer_id])

    if (result.rows.length === 0) {
      throw new Error(`Customer ${customer.customer_id} not found`)
    }

    const customerRecord = result.rows[0]
    if (!customerRecord.is_active) {
      throw new Error(`Customer ${customerRecord.name} is inactive`)
    }

    return { customerId: customer.customer_id, isNewCustomer: false }
  }

  // Check for existing customer by phone or email
  if (customer.phone || customer.email) {
    const existingResult = await client.query(`
      SELECT id FROM customers 
      WHERE (phone = $1 OR email = $2) AND is_active = true
      LIMIT 1
    `, [customer.phone || null, customer.email || null])

    if (existingResult.rows.length > 0) {
      return { customerId: existingResult.rows[0].id, isNewCustomer: false }
    }
  }

  // Create new customer if details provided
  if (customer.name || customer.phone || customer.email) {
    const customerId = generateCuid()
    
    // Generate customer number
    const customerNumberResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 5) AS INTEGER)), 0) + 1 as next_number
      FROM customers 
      WHERE customer_number LIKE 'CUST%'
    `)
    
    const customerNumber = `CUST${String(customerNumberResult.rows[0].next_number).padStart(6, '0')}`

    await client.query(`
      INSERT INTO customers (
        id, customer_number, name, email, phone, nic, customer_type, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      customerId,
      customerNumber,
      customer.name || 'Walk-in Customer',
      customer.email || null,
      customer.phone || null,
      customer.nic || null,
      customer.customer_type || 'RETAIL',
      true
    ])

    return { customerId, isNewCustomer: true }
  }

  return { customerId: null, isNewCustomer: false }
}

// ========== Enhanced Database Operations ==========
async function createSalesOrder(
  client: PoolClient,
  orderData: PlaceOrderRequest,
  customerId: string | null,
  branchId: string,
  soldBy: string,
  totals: OrderSummary
): Promise<string> {
  const salesOrderId = generateCuid()

  const query = `
    INSERT INTO sales_orders (
      id, customer_id, branch_id, sold_by,
      order_date, delivery_date, status, payment_method, payment_status,
      subtotal, discount, total_amount, total_cost, profit_amount, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
  `

  const values = [
    salesOrderId,
    customerId,
    branchId,
    soldBy,
    new Date().toISOString().split('T')[0], // order_date as DATE
    orderData.delivery_date ? new Date(orderData.delivery_date).toISOString().split('T')[0] : null,
    'COMPLETED', // Immediately mark as completed for paid orders
    orderData.payment_method || 'CASH',
    orderData.payment_status || 'PAID',
    totals.subtotal,
    totals.discount,
    totals.total_amount,
    0, // Will be calculated after items
    0, // Will be calculated after items
    orderData.notes || null
  ]

  const result = await client.query(query, values)
  return result.rows[0].id
}

async function createSalesOrderItems(
  client: PoolClient,
  salesOrderId: string,
  items: CartItem[]
): Promise<{ totalCost: number; totalProfit: number }> {
  let totalCost = 0
  let totalProfit = 0

  for (const item of items) {
    if (item.type === 'BATCH' && item.batches) {
      console.log(item.type)
      // Process each batch separately
      for (const batch of item.batches) {
        const result = await processBatchSaleItem(client, salesOrderId, item, batch)
        totalCost += result.lineCost
        totalProfit += result.lineProfit
      }
    } else if (item.type === 'INDIVIDUAL' && item.item_barcodes) {
      
      //Process each individual item separately  
      for (const itemBarcodeId of item.item_barcodes) {
        const result = await processIndividualSaleItem(client, salesOrderId, item, itemBarcodeId)
        totalCost += result.lineCost
        totalProfit += result.lineProfit
      }
    }
  }

  return { totalCost, totalProfit }
}

async function processBatchSaleItem(
  client: PoolClient,
  salesOrderId: string,
  item: CartItem,
  batch: BatchInfo
): Promise<{ lineCost: number; lineProfit: number }> {
  const salesOrderItemId = generateCuid()
  const lineTotal = (item.unit_price * batch.quantity) - (item.discount || 0)

  // Get batch cost and details
  const batchResult = await client.query(`
    SELECT 
      pb.cost_price, 
      pb.retail_price,
      bii.branch_inventory_id,
      p.warranty_period
    FROM purchase_batches pb
    JOIN branch_inventory_items bii ON pb.id = bii.purchase_batch_id
    JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
    JOIN products p ON bi.product_id = p.id
    WHERE pb.id = $1 AND bi.product_id = $2
  `, [batch.batch_id, item.product_id])

  const batchInfo = batchResult.rows[0]
  const costPrice = parseFloat(batchInfo.cost_price)
  const lineCost = costPrice * batch.quantity
  const lineProfit = lineTotal - lineCost

  // Calculate warranty expiry
  let warrantyExpiry = null
  if (batchInfo.warranty_period) {
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + batchInfo.warranty_period)
    warrantyExpiry = expiry.toISOString().split('T')[0]
  }

  // Insert sales order item
  await client.query(`
    INSERT INTO sales_order_items (
      id, sales_order_id, product_id, quantity, unit_price,
      discount, line_total, line_cost, line_profit, warranty_expiry
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    salesOrderItemId,
    salesOrderId,
    item.product_id,
    batch.quantity,
    item.unit_price,
    item.discount || 0,
    lineTotal,
    lineCost,
    lineProfit,
    warrantyExpiry
  ])

  // Create sales batch allocation (FIFO tracking)
  const allocationId = generateCuid()
  await client.query(`
    INSERT INTO sales_batch_allocations (
      id, sales_order_item_id, batch_id, quantity_allocated,
      cost_price_at_sale, selling_price
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    allocationId,
    salesOrderItemId,
    batch.batch_id,
    batch.quantity,
    costPrice,
    item.unit_price
  ])

  // Update inventory
  await updateBatchInventory(client, batch.batch_id, item.product_id, batch.quantity)

  // Create stock ledger entry
  await createStockLedgerEntry(
    client, 
    item.product_id, 
    batchInfo.branch_inventory_id,
    batch.batch_id,
    -batch.quantity,
    'SALE',
    salesOrderId,
    costPrice,
    item.unit_price
  )

  return { lineCost, lineProfit }
}

async function processIndividualSaleItem(
  client: PoolClient,
  salesOrderId: string,
  item: CartItem,
  itemBarcodeId: string
): Promise<{ lineCost: number; lineProfit: number }> {
  const salesOrderItemId = generateCuid()
  const lineTotal = item.unit_price - (item.discount || 0)

  // Get item details
  const itemResult = await client.query(`
    SELECT 
      ib.purchase_batch_id, 
      ib.location_branch, 
      ib.purchase_cost,
      p.warranty_period
    FROM item_barcodes ib
    JOIN products p ON ib.product_id = p.id
    WHERE ib.id = $1
  `, [itemBarcodeId])

  const itemInfo = itemResult.rows[0]
  const costPrice = parseFloat(itemInfo.purchase_cost)
  const lineCost = costPrice
  const lineProfit = lineTotal - lineCost

  // Calculate warranty expiry
  let warrantyExpiry = null
  if (itemInfo.warranty_period) {
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + itemInfo.warranty_period)
    warrantyExpiry = expiry.toISOString().split('T')[0]
  }

  // Insert sales order item
  await client.query(`
    INSERT INTO sales_order_items (
      id, sales_order_id, product_id, quantity, unit_price,
      discount, line_total, line_cost, line_profit, warranty_expiry
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    salesOrderItemId,
    salesOrderId,
    item.product_id,
    1, // Individual items are always quantity 1
    item.unit_price,
    item.discount || 0,
    lineTotal,
    lineCost,
    lineProfit,
    warrantyExpiry
  ])

  // Update item barcode status
  await client.query(`
    UPDATE item_barcodes 
    SET status = 'SOLD',
        sales_order_item_id = $1,
        sold_at = NOW(),
        sold_price = $2,
        updated_at = NOW()
    WHERE id = $3
  `, [salesOrderItemId, item.unit_price, itemBarcodeId])

  // Update inventory
  await updateIndividualItemInventory(client, itemBarcodeId, item.product_id)

  // Create item movement history
  const movementId = generateCuid()
  await client.query(`
    INSERT INTO item_movement_history (
      id, item_id, from_branch, movement_type,
      reference_id, reason
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    movementId,
    itemBarcodeId,
    itemInfo.location_branch,
    'SALE_DISPATCHED',
    salesOrderItemId,
    'Item sold to customer'
  ])

  // Create stock ledger entry
  await createStockLedgerEntry(
    client,
    item.product_id,
    null, // Will get branch from inventory
    itemInfo.purchase_batch_id,
    -1,
    'SALE',
    salesOrderId,
    costPrice,
    item.unit_price
  )

  return { lineCost, lineProfit }
}

async function updateBatchInventory(
  client: PoolClient,
  batchId: string,
  productId: string,
  quantity: number
): Promise<void> {
  // Update branch inventory items
  await client.query(`
    UPDATE branch_inventory_items 
    SET quantity = quantity - $1,
        updated_at = NOW()
    WHERE purchase_batch_id = $2
  `, [quantity, batchId])

  // Update main branch inventory
  await client.query(`
    UPDATE branch_inventory 
    SET total_quantity = total_quantity - $1,
        last_sale_date = NOW(),
        updated_at = NOW()
    WHERE product_id = $2 
      AND id = (
        SELECT bi.id FROM branch_inventory bi
        JOIN branch_inventory_items bii ON bi.id = bii.branch_inventory_id
        WHERE bii.purchase_batch_id = $3
        LIMIT 1
      )
  `, [quantity, productId, batchId])
}

async function updateIndividualItemInventory(
  client: PoolClient,
  itemBarcodeId: string,
  productId: string
): Promise<void> {
  // Get item location and batch info
  const itemResult = await client.query(`
    SELECT purchase_batch_id, location_branch 
    FROM item_barcodes 
    WHERE id = $1
  `, [itemBarcodeId])

  const { purchase_batch_id, location_branch } = itemResult.rows[0]

  // Update branch inventory items  
  await client.query(`
    UPDATE branch_inventory_items 
    SET quantity = quantity - 1,
        updated_at = NOW()
    WHERE purchase_batch_id = $1 
      AND branch_inventory_id = (
        SELECT id FROM branch_inventory 
        WHERE product_id = $2 AND branch_id = $3
      )
  `, [purchase_batch_id, productId, location_branch])

  // Update main branch inventory
  await client.query(`
    UPDATE branch_inventory 
    SET total_quantity = total_quantity - 1,
        last_sale_date = NOW(),
        updated_at = NOW()
    WHERE product_id = $1 AND branch_id = $2
  `, [productId, location_branch])
}

async function createStockLedgerEntry(
  client: PoolClient,
  productId: string,
  branchInventoryId: string | null,
  batchId: string,
  quantity: number,
  entryType: string,
  referenceId: string,
  costPrice: number,
  sellingPrice: number
): Promise<void> {
  const ledgerId = generateCuid()

  // Get branch ID if not provided
  let branchId = null
  if (branchInventoryId) {
    const branchResult = await client.query(`
      SELECT branch_id FROM branch_inventory WHERE id = $1
    `, [branchInventoryId])
    branchId = branchResult.rows[0]?.branch_id
  } else {
    // Get branch from batch
    const batchResult = await client.query(`
      SELECT bi.branch_id 
      FROM branch_inventory bi
      JOIN branch_inventory_items bii ON bi.id = bii.branch_inventory_id
      WHERE bii.purchase_batch_id = $1
      LIMIT 1
    `, [batchId])
    branchId = batchResult.rows[0]?.branch_id
  }

  await client.query(`
    INSERT INTO product_stock_ledgers (
      id, product_id, branch_id, batch_id, quantity, entry_type,
      reference_type, reference_id, cost_price, selling_price, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    ledgerId,
    productId,
    branchId,
    batchId,
    quantity,
    entryType,
    'sales_order',
    referenceId,
    costPrice,
    sellingPrice,
    `${entryType} - Quantity: ${Math.abs(quantity)}`
  ])
}

async function updateOrderTotals(
  client: PoolClient,
  salesOrderId: string,
  totalCost: number,
  totalProfit: number
): Promise<void> {
  await client.query(`
    UPDATE sales_orders 
    SET total_cost = $1,
        profit_amount = $2,
        updated_at = NOW()
    WHERE id = $3
  `, [totalCost, totalProfit, salesOrderId])
}

async function createActivityLog(
  client: PoolClient,
  userId: string,
  action: string,
  entityId: string,
  metadata: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const logId = generateCuid()
  
  await client.query(`
    INSERT INTO user_activity_logs (
      id, user_id, action, entity, entity_id, ip_address, user_agent, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    logId,
    userId,
    action,
    'sales_orders',
    entityId,
    ipAddress || null,
    userAgent || null,
    JSON.stringify(metadata)
  ])
}

// ========== Main POST Handler - Place Sales Order ==========
export async function POST(request: NextRequest) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      await initDatabase()
      const { user: userDetails } = authedReq.user
      const body = await authedReq.json()

      const validationResult = placeOrderSchema.safeParse(body)
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))

        return NextResponse.json<ApiResponse>({
          success: false,
          data: null,
          message: 'Validation failed',
          errors,
          timestamp: new Date().toISOString()
        }, { status: 400 })
      }

      const orderData: PlaceOrderRequest = validationResult.data

      // ✅ UPDATED: Use enhanced validation
      const preValidation = await transaction(async (client) => {
        return await validateCompleteCart(client, userDetails.branch_id, orderData.items)
      })

      if (!preValidation.isValid) {
        return NextResponse.json<ApiResponse>({
          success: false,
          data: null,
          message: 'Cart validation failed',
          errors: preValidation.errors.map(error => ({ message: error })),
          timestamp: new Date().toISOString()
        }, { status: 422 })
      }

      // Show warnings to user but continue processing
      if (preValidation.warnings.length > 0) {
        console.warn('Order warnings:', preValidation.warnings)
      }

      // Rest of the processing remains the same...
      const totals = calculateOrderTotals(orderData.items, orderData.discount || 0)
      
      const result = await transaction(async (client) => {
        const customerResult = await validateCustomer(client, orderData.customer)
        const salesOrderId = await createSalesOrder(
          client,
          orderData,
          customerResult.customerId,
          userDetails.branch_id,
          userDetails.employee_id || userDetails.userId,
          totals
        )

        const { totalCost, totalProfit } = await createSalesOrderItems(
          client,
          salesOrderId,
          orderData.items
        )

        await updateOrderTotals(client, salesOrderId, totalCost, totalProfit)
        await createActivityLog(
          client,
          userDetails.userId,
          'SALES_ORDER_CREATED',
          salesOrderId,
          {
            order_number: 454,
            customer_id: customerResult.customerId,
            is_new_customer: customerResult.isNewCustomer,
            total_amount: totals.total_amount,
            profit_amount: totalProfit,
            items_count: orderData.items.length,
            total_quantity: totals.total_quantity,
            validation_warnings: preValidation.warnings
          }
        )

        // Fetch complete order details (same query as before)
        const orderQuery = `
          SELECT so.id, so.order_number, so.customer_id, so.total_amount
          FROM sales_orders so WHERE so.id = $1
        `
        const orderResult = await client.query(orderQuery, [salesOrderId])
        
        return {
          order: orderResult.rows[0],
          customer_created: customerResult.isNewCustomer,
          validation_warnings: preValidation.warnings
        }
      }, { timeout: 120000 })

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result.order,
        message: 'Order placed successfully',
        timestamp: new Date().toISOString()
      }, { status: 201 })

    } catch (error: any) {
      console.error('Place order error:', error)
      
      const pgErrors: Record<string, string> = {
        '23505': 'Duplicate entry found',
        '23503': 'Referenced record not found',
        '23502': 'Required field is missing',
        '23514': 'Check constraint violation'
      }

      const message = pgErrors[error.code] || error.message || 'Failed to place order'

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message,
        errors: [{
          code: error.code,
          detail: error.detail,
          message: error.message
        }],
        timestamp: new Date().toISOString()
      }, { status: error.code === '23503' ? 404 : 500 })
    }
  })(request)
}