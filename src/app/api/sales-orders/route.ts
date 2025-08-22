import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, initDatabase, transaction, query } from '@/lib/database/connection'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'
import { ActivityLogService } from '@/lib/services/activity-log.service'
import { ValidationService } from '@/lib/services/validation.service'
import { PlaceOrderRequest } from '@/types/sales.back'
import { placeOrderSchema } from '@/validation/order.schemas'
import { calculateOrderTotals } from '@/utils/calculations'
import { OrderService } from '@/lib/services/order.service'


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

      const orderData: PlaceOrderRequest = validationResult.data;
      // ✅ UPDATED: Use enhanced validation
      const preValidation = await transaction(async (client) => {
        return await ValidationService.validateCompleteCart(client, userDetails.branch_id, orderData.items)
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
        const customerResult = await ValidationService.validateCustomer(client, orderData.customer_id)
        console.log(customerResult)
        const salesOrderId = await OrderService.createSalesOrder(
          client,
          orderData,
          customerResult.customerId,
          userDetails.branch_id,
          userDetails.employee_id || userDetails.userId,
          totals
        )

        const { totalCost, totalProfit } = await OrderService.createSalesOrderItems(
          client,
          salesOrderId,
          orderData.items,
          userDetails.branch_id
        )

        await OrderService.updateOrderTotals(client, salesOrderId, totalCost, totalProfit)
              
        await ActivityLogService.createActivityLog(
          client,
          userDetails.userId,
          userDetails.branch_id,
          'SALES_ORDER_CREATED',
          'sales_orders',
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


// ========== Types ==========
interface SalesOrderItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  brand_name?: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number
  line_cost?: number
  line_profit?: number
}

interface SalesOrder {
  id: string
  order_number: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  branch_id: string
  branch_name: string
  branch_code: string
  sold_by?: string
  employee_name?: string
  employee_number?: string
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

interface FilterParams {
  branch_id?: string
  employee_id?: string
  customer_id?: string
  status?: string
  payment_status?: string
  order_date_from?: string
  order_date_to?: string
  page?: number
  limit?: number
  search?: string
  sort_by?: 'order_date' | 'total_amount' | 'order_number' | 'customer_name'
  sort_order?: 'asc' | 'desc'
}

// ========== Helper Functions ==========
function buildWhereClause(filters: FilterParams): { whereClause: string; params: any[] } {
  const conditions: string[] = []
  const params: any[] = []
  let paramCount = 0

  if (filters.branch_id) {
    conditions.push(`so.branch_id = $${++paramCount}`)
    params.push(filters.branch_id)
  }

  if (filters.employee_id) {
    conditions.push(`so.sold_by = $${++paramCount}`)
    params.push(filters.employee_id)
  }

  if (filters.customer_id) {
    conditions.push(`so.customer_id = $${++paramCount}`)
    params.push(filters.customer_id)
  }

  if (filters.status) {
    conditions.push(`so.status = $${++paramCount}`)
    params.push(filters.status)
  }

  if (filters.payment_status) {
    conditions.push(`so.payment_status = $${++paramCount}`)
    params.push(filters.payment_status)
  }

  if (filters.order_date_from) {
    conditions.push(`so.order_date >= $${++paramCount}`)
    params.push(filters.order_date_from)
  }

  if (filters.order_date_to) {
    conditions.push(`so.order_date <= $${++paramCount}`)
    params.push(filters.order_date_to)
  }

  if (filters.search) {
    conditions.push(`(
      so.order_number ILIKE $${++paramCount} OR 
      c.name ILIKE $${paramCount} OR 
      c.phone ILIKE $${paramCount} OR 
      e.name ILIKE $${paramCount}
    )`)
    params.push(`%${filters.search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return { whereClause, params }
}

function buildOrderClause(filters: FilterParams): string {
  const sortBy = filters.sort_by || 'order_date'
  const sortOrder = filters.sort_order || 'desc'
  
  const sortMapping: Record<string, string> = {
    order_date: 'so.order_date',
    total_amount: 'so.total_amount',
    order_number: 'so.order_number',
    customer_name: 'c.name'
  }
  
  const sortColumn = sortMapping[sortBy] || 'so.order_date'
  return `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}, so.created_at DESC`
}

// ========== Main API Handler ==========
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database connection
    await initDatabase()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const filters: FilterParams = {
      branch_id: searchParams.get('branch_id') || undefined,
      employee_id: searchParams.get('employee_id') || undefined,
      customer_id: searchParams.get('customer_id') || undefined,
      status: searchParams.get('status') || undefined,
      payment_status: searchParams.get('payment_status') || undefined,
      order_date_from: searchParams.get('order_date_from') || undefined,
      order_date_to: searchParams.get('order_date_to') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100), // Max 100 per page
      search: searchParams.get('search') || undefined,
      sort_by: (searchParams.get('sort_by') as FilterParams['sort_by']) || 'order_date',
      sort_order: (searchParams.get('sort_order') as FilterParams['sort_order']) || 'desc'
    }

    // Build dynamic query
    const { whereClause, params } = buildWhereClause(filters)
    const orderClause = buildOrderClause(filters)
    
    // Calculate pagination
    const offset = ((filters.page || 1) - 1) * (filters.limit || 50)
    const limitClause = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(filters.limit, offset)

    // Main query to get sales orders
    const salesOrdersQuery = `
      SELECT 
        so.id,
        so.order_number,
        so.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        so.branch_id,
        b.name as branch_name,
        b.code as branch_code,
        so.sold_by,
        e.name as employee_name,
        e.employee_number,
        so.order_date,
        so.status,
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
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN employees e ON so.sold_by = e.id
      ${whereClause}
    `

    // Execute queries
    const [salesOrdersResult, countResult] = await Promise.all([
      query<SalesOrder>(salesOrdersQuery, params),
      query<{ total: string }>(countQuery, params.slice(0, -2)) // Remove limit and offset for count
    ])

    const salesOrders = salesOrdersResult.rows
    const totalCount = parseInt(countResult.rows[0].total)

    // Get sales order items for all retrieved orders
    if (salesOrders.length > 0) {
      const orderIds = salesOrders.map(order => order.id)
      const placeholders = orderIds.map((_, index) => `$${index + 1}`).join(',')
      
      const itemsQuery = `
        SELECT 
          soi.id,
          soi.sales_order_id,
          soi.product_id,
          p.name as product_name,
          p.sku as product_sku,
          b.name as brand_name,
          soi.quantity,
          soi.unit_price,
          soi.discount,
          soi.line_total,
          soi.line_cost,
          soi.line_profit
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE soi.sales_order_id IN (${placeholders})
        ORDER BY soi.created_at ASC
      `

      const itemsResult = await query<SalesOrderItem & { sales_order_id: string }>(
        itemsQuery, 
        orderIds
      )

      // Group items by sales order
      const itemsByOrder: Record<string, SalesOrderItem[]> = {}
      itemsResult.rows.forEach(item => {
        if (!itemsByOrder[item.sales_order_id]) {
          itemsByOrder[item.sales_order_id] = []
        }
        itemsByOrder[item.sales_order_id].push({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          brand_name: item.brand_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price.toString()),
          discount: parseFloat(item.discount.toString()),
          line_total: parseFloat(item.line_total.toString()),
          line_cost: item.line_cost ? parseFloat(item.line_cost.toString()) : undefined,
          line_profit: item.line_profit ? parseFloat(item.line_profit.toString()) : undefined
        })
      })

      // Attach items to sales orders
      salesOrders.forEach(order => {
        order.items = itemsByOrder[order.id] || []
        // Convert decimal fields to numbers
        order.subtotal = parseFloat(order.subtotal.toString())
        order.total_amount = parseFloat(order.total_amount.toString())
        order.discount = parseFloat(order.discount.toString())
        order.total_cost = order.total_cost ? parseFloat(order.total_cost.toString()) : undefined
        order.profit_amount = order.profit_amount ? parseFloat(order.profit_amount.toString()) : undefined
      })
    }

    // Prepare response metadata
    const totalPages = Math.ceil(totalCount / (filters.limit || 50))
    const hasNextPage = (filters.page || 1) < totalPages
    const hasPrevPage = (filters.page || 1) > 1

    const response: ApiResponse<{
      sales_orders: SalesOrder[]
      pagination: {
        current_page: number
        total_pages: number
        total_count: number
        per_page: number
        has_next_page: boolean
        has_prev_page: boolean
      }
      filters_applied: FilterParams
    }> = {
      success: true,
      data: {
        sales_orders: salesOrders,
        pagination: {
          current_page: filters.page || 1,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: filters.limit || 50,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        },
        filters_applied: filters
      },
      message: `Retrieved ${salesOrders.length} sales orders successfully`,
      timestamp: new Date().toISOString(),
      metadata: {
        query_execution_time: `${Date.now()}ms`,
        filters_count: Object.keys(filters).filter(key => filters[key as keyof FilterParams] !== undefined).length
      }
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    console.error('❌ Error fetching sales orders:', error)

    const errorResponse: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to fetch sales orders',
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

// // ========== Additional Endpoint for Aggregated Stats ==========
// export async function POST(request: NextRequest): Promise<NextResponse> {
//   try {
//     await initDatabase()

//     const body = await request.json()
//     const filters: FilterParams = body.filters || {}

//     const { whereClause, params } = buildWhereClause(filters)

//     // Get aggregated statistics
//     const statsQuery = `
//       SELECT 
//         COUNT(*) as total_orders,
//         COUNT(CASE WHEN so.status = 'COMPLETED' THEN 1 END) as completed_orders,
//         COUNT(CASE WHEN so.status = 'PENDING' THEN 1 END) as pending_orders,
//         COUNT(CASE WHEN so.payment_status = 'PAID' THEN 1 END) as paid_orders,
//         COALESCE(SUM(so.total_amount), 0) as total_revenue,
//         COALESCE(SUM(so.profit_amount), 0) as total_profit,
//         COALESCE(AVG(so.total_amount), 0) as average_order_value,
//         COUNT(DISTINCT so.customer_id) as unique_customers,
//         COUNT(DISTINCT so.branch_id) as branches_involved
//       FROM sales_orders so
//       LEFT JOIN customers c ON so.customer_id = c.id
//       LEFT JOIN employees e ON so.sold_by = e.id
//       ${whereClause}
//     `

//     const statsResult = await query(statsQuery, params)
//     const stats = statsResult.rows[0]

//     // Convert string numbers to actual numbers
//     Object.keys(stats).forEach(key => {
//       if (stats[key] !== null && !isNaN(stats[key])) {
//         stats[key] = parseFloat(stats[key])
//       }
//     })

//     const response: ApiResponse = {
//       success: true,
//       data: {
//         statistics: stats,
//         filters_applied: filters
//       },
//       message: 'Sales order statistics retrieved successfully',
//       timestamp: new Date().toISOString()
//     }

//     return NextResponse.json(response, { status: 200 })

//   } catch (error: any) {
//     console.error('❌ Error fetching sales order statistics:', error)

//     const errorResponse: ApiResponse = {
//       success: false,
//       data: null,
//       message: 'Failed to fetch sales order statistics',
//       errors: [{ code: 'STATS_ERROR', message: error.message }],
//       timestamp: new Date().toISOString()
//     }

//     return NextResponse.json(errorResponse, { status: 500 })
//   }
// }