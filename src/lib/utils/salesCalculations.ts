export interface CartItem {
  type: 'BATCH' | 'INDIVIDUAL'
  product_id: string
  product_name: string
  sku: string
  model: string
  brand?: string
  unit_price: number
  discount: number
  batches?: Array<{
    batch_id: string
    quantity: number
    batch_number?: string
    expiry_date?: string
  }>
  item_barcodes?: string[]
  item_details?: Array<{
    item_id: string
    barcode: string
    condition: string
  }>
  total_quantity: number
  line_total: number
  max_quantity?: number
}

export interface OrderTotals {
  subtotal: number
  itemDiscounts: number
  orderDiscount: number
  total: number
  totalQuantity: number
  itemCount: number
}

export function calculateOrderTotals(cart: CartItem[], orderDiscount: number = 0): OrderTotals {
  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.total_quantity), 0)
  const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0)
  const totalAfterItemDiscounts = subtotal - itemDiscounts
  const total = Math.max(0, totalAfterItemDiscounts - orderDiscount)
  const totalQuantity = cart.reduce((sum, item) => sum + item.total_quantity, 0)

  return {
    subtotal,
    itemDiscounts,
    orderDiscount,
    total,
    totalQuantity,
    itemCount: cart.length
  }
}

export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toFixed(2)}`
}

export function validateCartItem(item: CartItem): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!item.product_id) {
    errors.push('Product ID is required')
  }

  if (!item.product_name) {
    errors.push('Product name is required')
  }

  if (item.unit_price <= 0) {
    errors.push('Unit price must be greater than 0')
  }

  if (item.discount < 0) {
    errors.push('Discount cannot be negative')
  }

  if (item.discount > (item.unit_price * item.total_quantity)) {
    errors.push('Discount cannot exceed line total')
  }

  if (item.type === 'BATCH') {
    if (!item.batches || item.batches.length === 0) {
      errors.push('Batch items must have batch information')
    } else {
      item.batches.forEach((batch, index) => {
        if (!batch.batch_id) {
          errors.push(`Batch ${index + 1}: Batch ID is required`)
        }
        if (batch.quantity <= 0) {
          errors.push(`Batch ${index + 1}: Quantity must be greater than 0`)
        }
      })
    }
  }

  if (item.type === 'INDIVIDUAL') {
    if (!item.item_barcodes || item.item_barcodes.length === 0) {
      errors.push('Individual items must have barcode information')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function transformCartToAPIFormat(cart: CartItem[]) {
  return cart.map(item => ({
    type: item.type,
    product_id: item.product_id,
    unit_price: item.unit_price,
    discount: item.discount,
    ...(item.type === 'BATCH' 
      ? { 
          batches: item.batches?.map(b => ({ 
            batch_id: b.batch_id, 
            quantity: b.quantity 
          })) 
        }
      : { item_barcodes: item.item_barcodes }
    )
  }))
}