
import { NextRequest, NextResponse } from 'next/server'
import { query, ApiResponse } from '@/lib/database/connection'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  return withPermission('view_stock')(async (authedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '50')
      const search = searchParams.get('search')
      const branchId = searchParams.get('branch_id')
      const stockStatus = searchParams.get('stock_status')
      const category = searchParams.get('category')
      const lowStockOnly = searchParams.get('low_stock_only') === 'true'
      const { user: userDetails } = authedReq.user

      const offset = (page - 1) * limit
      let whereConditions = ['bi.is_active = true', 'p.is_active = true']
      const queryParams: any[] = []
      let paramIndex = 1

      // Add filters only if they have values
      if (search && search.trim()) {
        whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`)
        queryParams.push(`%${search}%`)
        paramIndex++
      }

      if (branchId && branchId.trim()) {
        whereConditions.push(`bi.branch_id = $${paramIndex}`)
        queryParams.push(branchId)
        paramIndex++
      } else if (!userDetails.role_id) {
        // Non-admin users can only see their branch
        whereConditions.push(`bi.branch_id = $${paramIndex}`)
        queryParams.push(userDetails.branch_id)
        paramIndex++
      }

      if (stockStatus && stockStatus.trim()) {
        if (stockStatus === 'GOOD') {
          whereConditions.push(`bi.total_quantity > bi.low_stock_threshold`)
        } else if (stockStatus === 'LOW') {
          whereConditions.push(`bi.total_quantity <= bi.low_stock_threshold AND bi.total_quantity > 0`)
        } else if (stockStatus === 'OUT') {
          whereConditions.push(`bi.total_quantity = 0`)
        } else if (stockStatus === 'CRITICAL') {
          whereConditions.push(`bi.total_quantity <= (bi.low_stock_threshold * 0.5) AND bi.total_quantity > 0`)
        }
      }

      if (category && category.trim()) {
        whereConditions.push(`c.name = $${paramIndex}`)
        queryParams.push(category)
        paramIndex++
      }

      if (lowStockOnly) {
        whereConditions.push(`bi.total_quantity <= bi.low_stock_threshold`)
      }

      const whereClause = whereConditions.join(' AND ')

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM branch_inventory bi
        JOIN products p ON bi.product_id = p.id
        JOIN branches b ON bi.branch_id = b.id
        LEFT JOIN brands br ON p.brand_id = br.id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN categories c ON sc.category_id = c.id
        WHERE ${whereClause}
      `
      
      const countResult = await query(countQuery, queryParams)
      const total = parseInt(countResult.rows[0].total)

      // Main query with proper parameterization
      const stockLevelsQuery = `
        SELECT 
          bi.id,
          bi.product_id,
          p.name as product_name,
          p.sku as product_sku,
          bi.branch_id,
          b.name as branch_name,
          bi.total_quantity,
          bi.reserved_quantity,
          (bi.total_quantity - bi.reserved_quantity) as available_quantity,
          bi.low_stock_threshold,
          bi.reorder_quantity,
          COALESCE(bi.average_cost_price, 0) as average_cost_price,
          bi.last_restock_date,
          bi.last_sale_date,
          bi.last_counted_at,
          br.name as brand_name,
          c.name as category_name,
          sc.name as subcategory_name,
          -- Calculate stock status
          CASE 
            WHEN bi.total_quantity = 0 THEN 'OUT'
            WHEN bi.total_quantity <= (bi.low_stock_threshold * 0.5) THEN 'CRITICAL'
            WHEN bi.total_quantity <= bi.low_stock_threshold THEN 'LOW'
            ELSE 'GOOD'
          END as stock_status,
          bi.total_quantity <= bi.low_stock_threshold as is_low_stock,
          bi.total_quantity = 0 as is_out_of_stock,
          -- Count batches
          COUNT(bii.id) FILTER (WHERE bii.is_active = true) as batches_count,
          COUNT(bii.id) FILTER (
            WHERE bii.is_active = true 
            AND pb.expiry_date IS NOT NULL 
            AND pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
            AND pb.expiry_date > CURRENT_DATE
          ) as expiring_batches_count
        FROM branch_inventory bi
        JOIN products p ON bi.product_id = p.id
        JOIN branches b ON bi.branch_id = b.id
        LEFT JOIN brands br ON p.brand_id = br.id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN categories c ON sc.category_id = c.id
        LEFT JOIN branch_inventory_items bii ON bi.id = bii.branch_inventory_id
        LEFT JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
        WHERE ${whereClause}
        GROUP BY bi.id, p.id, p.name, p.sku, bi.branch_id, b.name, br.name, c.name, sc.name,
                 bi.total_quantity, bi.reserved_quantity, bi.low_stock_threshold, bi.reorder_quantity,
                 bi.average_cost_price, bi.last_restock_date, bi.last_sale_date, bi.last_counted_at
        ORDER BY 
          CASE 
            WHEN bi.total_quantity = 0 THEN 1
            WHEN bi.total_quantity <= bi.low_stock_threshold THEN 2
            ELSE 3
          END,
          p.name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `

      // Add pagination parameters
      queryParams.push(limit, offset)
      const result = await query(stockLevelsQuery, queryParams)

      const totalPages = Math.ceil(total / limit)

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result.rows,
        message: 'Stock levels retrieved successfully',
        metadata: {
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: total,
            items_per_page: limit,
            has_next: page < totalPages,
            has_prev: page > 1
          },
          summary: {
            total_products: total,
            low_stock_items: result.rows.filter((row: any) => row.is_low_stock).length,
            out_of_stock_items: result.rows.filter((row: any) => row.is_out_of_stock).length,
            total_inventory_value: result.rows.reduce((sum: number, row: any) => 
              sum + (row.total_quantity * row.average_cost_price), 0
            )
          }
        },
        timestamp: new Date().toISOString()
      })

    } catch (error: any) {
      console.error('Get stock levels error:', error)

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Failed to retrieve stock levels',
        errors: [{ message: error.message }],
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  })(request)
}
