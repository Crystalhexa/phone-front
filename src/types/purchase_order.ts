export interface PurchaseOrderItem {
  product_id: string
  quantity: number
  cost_price: number
  wholesale_price?: number
  retail_price: number
  quantity_received?: number // For RECEIVED orders
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string
  order_date?: string
  expected_date?: string
  received_date?: string // For RECEIVED orders
  status: 'PENDING' | 'RECEIVED'
  notes?: string
  items: PurchaseOrderItem[]
}