export interface BatchInfo {
  batch_id: string
  batch_number: string
  quantity: number
  cost_price: number
  wholesale_price?: number
  retail_price: number
  expiry_date?: string
  received_date?: string
  fifo_sequence?: number
  fifo_order?: number
  is_next_to_sell?: boolean
}

export interface FIFOAllocationResult {
  allocatedBatches: Array<{
    batch_id: string
    batch_number: string
    allocated_quantity: number
    available_quantity: number
    cost_price: number
    retail_price: number
    wholesale_price?: number
    expiry_date?: string
  }>
  totalAllocated: number
  isFullyAllocated: boolean
  shortfall: number
}
export interface ScannedProduct {
  barcode_id?: string
  barcode: string
  scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL'
  product_id: string
  name: string
  model: string
  sku: string
  wholesale_quantity?: number
  brand?: {
    name: string
    code: string
  }
  category?: {
    category: string
    subcategory: string
  }
  pricing: {
    cost_price: number
    wholesale_price?: number
    retail_price: number
    selling_price: number
  }
  inventory: {
    available_quantity: number
    is_low_stock: boolean
    total_batches?: number
    fifo_next_batch?: {
      batch_id: string
      batch_number: string
      available_quantity: number
      expiry_date?: string
    }
    available_batches?: Array<{
      batch_id: string
      batch_number: string
      available_quantity: number
      expiry_date?: string
      cost_price?: number
      wholesale_price?: number
      retail_price?: number
    }>
  }
  item_details?: {
    item_id: string
    status: string
    condition: string
    warranty_expiry?: string
    location_branch: string
    purchased_at: string
    supplier_name?: string
  }
  batch_info?: any
  requires_quantity_input: boolean
  max_quantity?: number
  warranty_period?: number
}

export interface Barcodes {
  batch_number?: string
  barcode_id: string
  barcode: string
  cost_price: number
  wholesale_price?: number
  retail_price?: number
  custom_price?: number
}

export interface Batches {
  batch_id: string
  quantity: number
  cost_price?: number
  retail_price?: number
  wholesale_price?: number
  batch_number: string
  custom_price?: number
}

export interface CartItem {
  type: 'INDIVIDUAL' | 'BATCH'
  product_id: string
  product_name: string
  product_barcode?: string
  sku: string
  wholesale_quantity?: number
  unit_price: number
  discount_percentage: number
  discount_amount?: number
  discount_amount_per_item?: number
  item_barcodes?: Barcodes[]
  batches?: Batches[]
  total_quantity: number
  line_total: number
  max_quantity?: number
  has_custom_pricing?: boolean
  wholesale_applied?: boolean // Track if wholesale pricing is applied
  fifo_allocation?: FIFOAllocationResult // Store FIFO allocation info
}

export interface Customer {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  nic?: string
  customer_type?: 'RETAIL' | 'WHOLESALE' | 'CORPORATE' | 'DISTRIBUTOR' | 'VIP'
}