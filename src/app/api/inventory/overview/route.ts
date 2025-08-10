import { NextRequest, NextResponse } from 'next/server'
import { query, ApiResponse } from '@/lib/database/connection'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  return withPermission('view_stock')(async (authedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const period = parseInt(searchParams.get('period') || '30') // days
      const { user: userDetails } = authedReq.user

      // Updated branch filter to use employee table for branch association
      const branchFilter = userDetails.role_id ? '' : `AND bi.branch_id = (
        SELECT branch_id FROM employees WHERE user_id = '${userDetails.userId}'
      )`
      const periodFilter = `AND psl.created_at >= NOW() - INTERVAL '${period} days'`

      // Get overall inventory metrics (updated to remove average_cost_price which doesn't exist)
      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          COALESCE(SUM(
            bi.total_quantity * COALESCE(
              (SELECT cost_price FROM product_current_prices WHERE product_id = p.id), 
              0
            )
          ), 0) as total_stock_value,
          COALESCE(SUM(bi.total_quantity), 0) as total_quantity,
          COUNT(*) FILTER (WHERE bi.total_quantity <= bi.low_stock_threshold) as low_stock_items,
          COUNT(*) FILTER (WHERE bi.total_quantity = 0) as out_of_stock_items
        FROM branch_inventory bi
        JOIN products p ON bi.product_id = p.id
        WHERE bi.is_active = true AND p.is_active = true ${branchFilter}
      `

      // Get expiring batches count (updated to use warranty_expiry from item_barcodes)
      const expiringBatchesQuery = `
        SELECT COUNT(DISTINCT ib.id) as expiring_batches
        FROM item_barcodes ib
        JOIN products p ON ib.product_id = p.id
        WHERE ib.is_active = true
          AND ib.status = 'AVAILABLE'
          AND ib.warranty_expiry IS NOT NULL
          AND ib.warranty_expiry <= CURRENT_DATE + INTERVAL '30 days'
          AND ib.location_branch = COALESCE(
            (SELECT branch_id FROM employees WHERE user_id = '${userDetails.userId}'),
            ib.location_branch
          )
      `

      // Get recent stock movements
      const recentMovementsQuery = `
        SELECT 
          psl.id,
          p.name as product_name,
          p.sku as product_sku,
          psl.entry_type,
          psl.quantity,
          psl.created_at,
          b.name as branch_name
        FROM product_stock_ledgers psl
        JOIN products p ON psl.product_id = p.id
        JOIN branches b ON psl.branch_id = b.id
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
          p.sku as product_sku,
          SUM(soi.quantity) as total_sold,
          COALESCE(SUM(soi.line_total), 0) as revenue,
          COUNT(DISTINCT so.id) as order_count
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.sales_order_id = so.id
        JOIN products p ON soi.product_id = p.id
        WHERE so.created_at >= NOW() - INTERVAL '${period} days'
          AND so.status = 'COMPLETED'
          ${branchFilter.replace('bi.branch_id', 'so.branch_id')}
        GROUP BY p.id, p.name, p.sku
        ORDER BY total_sold DESC
        LIMIT 10
      `

      // Get branch summary (updated to remove average_cost_price)
      const branchSummaryQuery = userDetails.role_id ? `
        SELECT 
          b.id as branch_id,
          b.name as branch_name,
          b.code as branch_code,
          COUNT(DISTINCT bi.product_id) as total_products,
          COALESCE(SUM(
            bi.total_quantity * COALESCE(
              (SELECT cost_price FROM product_current_prices WHERE product_id = bi.product_id), 
              0
            )
          ), 0) as total_value,
          COALESCE(SUM(bi.total_quantity), 0) as total_quantity,
          COUNT(*) FILTER (WHERE bi.total_quantity <= bi.low_stock_threshold) as low_stock_count,
          COUNT(*) FILTER (WHERE bi.total_quantity = 0) as out_of_stock_count
        FROM branches b
        LEFT JOIN branch_inventory bi ON b.id = bi.branch_id AND bi.is_active = true
        LEFT JOIN products p ON bi.product_id = p.id AND p.is_active = true
        WHERE b.is_active = true
        GROUP BY b.id, b.name, b.code
        ORDER BY b.name
      ` : `
        SELECT 
          b.id as branch_id,
          b.name as branch_name,
          b.code as branch_code,
          COUNT(DISTINCT bi.product_id) as total_products,
          COALESCE(SUM(
            bi.total_quantity * COALESCE(
              (SELECT cost_price FROM product_current_prices WHERE product_id = bi.product_id), 
              0
            )
          ), 0) as total_value,
          COALESCE(SUM(bi.total_quantity), 0) as total_quantity,
          COUNT(*) FILTER (WHERE bi.total_quantity <= bi.low_stock_threshold) as low_stock_count,
          COUNT(*) FILTER (WHERE bi.total_quantity = 0) as out_of_stock_count
        FROM branches b
        LEFT JOIN branch_inventory bi ON b.id = bi.branch_id AND bi.is_active = true
        LEFT JOIN products p ON bi.product_id = p.id AND p.is_active = true
        WHERE b.is_active = true 
          AND b.id = (SELECT branch_id FROM employees WHERE user_id = '${userDetails.userId}')
        GROUP BY b.id, b.name, b.code
      `

      // Get category breakdown (updated to remove average_cost_price)
      const categoryBreakdownQuery = `
        SELECT 
          COALESCE(c.name, 'Uncategorized') as category,
          COUNT(DISTINCT p.id) as product_count,
          COALESCE(SUM(
            bi.total_quantity * COALESCE(
              (SELECT cost_price FROM product_current_prices WHERE product_id = p.id), 
              0
            )
          ), 0) as total_value,
          COALESCE(SUM(bi.total_quantity), 0) as total_quantity,
          COALESCE(AVG(bi.total_quantity), 0) as avg_stock_level
        FROM products p
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN categories c ON sc.category_id = c.id
        LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.is_active = true
        WHERE p.is_active = true ${branchFilter}
        GROUP BY c.id, c.name
        ORDER BY total_value DESC
        LIMIT 10
      `

      // Get low stock alerts summary
      const lowStockAlertsQuery = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE alert_type = 'LOW_STOCK') as low_stock_alerts,
          COUNT(*) FILTER (WHERE alert_type = 'OUT_OF_STOCK') as out_of_stock_alerts,
          COUNT(*) FILTER (WHERE alert_type = 'CRITICAL_STOCK') as critical_stock_alerts,
          COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_alerts
        FROM low_stock_alerts lsa
        WHERE lsa.status IN ('ACTIVE', 'ACKNOWLEDGED')
          ${branchFilter.replace('bi.branch_id', 'lsa.branch_id')}
      `

      // Get inventory value trend (last 7 days)
      const inventoryTrendQuery = `
        SELECT 
          DATE(psl.created_at) as date,
          SUM(CASE WHEN psl.entry_type IN ('PURCHASE', 'TRANSFER_IN', 'ADJUSTMENT') THEN 
            psl.quantity * COALESCE(psl.cost_price, 0) ELSE 0 END) as value_in,
          SUM(CASE WHEN psl.entry_type IN ('SALE', 'TRANSFER_OUT', 'RETURN') THEN 
            psl.quantity * COALESCE(psl.cost_price, 0) ELSE 0 END) as value_out
        FROM product_stock_ledgers psl
        WHERE psl.created_at >= NOW() - INTERVAL '7 days'
          ${branchFilter.replace('bi.branch_id', 'psl.branch_id')}
        GROUP BY DATE(psl.created_at)
        ORDER BY date DESC
      `

      // Execute all queries
      const [
        metricsResult,
        expiringBatchesResult,
        recentMovementsResult,
        topSellingResult,
        branchSummaryResult,
        categoryBreakdownResult,
        lowStockAlertsResult,
        inventoryTrendResult
      ] = await Promise.all([
        query(metricsQuery),
        query(expiringBatchesQuery),
        query(recentMovementsQuery),
        query(topSellingQuery),
        query(branchSummaryQuery),
        query(categoryBreakdownQuery),
        query(lowStockAlertsQuery),
        query(inventoryTrendQuery)
      ])

      const overview = {
        // Main metrics
        ...metricsResult.rows[0],
        
        // Additional metrics
        expiring_items: parseInt(expiringBatchesResult.rows[0].expiring_batches || '0'),
        
        // Low stock alerts summary
        alerts: lowStockAlertsResult.rows[0] || {
          total_alerts: 0,
          low_stock_alerts: 0,
          out_of_stock_alerts: 0,
          critical_stock_alerts: 0,
          active_alerts: 0
        },
        
        // Activity data
        recent_movements: recentMovementsResult.rows,
        top_selling_products: topSellingResult.rows,
        inventory_trend: inventoryTrendResult.rows,
        
        // Summary data
        branch_summary: branchSummaryResult.rows,
        category_breakdown: categoryBreakdownResult.rows
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: overview,
        message: 'Inventory overview retrieved successfully',
        metadata: {
          period_days: period,
          user_role: userDetails.role_id ? 'admin' : 'branch_user',
          branch_filtered: !userDetails.role_id,
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