import { NextRequest, NextResponse } from 'next/server'
import { query, initDatabase, ApiResponse } from '@/lib/database/connection'
import { withPermission, AuthenticatedRequest } from '@/middleware/auth' // Adjust import path as needed

interface PendingSalesOrderItem {
  id: string
  product_id: string
  product_name: string
  product_code: string
  quantity: number  // This will now be total_quantity
  unit_price: number  // This will now be avg_unit_price
  discount: number  // This will now be total_discount
  line_total: number  // This will now be total_line_total
  is_wholesale_price: boolean  // This will now be has_wholesale_price
  line_count: number  // NEW: How many times this product appears
  quantity_breakdown: string  // NEW: Shows "2 + 3 + 1" format
}

interface PendingSalesOrder {
  id: string
  order_number: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_type: string | null
  branch_id: string
  branch_name: string
  sold_by: string | null
  sold_by_name: string | null
  order_date: string
  status: string
  payment_status: string
  subtotal: number
  total_amount: number
  balance_due: number
  discount: number
  notes: string | null
  created_at: string
  updated_at: string
  items: PendingSalesOrderItem[]
}

interface PendingSalesOrdersResponse {
  orders: PendingSalesOrder[]
  total_count: number
  total_amount: number
  branch_info: {
    id: string
    name: string
    code: string
  }
}

