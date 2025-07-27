// types/transfer.ts
export interface Branch {
  id: string
  name: string
  code: string
  is_active: boolean
}

export interface ScannedProduct {
  barcode_id?: string
  barcode: string
  scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL'
  product_id: string
  name: string
  model: string
  sku: string
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
  batch_info?: any[]
  requires_quantity_input: boolean
  max_quantity?: number
  warranty_period?: number
}

export interface TransferItem {
  product_id: string
  product_name: string
  transfer_type: 'BATCH' | 'INDIVIDUAL'
  batches?: {
    batch_id: string
    batch_number: string
    quantity: number
    available_quantity: number
    expiry_date?: string
  }[]
  individual_items?: {
    item_barcode_id: string
    item_code: string
    status: string
  }[]
  total_quantity: number
}

export interface TransferRequest {
  to_branch_id: string
  from_branch_id: string
  transfer_items: {
    product_id: string
    transfer_type: 'BATCH' | 'INDIVIDUAL'
    batches?: {
      batch_id: string
      quantity: number
    }[]
    individual_items?: {
      item_barcode_id: string
    }[]
  }[]
  requested_by?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  notes?: string
  reason?: string
}
