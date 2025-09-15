import { PurchaseOrderItem } from '@/types/purchase_order'
import { query } from '../database/connection'
import { AppError } from '../utils/AppError'
import { PoolClient } from 'pg'
import { CartItem, CustomerValidation, ValidationResult } from '@/types/sales.back'
import { promises } from 'dns'

// Validate supplier
export async function validateSupplier(supplier_id: string): Promise<void> {
  if (!supplier_id || typeof supplier_id !== 'string') {
    throw new AppError('Invalid supplier ID', 400)
  }

  try {
    const result = await query(
      `SELECT id FROM suppliers WHERE id = $1 AND is_active = true`,
      [supplier_id]
    )

    if (result.rows.length === 0) {
      throw new AppError('Supplier not found or inactive', 404)
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    console.error('Database error validating supplier:', err)
    throw new AppError('Internal server error validating supplier', 500)
  }
}

// Validate product list
export async function validateProducts(items: PurchaseOrderItem[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('No products provided', 400)
  }

  const productIds = items.map(item => item.product_id)

  if (!productIds.every(id => typeof id === 'string')) {
    throw new AppError('Invalid product ID(s)', 400)
  }

  try {
    const result = await query(
      `SELECT id FROM products WHERE id = ANY($1) AND is_active = true`,
      [productIds]
    )

    const validProductIds = result.rows.map(row => row.id)
    const invalidProducts = productIds.filter(id => !validProductIds.includes(id))

    if (invalidProducts.length > 0) {
      throw new AppError(`Invalid or inactive products: ${invalidProducts.join(', ')}`, 400)
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    console.error('Database error validating products:', err)
    throw new AppError('Internal server error validating products', 500)
  }
}


export async function validateProduct(productId: string): Promise<void> {
  // Input validation
  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    throw new AppError('Product ID is required and must be a valid string', 400)
  }

  try {
    const result = await query(
      `SELECT 
        id, 
        name, 
        sku, 
        is_active, 
        is_unique,
        warranty_period,
        category_id,
        brand_id
      FROM products 
      WHERE id = $1`,
      [productId.trim()]
    )

    if (result.rows.length === 0) {
      throw new AppError(`Product with ID '${productId}' not found`, 404)
    }

    const product = result.rows[0]

    if (!product.is_active) {
      throw new AppError(`Product '${product.name}' (${product.sku}) is inactive and cannot be used`, 400)
    }

    return product
  } catch (err) {
    if (err instanceof AppError) throw err
    console.error('Database error validating product:', err)
    throw new AppError('Internal server error validating product', 500)
  }
}

export class ValidationService {

  static async validateCartItems(
    client: PoolClient,
    branchId: string,
    items: CartItem[]
  ): Promise<ValidationResult> {
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
            const batchValidation = await this.validateBatchItem(
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
          for (const barcode of item.item_barcodes) {
            // ✅ NEW: Check for duplicate individual items
            if (usedItemBarcodes.has(barcode.barcode_id)) {
              errors.push(`Individual item ${barcode.barcode_id} is included multiple times in this order`)
              continue
            }

            const itemValidation = await this.validateIndividualItem(client, branchId, item.product_id, barcode.barcode_id)
            if (!itemValidation.isValid) {
              errors.push(...itemValidation.errors)
            }
            warnings.push(...itemValidation.warnings)

            // ✅ Track this barcode as used
            usedItemBarcodes.add(barcode.barcode_id)
          }
        }
      } catch (error: any) {
        errors.push(`Validation error for product ${item.product_id}: ${error.message}`)
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  static validateCartStructure(items: CartItem[]): { isValid: boolean; errors: string[] } {
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

  static async validateCompleteCart(
    client: PoolClient,
    branchId: string,
    items: CartItem[]
  ): Promise<ValidationResult> {
    // First validate structure
    const structureValidation = this.validateCartStructure(items)
    if (!structureValidation.isValid) {
      return {
        isValid: false,
        errors: structureValidation.errors,
        warnings: []
      }
    }

    // Then validate items with duplicate detection
    return await this.validateCartItems(client, branchId, items)
  }

  static async validateBatchItem(
    client: PoolClient,
    branchId: string,
    productId: string,
    batchId: string,
    quantity: number
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    const query = `
      SELECT 
        bii.quantity,
        bii.reserved_quantity,
        (bii.quantity - bii.reserved_quantity) as available_quantity,
        p.name as product_name,
        pb.batch_number,
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

  static async validateIndividualItem(
    client: PoolClient,
    branchId: string,
    productId: string,
    itemBarcodeId: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    const query = `
      SELECT 
        ib.id,
        ib.code,
        ib.status,
        ib.location_branch,
        ib.warranty_expiry,
        ib.is_active,
        p.name as product_name
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

  static async validateCustomer(
    client: PoolClient,
    customer_id?: string
  ): Promise<CustomerValidation> {
    // Case 1: Anonymous customer
    if (!customer_id) {
      return { customerId: null, isNewCustomer: false }
    }

    // Case 2: Existing customer validation
    const result = await client.query(
      `
    SELECT id, name, customer_type, is_active
    FROM customers
    WHERE id = $1
    `,
      [customer_id]
    )

    if (result.rows.length === 0) {
      throw new Error(`Customer ${customer_id} not found`)
    }

    const customerRecord = result.rows[0]

    if (!customerRecord.is_active) {
      throw new Error(`Customer ${customerRecord.name} is inactive`)
    }

    // Customer is valid and active
    return { customerId: customerRecord.id, isNewCustomer: false }
  }


 static async validateCustomerAndOrderById(
  customer_id: string,
  order_id: string
): Promise<{ isValid: boolean; errors: string[] }> {

    const errors: string[] = []
    const warnings: string[] = []

  const orderQuery = `
    SELECT id, customer_id, status,payment_status
    FROM sales_orders
    WHERE id = $1 AND customer_id = $2 AND payment_status = 'PENDING'
  `;
  
  const orderResult = await query(orderQuery, [order_id, customer_id]);

  if (orderResult.rows.length === 0) {
      errors.push(`No pending order ${order_id} found for customer ${customer_id}`)
      return { isValid: false, errors }
  }

  const order = orderResult.rows[0];

  if (order.payment_status !== 'PENDING') {
    console.log(order.payment_status);
     errors.push(`Order ${order_id} is not in a modifiable state`)
     return { isValid: false, errors }
  }
  return {isValid: errors.length===0, errors}; // ✅ return the validated order
}

}