export async function GET(request: NextRequest) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      // Initialize database if needed
      await initDatabase()

      const { user: userDetails } = authedReq.user;
      const branchId = userDetails.branch_id;

      if (!branchId) {
        return NextResponse.json({
          success: false,
          data: null,
          message: 'Branch ID not found for user',
          timestamp: new Date().toISOString()
        } as ApiResponse, { status: 400 })
      }

      // Parse query parameters for pagination and filtering
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = (page - 1) * limit
      const search = searchParams.get('search') || ''
      const sortBy = searchParams.get('sortBy') || 'order_date'
      const sortOrder = searchParams.get('sortOrder') || 'DESC'

      // Validate sort parameters
      const validSortFields = ['order_date', 'order_number', 'total_amount', 'customer_name', 'created_at']
      const validSortOrders = ['ASC', 'DESC']

      const orderBy = validSortFields.includes(sortBy) ? sortBy : 'order_date'
      const orderDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'

      // First, get branch information
      const branchQuery = `
        SELECT id, name, code
        FROM branches
        WHERE id = $1
      `
      const branchResult = await query(branchQuery, [branchId])

      if (branchResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          data: null,
          message: 'Branch not found',
          timestamp: new Date().toISOString()
        } as ApiResponse, { status: 404 })
      }

      const branch = branchResult.rows[0]

      // Main query to get pending sales orders with customer and employee details
      const salesOrdersQuery = `
        SELECT 
          so.id,
          so.order_number,
          so.customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          c.customer_type,
          c.running_balance,
          so.branch_id,
          b.name as branch_name,
                    e.employee_number as sold_by,
          e.name as sold_by_name,
          so.order_date,
          so.status,
          so.payment_status,
          so.subtotal,
          so.total_amount,
          so.balance_due,
          so.discount,
          so.notes,
          so.created_at,
          so.updated_at
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN branches b ON so.branch_id = b.id  
        LEFT JOIN employees e ON so.sold_by = e.id
        WHERE so.branch_id = $1 
          AND so.payment_status = 'PENDING'
          AND ($2 = '' OR 
     LOWER(so.order_number) LIKE LOWER($2) OR 
     LOWER(COALESCE(c.name, '')) LIKE LOWER($2) OR
     LOWER(COALESCE(c.phone, '')) LIKE LOWER($2) OR
     LOWER(COALESCE(e.name, '')) LIKE LOWER($2))
        ORDER BY ${orderBy === 'customer_name' ? 'c.name' : 'so.' + orderBy} ${orderDirection}
        LIMIT $3 OFFSET $4
      `

      const searchPattern = search ? `%${search}%` : ''
      const salesOrdersResult = await query(salesOrdersQuery, [branchId, searchPattern, limit, offset])

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total_count,
               COALESCE(SUM(so.total_amount), 0) as total_amount
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
                LEFT JOIN employees e ON so.sold_by = e.id

        WHERE so.branch_id = $1 
          AND so.payment_status = 'PENDING'
          AND ($2 = '' OR 
     LOWER(so.order_number) LIKE LOWER($2) OR 
     LOWER(COALESCE(c.name, '')) LIKE LOWER($2) OR
     LOWER(COALESCE(c.phone, '')) LIKE LOWER($2) OR
     LOWER(COALESCE(e.name, '')) LIKE LOWER($2))
      `
      const countResult = await query(countQuery, [branchId, searchPattern])
      const totalCount = parseInt(countResult.rows[0].total_count)
      const totalAmount = parseFloat(countResult.rows[0].total_amount)

      // Get order items for each sales order
      const orderIds = salesOrdersResult.rows.map(order => order.id)
      let orderItems: { [key: string]: PendingSalesOrderItem[] } = {}

      if (orderIds.length > 0) {
        // Replace your existing itemsQuery with this:
        const itemsQuery = `
          SELECT 
            MIN(soi.id) as id,
            soi.sales_order_id,
            soi.product_id,
            p.name as product_name,
            SUM(soi.quantity) as total_quantity,
            AVG(soi.unit_price) as avg_unit_price,
            SUM(soi.discount) as total_discount,
            SUM(soi.line_total) as total_line_total,
            BOOL_OR(soi.is_wholesale_price) as has_wholesale_price,
            COUNT(*) as line_count,
            STRING_AGG(soi.quantity::text, ' + ') as quantity_breakdown
          FROM sales_order_items soi
          JOIN products p ON soi.product_id = p.id
          WHERE soi.sales_order_id = ANY($1)
          GROUP BY soi.sales_order_id, soi.product_id, p.name
          ORDER BY MIN(soi.created_at) ASC
        `

        const itemsResult = await query(itemsQuery, [orderIds])

        itemsResult.rows.forEach((item: any) => {
          if (!orderItems[item.sales_order_id]) {
            orderItems[item.sales_order_id] = []
          }
          orderItems[item.sales_order_id].push({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code,
            quantity: parseInt(item.total_quantity),
            unit_price: parseFloat(item.avg_unit_price),
            discount: parseFloat(item.total_discount),
            line_total: parseFloat(item.total_line_total),
            is_wholesale_price: item.has_wholesale_price,
            line_count: parseInt(item.line_count),
            quantity_breakdown: item.quantity_breakdown
          })
        })
      }

      // Format the response
      const orders: PendingSalesOrder[] = salesOrdersResult.rows.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        customer_type: order.customer_type,
        running_balance: parseFloat(order.running_balance || '0'),
        branch_id: order.branch_id,
        branch_name: order.branch_name,
        sold_by: order.sold_by,
        sold_by_name: order.sold_by_name,
        order_date: order.order_date,
        status: order.status,
        payment_status: order.payment_status,
        subtotal: parseFloat(order.subtotal),
        total_amount: parseFloat(order.total_amount),
        balance_due: parseFloat(order.balance_due),
        discount: parseFloat(order.discount),
        notes: order.notes,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: orderItems[order.id] || []
      }))

      const response: PendingSalesOrdersResponse = {
        orders,
        total_count: totalCount,
        total_amount: totalAmount,
        branch_info: {
          id: branch.id,
          name: branch.name,
          code: branch.code
        }
      }

      return NextResponse.json({
        success: true,
        data: response,
        message: `Found ${totalCount} pending sales orders`,
        timestamp: new Date().toISOString(),
        metadata: {
          page,
          limit,
          total_count: totalCount,
          total_pages: Math.ceil(totalCount / limit),
          has_next_page: offset + limit < totalCount,
          has_prev_page: page > 1
        }
      } as ApiResponse<PendingSalesOrdersResponse>, { status: 200 })

    } catch (error: any) {
      console.error('❌ Error fetching pending sales orders:', error)

      return NextResponse.json({
        success: false,
        data: null,
        message: 'Internal server error while fetching pending sales orders',
        errors: process.env.NODE_ENV === 'development' ? [error.message] : null,
        timestamp: new Date().toISOString()
      } as ApiResponse, { status: 500 })
    }
  })(request)
}