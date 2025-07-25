import { NextRequest, NextResponse } from 'next/server'
import { query, ApiResponse } from '@/lib/database/connection'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  return withPermission('view_stock')(async (authedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const period = parseInt(searchParams.get('period') || '30') // days
      const { user: userDetails } = authedReq.user

      const branchFilter = userDetails.role_id ? '' : `AND bi.branch_id = '${userDetails.branch_id}'`
      const periodFilter = `AND psl.created_at >= NOW() - INTERVAL '${period} days'`

      // Get overall inventory metrics
      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          COALESCE(SUM(bi.total_quantity * bi.average_cost_price), 0) as total_stock_value,
          COALESCE(SUM(bi.total_quantity), 0) as total_quantity,
          COUNT(*) FILTER (WHERE bi.total_quantity <= bi.low_stock_threshold) as low_stock_items,
          COUNT(*) FILTER (WHERE bi.total_quantity = 0) as out_of_stock_items
        FROM branch_inventory bi
        JOIN products p ON bi.product_id = p.id
        WHERE bi.is_active = true AND p.is_active = true ${branchFilter}
      `

      // Get expiring batches count
      const expiringBatchesQuery = `
        SELECT COUNT(*) as expiring_batches
        FROM purchase_batches pb
        JOIN branch_inventory_items bii ON pb.id = bii.purchase_batch_id
        JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
        WHERE pb.expiry_date IS NOT NULL 
          AND pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          AND pb.expiry_date > CURRENT_DATE
          AND pb.is_active = true
          AND bii.is_active = true
          ${branchFilter}
      `

      // Get recent stock movements
      const recentMovementsQuery = `
        SELECT 
          psl.id,
          p.name as product_name,
          psl.entry_type,
          psl.quantity,
          psl.created_at
        FROM product_stock_ledgers psl
        JOIN products p ON psl.product_id = p.id
        WHERE psl.created_at >= NOW() - INTERVAL '7 days'
          ${branchFilter.replace('bi.branch_id', 'psl.branch_id')}
        ORDER BY psl.created_at DESC
        LIMIT 10
      `

      // Get top selling products
      const topSellingQuery = `
        SELECT 
          p.id as product_id,
          p.name as product_name,
          COUNT(soi.id) as total_sold,
          COALESCE(SUM(soi.line_total), 0) as revenue
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.sales_order_id = so.id
        JOIN products p ON soi.product_id = p.id
        WHERE so.created_at >= NOW() - INTERVAL '${period} days'
          AND so.status = 'COMPLETED'
          ${branchFilter.replace('bi.branch_id', 'so.branch_id')}
        GROUP BY p.id, p.name
        ORDER BY total_sold DESC
        LIMIT 10
      `

      // Get branch summary
      const branchSummaryQuery = userDetails.role_id ? `
        SELECT 
          b.id as branch_id,
          b.name as branch_name,
          COUNT(DISTINCT bi.product_id) as total_products,
          COALESCE(SUM(bi.total_quantity * bi.average_cost_price), 0) as total_value,
          COUNT(*) FILTER (WHERE bi.total_quantity <= bi.low_stock_threshold) as low_stock_count
        FROM branches b
        LEFT JOIN branch_inventory bi ON b.id = bi.branch_id AND bi.is_active = true
        LEFT JOIN products p ON bi.product_id = p.id AND p.is_active = true
        WHERE b.is_active = true
        GROUP BY b.id, b.name
        ORDER BY b.name
      ` : `
        SELECT 
          b.id as branch_id,
          b.name as branch_name,
          COUNT(DISTINCT bi.product_id) as total_products,
          COALESCE(SUM(bi.total_quantity * bi.average_cost_price), 0) as total_value,
          COUNT(*) FILTER (WHERE bi.total_quantity <= bi.low_stock_threshold) as low_stock_count
        FROM branches b
        LEFT JOIN branch_inventory bi ON b.id = bi.branch_id AND bi.is_active = true
        LEFT JOIN products p ON bi.product_id = p.id AND p.is_active = true
        WHERE b.is_active = true AND b.id = '${userDetails.branch_id}'
        GROUP BY b.id, b.name
      `

      // Get category breakdown
      const categoryBreakdownQuery = `
        SELECT 
          COALESCE(c.name, 'Uncategorized') as category,
          COUNT(DISTINCT p.id) as product_count,
          COALESCE(SUM(bi.total_quantity * bi.average_cost_price), 0) as total_value,
          COALESCE(AVG(bi.total_quantity), 0) as avg_stock_level
        FROM products p
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN categories c ON sc.category_id = c.id
        LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.is_active = true
        WHERE p.is_active = true ${branchFilter}
        GROUP BY c.name
        ORDER BY total_value DESC
        LIMIT 10
      `

      // Execute all queries
      const [
        metricsResult,
        expiringBatchesResult,
        recentMovementsResult,
        topSellingResult,
        branchSummaryResult,
        categoryBreakdownResult
      ] = await Promise.all([
        query(metricsQuery),
        query(expiringBatchesQuery),
        query(recentMovementsQuery),
        query(topSellingQuery),
        query(branchSummaryQuery),
        query(categoryBreakdownQuery)
      ])

      const overview = {
        ...metricsResult.rows[0],
        expiring_batches: parseInt(expiringBatchesResult.rows[0].expiring_batches),
        recent_movements: recentMovementsResult.rows,
        top_selling_products: topSellingResult.rows,
        branch_summary: branchSummaryResult.rows,
        category_breakdown: categoryBreakdownResult.rows
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: overview,
        message: 'Inventory overview retrieved successfully',
        metadata: {
          period_days: period,
          generated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      })

    } catch (error: any) {
      console.error('Get inventory overview error:', error)

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Failed to retrieve inventory overview',
        errors: [{ message: error.message }],
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  })(request)
}
