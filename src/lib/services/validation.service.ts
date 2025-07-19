import { PurchaseOrderItem } from '@/types/purchase_order'
import { query } from '../database/connection'
import { AppError } from '../utils/AppError'

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
