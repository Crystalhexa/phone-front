// app/api/purchase-orders/list/route.ts
import { ApiResponse, initDatabase, query } from '@/lib/database/connection'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ========== Types & Validation ==========
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['order_date', 'order_number', 'total_amount', 'status', 'created_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['PENDING', 'COMPLETED', 'RECEIVED', 'CANCELLED']).optional(),
  supplier_id: z.string().optional(),
  branch_id: z.string().optional(),
  purchased_by: z.string().optional(),
  search: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  include_items: z.coerce.boolean().default(false),
})

type QueryParams = z.infer<typeof queryParamsSchema>

interface PurchaseOrderSummary {
  id: string
  order_number: string
  invoice_number?: string
  supplier_id: string
  supplier_name: string
  supplier_code: string
  purchased_by?: string
  purchaser_name?: string
  branch_id?: string
  branch_name?: string
  order_date: string
  expected_date?: string
  received_date?: string
  status: string
  subtotal: string
  tax_amount: string
  total_amount: string
  notes?: string
  created_at: string
  updated_at: string
  items_count: number
  items?: any[]
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// ========== Helper Functions ==========
function buildWhereClause(params: QueryParams): { where: string; values: any[] } {
  const conditions: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (params.status) {
    conditions.push(`po.status = $${paramIndex}`)
    values.push(params.status)
    paramIndex++
  }

  if (params.supplier_id) {
    conditions.push(`po.supplier_id = $${paramIndex}`)
    values.push(params.supplier_id)
    paramIndex++
  }

  if (params.branch_id) {
    conditions.push(`po.branch_id = $${paramIndex}`)
    values.push(params.branch_id)
    paramIndex++
  }

  if (params.purchased_by) {
    conditions.push(`po.purchased_by = $${paramIndex}`)
    values.push(params.purchased_by)
    paramIndex++
  }

  if (params.date_from) {
    conditions.push(`po.order_date >= $${paramIndex}`)
    values.push(params.date_from)
    paramIndex++
  }

  if (params.date_to) {
    conditions.push(`po.order_date <= $${paramIndex}`)
    values.push(params.date_to)
    paramIndex++
  }

  if (params.search) {
    conditions.push(`(
      po.order_number ILIKE $${paramIndex} OR 
      po.invoice_number ILIKE $${paramIndex} OR 
      s.name ILIKE $${paramIndex} OR 
      s.code ILIKE $${paramIndex} OR
      po.notes ILIKE $${paramIndex}
    )`)
    values.push(`%${params.search}%`)
    paramIndex++
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return { where, values }
}

function buildOrderByClause(sortBy: string, sortOrder: string): string {
  const validColumns: Record<string, string> = {
    order_date: 'po.order_date',
    order_number: 'po.order_number',
    total_amount: 'po.total_amount',
    status: 'po.status',
    created_at: 'po.created_at'
  }

  const column = validColumns[sortBy] || 'po.created_at'
  return `ORDER BY ${column} ${sortOrder.toUpperCase()}`
}

// ========== Database Queries ==========
async function getPurchaseOrders(params: QueryParams): Promise<{
  orders: PurchaseOrderSummary[]
  total: number
}> {
  const { where, values } = buildWhereClause(params)
  const orderBy = buildOrderByClause(params.sortBy, params.sortOrder)
  const offset = (params.page - 1) * params.limit

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT po.id) as total
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN branches b ON po.branch_id = b.id
    LEFT JOIN users u ON po.purchased_by = u.id
    ${where}
  `

  const countResult = await query(countQuery, values)
  const total = parseInt(countResult.rows[0].total)

  // Get paginated results
  const ordersQuery = `
    SELECT 
      po.id,
      po.order_number,
      po.invoice_number,
      po.supplier_id,
      s.name as supplier_name,
      s.code as supplier_code,
      po.purchased_by,
      u.username,
      po.branch_id,
      b.name as branch_name,
      po.order_date,
      po.expected_date,
      po.received_date,
      po.status,
      po.subtotal,
      po.tax_amount,
      po.total_amount,
      po.notes,
      po.created_at,
      po.updated_at,
      COUNT(poi.id) as items_count
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN branches b ON po.branch_id = b.id
    LEFT JOIN users u ON po.purchased_by = u.id
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    ${where}
    GROUP BY 
      po.id, s.name, s.code, b.name, u.username
    ${orderBy}
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `

  const ordersResult = await query<PurchaseOrderSummary>(
    ordersQuery, 
    [...values, params.limit, offset]
  )

  // If include_items is true, fetch items for each order
  if (params.include_items && ordersResult.rows.length > 0) {
    const orderIds = ordersResult.rows.map(order => order.id)
    
    const itemsQuery = `
      SELECT 
        poi.id,
        poi.purchase_order_id,
        poi.product_id,
        p.name as product_name,
        p.sku as product_sku,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.cost_price,
        poi.wholesale_price,
        poi.retail_price,
        poi.line_total,
        poi.batch_number,
        poi.expiry_date,
        pb.batch_number as batch_code,
        pb.is_active as batch_active
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      LEFT JOIN purchase_batches pb ON pb.purchase_order_item_id = poi.id
      WHERE poi.purchase_order_id = ANY($1)
      ORDER BY poi.created_at
    `

    const itemsResult = await query(itemsQuery, [orderIds])
    
    // Group items by order
    const itemsByOrder = itemsResult.rows.reduce((acc, item) => {
      if (!acc[item.purchase_order_id]) {
        acc[item.purchase_order_id] = []
      }
      acc[item.purchase_order_id].push(item)
      return acc
    }, {} as Record<string, any[]>)

    // Attach items to orders
    ordersResult.rows.forEach(order => {
      order.items = itemsByOrder[order.id] || []
    })
  }

  return {
    orders: ordersResult.rows,
    total
  }
}

async function getDashboardStats(params: {
  branch_id?: string
  date_from?: string
  date_to?: string
}): Promise<any> {
  const conditions = []
  const values = []
  let paramIndex = 1

  if (params.branch_id) {
    conditions.push(`branch_id = $${paramIndex}`)
    values.push(params.branch_id)
    paramIndex++
  }

  if (params.date_from) {
    conditions.push(`order_date >= $${paramIndex}`)
    values.push(params.date_from)
    paramIndex++
  }

  if (params.date_to) {
    conditions.push(`order_date <= $${paramIndex}`)
    values.push(params.date_to)
    paramIndex++
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const statsQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
      COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
      COUNT(*) FILTER (WHERE status = 'RECEIVED') as received_count,
      COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_count,
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status != 'CANCELLED'), 0) as total_amount,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'PENDING'), 0) as pending_amount,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'RECEIVED'), 0) as received_amount
    FROM purchase_orders
    ${where}
  `

  const result = await query(statsQuery, values)
  return result.rows[0]
}

// ========== Main API Handler ==========
export async function GET(request: NextRequest) {
  try {
    // Initialize database if needed
    await initDatabase()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const rawParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      status: searchParams.get('status'),
      supplier_id: searchParams.get('supplier_id'),
      branch_id: searchParams.get('branch_id'),
      purchased_by: searchParams.get('purchased_by'),
      search: searchParams.get('search'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      include_items: searchParams.get('include_items'),
      include_stats: searchParams.get('include_stats'),
    }

    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(rawParams).filter(([_, v]) => v != null)
    )

    // Validate parameters
    const validationResult = queryParamsSchema.safeParse(cleanParams)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Invalid query parameters',
        errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const params = validationResult.data

    // Fetch data
    const { orders, total } = await getPurchaseOrders(params)

    // Calculate pagination meta
    const totalPages = Math.ceil(total / params.limit)
    const pagination: PaginationMeta = {
      page: params.page,
      limit: params.limit,
      total,
      total_pages: totalPages,
      has_next: params.page < totalPages,
      has_prev: params.page > 1
    }

    // Include stats if requested
    let stats = null
    if (searchParams.get('include_stats') === 'true') {
      stats = await getDashboardStats({
        branch_id: params.branch_id,
        date_from: params.date_from,
        date_to: params.date_to
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        orders,
        pagination,
        stats
      },
      message: 'Purchase orders fetched successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error fetching purchase orders:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: error.message || 'Failed to fetch purchase orders',
      errors: [{
        code: error.code,
        detail: error.detail
      }],
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}