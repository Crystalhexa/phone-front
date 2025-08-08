// types/order.types.ts

export interface BatchInfo {
  batch_id: string
  quantity: number
}

export interface Barcode {
  barcode_id: string
  barcode: string
}

export interface CartItem {
  type: 'BATCH' | 'INDIVIDUAL'
  product_id: string
  unit_price: number
  discount?: number
  wholesale_applied?: boolean
  total_quantity: number
  has_custom_pricing?: boolean
  discount_amount_per_item: number // For individual items - discount per item
  batches?: BatchInfo[]       // For batch items - array of batches
  item_barcodes?: Barcode[]    // For individual items - array of barcode IDs
}

export interface PlaceOrderRequest {
  customer_id?: string
  items: CartItem[]
  discount?: number
  notes?: string
}

export interface OrderSummary {
  total_products: number
  batch_products: number
  individual_products: number
  total_quantity: number
  subtotal: number
  discount: number
  total_amount: number
  profit_margin?: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface CustomerValidation {
  customerId: string | null
  isNewCustomer: boolean
}

export interface ProcessResult {
  lineCost: number
  lineProfit: number
}