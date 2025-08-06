import { ApiResponse, initDatabase, query } from '@/lib/database/connection'
import { NextRequest, NextResponse } from 'next/server'

// ========== Types ==========
interface SalesOrderItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  brand_name?: string
  category_name?: string
  subcategory_name?: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number
  line_cost?: number
  line_profit?: number
  warranty_expiry?: string
  created_at: string
}

interface SalesOrderDetails {
  id: string
  order_number: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  customer_type?: string
  branch_id: string
  branch_name: string
  branch_code: string
  branch_address?: string
  sold_by?: string
  employee_name?: string
  employee_number?: string
  employee_phone?: string
  order_date: string
  status: string
  payment_method?: string
  payment_status: string
  subtotal: number
  total_amount: number
  discount: number
  total_cost?: number
  profit_amount?: number
  notes?: string
  created_at: string
  updated_at: string
  items: SalesOrderItem[]
}

// ========== Helper Functions ==========
function validateOrderId(id: string): boolean {
  return Boolean(id && typeof id === 'string' && id.trim().length > 0)
}

function parseDecimalField(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

// ========== Main API Handler ==========
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Initialize database connection
    await initDatabase()

    // Validate parameters
    const { id } = await params
    if (!validateOrderId(id)) {
      const errorResponse: ApiResponse = {
        success: false,
        data: null,
        message: 'Invalid sales order ID provided',
        errors: [
          {
            code: 'INVALID_ID',
            message: 'Sales order ID must be a non-empty string',
            field: 'id'
          }
        ],
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const includeItems = searchParams.get('include_items') !== 'false' // Default to true

    // Main query to get sales order details
    const salesOrderQuery = `
      SELECT 
        so.id,
        so.order_number,
        so.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.address as customer_address,
        c.customer_type,
        so.branch_id,
        b.name as branch_name,
        b.code as branch_code,
        b.address as branch_address,
        so.sold_by,
        e.name as employee_name,
        e.employee_number,
        e.phone as employee_phone,
        so.order_date,
        so.status,
        so.payment_method,
        so.payment_status,
        so.subtotal,
        so.total_amount,
        so.discount,
        so.total_cost,
        so.profit_amount,
        so.notes,
        so.created_at,
        so.updated_at
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN branches b ON so.branch_id = b.id
      LEFT JOIN employees e ON so.sold_by = e.id
      WHERE so.id = $1
    `

    console.log('🔍 Querying sales order with ID:', id)
    const salesOrderResult = await query<SalesOrderDetails>(salesOrderQuery, [id])

    if (salesOrderResult.rows.length === 0) {
      const errorResponse: ApiResponse = {
        success: false,
        data: null,
        message: 'Sales order not found',
        errors: [
          {
            code: 'NOT_FOUND',
            message: `Sales order with ID '${id}' does not exist`,
            field: 'id'
          }
        ],
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    const salesOrder = salesOrderResult.rows[0]
    console.log('✅ Found sales order:', salesOrder.order_number)

    // Convert decimal fields to numbers
    salesOrder.subtotal = parseDecimalField(salesOrder.subtotal)
    salesOrder.total_amount = parseDecimalField(salesOrder.total_amount)
    salesOrder.discount = parseDecimalField(salesOrder.discount)
    salesOrder.total_cost = parseDecimalField(salesOrder.total_cost)
    salesOrder.profit_amount = parseDecimalField(salesOrder.profit_amount)

    // Initialize items array
    salesOrder.items = []

    // Fetch sales order items if requested
    if (includeItems) {
      console.log('🔍 Fetching items for sales order:', id)
      
      const itemsQuery = `
        SELECT 
          soi.id,
          soi.product_id,
          p.name as product_name,
          p.sku as product_sku,
          br.name as brand_name,
          c.name as category_name,
          sc.name as subcategory_name,
          soi.quantity,
          soi.unit_price,
          soi.discount,
          soi.line_total,
          soi.line_cost,
          soi.line_profit,
          soi.warranty_expiry,
          soi.created_at
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        LEFT JOIN brands br ON p.brand_id = br.id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN categories c ON sc.category_id = c.id
        WHERE soi.sales_order_id = $1
        ORDER BY soi.created_at ASC
      `

      const itemsResult = await query<SalesOrderItem>(itemsQuery, [id])
      console.log('📦 Items query result:', {
        rowCount: itemsResult.rows.length,
        salesOrderId: id
      })

      // Debug: Log the first few items if any exist
      if (itemsResult.rows.length > 0) {
        console.log('📦 Sample items:', itemsResult.rows.slice(0, 2))
      } else {
        console.log('⚠️ No items found for sales order:', id)
        
        // Additional debug query to check if items exist at all
        const debugQuery = `
          SELECT COUNT(*) as total_items, sales_order_id
          FROM sales_order_items 
          WHERE sales_order_id = $1
          GROUP BY sales_order_id
        `
        const debugResult = await query(debugQuery, [id])
        console.log('🔍 Debug - Items count:', debugResult.rows)
        
        // Check if there are any items in the table for any order
        const globalDebugQuery = `
          SELECT COUNT(*) as total_items_in_table
          FROM sales_order_items
        `
        const globalDebugResult = await query(globalDebugQuery, [])
        console.log('🔍 Debug - Total items in table:', globalDebugResult.rows)
      }

      // Convert decimal fields to numbers for each item
      salesOrder.items = itemsResult.rows.map(item => {
        const processedItem = {
          ...item,
          quantity: Number(item.quantity) || 0,
          unit_price: parseDecimalField(item.unit_price),
          discount: parseDecimalField(item.discount),
          line_total: parseDecimalField(item.line_total),
          line_cost: parseDecimalField(item.line_cost),
          line_profit: parseDecimalField(item.line_profit)
        }
        
        console.log('📦 Processed item:', {
          id: processedItem.id,
          product_name: processedItem.product_name,
          quantity: processedItem.quantity
        })
        
        return processedItem
      })
    }

    const response: ApiResponse<SalesOrderDetails> = {
      success: true,
      data: salesOrder,
      message: 'Sales order retrieved successfully',
      timestamp: new Date().toISOString(),
      metadata: {
        order_id: salesOrder.id,
        order_number: salesOrder.order_number,
        items_count: salesOrder.items.length,
        include_items: includeItems,
        query_execution_time: `${Date.now()}ms`
      }
    }

    console.log('✅ Response summary:', {
      orderId: salesOrder.id,
      orderNumber: salesOrder.order_number,
      itemsCount: salesOrder.items.length,
      includeItems
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    console.error('❌ Error fetching sales order:', error)

    const errorResponse: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to fetch sales order',
      errors: [
        {
          code: 'FETCH_ERROR',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      ],
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}