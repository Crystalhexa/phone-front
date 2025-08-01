// ========== OPTIMIZED API: /api/inventory/stock-logs/route.ts ==========
import { NextRequest, NextResponse } from 'next/server'
import { query, ApiResponse } from '@/lib/database/connection'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  return withPermission('view_stock')(async (authedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const search = searchParams.get('search')
      const entryType = searchParams.get('entry_type')
      const branchId = searchParams.get('branch_id')
      const dateFrom = searchParams.get('date_from')
      const dateTo = searchParams.get('date_to')
      const productId = searchParams.get('product_id')
      const exportData = searchParams.get('export') === 'true'
      const { user: userDetails } = authedReq.user

      const offset = (page - 1) * limit
      let whereConditions = ['1=1']
      const queryParams: any[] = []
      let paramIndex = 1

      // Add filters only if they exist
      if (search && search.trim()) {
        whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`)
        queryParams.push(`%${search}%`)
        paramIndex++
      }

      if (entryType && entryType.trim()) {
        whereConditions.push(`psl.entry_type = $${paramIndex}`)
        queryParams.push(entryType)
        paramIndex++
      }

      if (branchId && branchId.trim()) {
        whereConditions.push(`psl.branch_id = $${paramIndex}`)
        queryParams.push(branchId)
        paramIndex++
      } else if (!userDetails.role_id) {
        // Non-admin users can only see their branch
        whereConditions.push(`psl.branch_id = $${paramIndex}`)
        queryParams.push(userDetails.branch_id)
        paramIndex++
      }

      if (dateFrom && dateFrom.trim()) {
        whereConditions.push(`psl.created_at >= $${paramIndex}`)
        queryParams.push(dateFrom)
        paramIndex++
      }

      if (dateTo && dateTo.trim()) {
        whereConditions.push(`psl.created_at <= $${paramIndex}`)
        queryParams.push(dateTo + ' 23:59:59')
        paramIndex++
      }

      if (productId && productId.trim()) {
        whereConditions.push(`psl.product_id = $${paramIndex}`)
        queryParams.push(productId)
        paramIndex++
      }

      const whereClause = whereConditions.join(' AND ')

      if (exportData) {
        // Optimized export query using UNION approach for better performance
        const exportQuery = `
          WITH reference_data AS (
            SELECT 
              psl.id as psl_id,
              CASE psl.reference_type
                WHEN 'purchase_order' THEN po.order_number
                WHEN 'sales_order' THEN so.order_number
                WHEN 'stock_transfer' THEN str.request_number
                WHEN 'stock_adjustment' THEN sa.adjustment_number
                WHEN 'purchase_return' THEN pr.return_number
                WHEN 'sales_return' THEN sr.return_number
                ELSE psl.reference_id
              END as reference_number
            FROM product_stock_ledgers psl
            LEFT JOIN purchase_orders po ON psl.reference_type = 'purchase_order' AND psl.reference_id = po.id
            LEFT JOIN sales_orders so ON psl.reference_type = 'sales_order' AND psl.reference_id = so.id
            LEFT JOIN stock_transfer_requests str ON psl.reference_type = 'stock_transfer' AND psl.reference_id = str.id
            LEFT JOIN stock_adjustments sa ON psl.reference_type = 'stock_adjustment' AND psl.reference_id = sa.id
            LEFT JOIN purchase_returns pr ON psl.reference_type = 'purchase_return' AND psl.reference_id = pr.id
            LEFT JOIN sales_returns sr ON psl.reference_type = 'sales_return' AND psl.reference_id = sr.id
            WHERE psl.id IN (
              SELECT DISTINCT psl2.id 
              FROM product_stock_ledgers psl2
              JOIN products p2 ON psl2.product_id = p2.id
              JOIN branches b2 ON psl2.branch_id = b2.id
              WHERE ${whereClause}
            )
          )
          SELECT 
            psl.created_at,
            p.name as product_name,
            p.sku as product_sku,
            b.name as branch_name,
            psl.entry_type,
            psl.quantity,
            COALESCE(pb.batch_number, '') as batch_number,
            COALESCE(psl.cost_price, 0) as cost_price,
            COALESCE(psl.selling_price, 0) as selling_price,
            COALESCE(psl.reference_type, '') as reference_type,
            COALESCE(rd.reference_number, psl.reference_id, '') as reference_number,
            COALESCE(psl.notes, '') as notes,
            COALESCE(e.name, '') as employee_name
          FROM product_stock_ledgers psl
          JOIN products p ON psl.product_id = p.id
          JOIN branches b ON psl.branch_id = b.id
          LEFT JOIN purchase_batches pb ON psl.batch_id = pb.id
          LEFT JOIN employees e ON psl.created_by = e.id
          LEFT JOIN reference_data rd ON psl.id = rd.psl_id
          WHERE ${whereClause}
          ORDER BY psl.created_at DESC
        `

        let result;
        if (queryParams.length > 0) {
          result = await query(exportQuery, queryParams)
        } else {
          result = await query(exportQuery)
        }
        
        // Convert to CSV
        const headers = ['Date', 'Product', 'SKU', 'Branch', 'Type', 'Quantity', 'Batch', 'Cost Price', 'Selling Price', 'Reference Type', 'Reference Number', 'Notes', 'Employee']
        const csvData = [
          headers.join(','),
          ...result.rows.map(row => [
            new Date(row.created_at).toLocaleString(),
            `"${row.product_name}"`,
            `"${row.product_sku}"`,
            `"${row.branch_name}"`,
            row.entry_type,
            row.quantity,
            `"${row.batch_number}"`,
            row.cost_price,
            row.selling_price,
            `"${row.reference_type}"`,
            `"${row.reference_number}"`,
            `"${row.notes}"`,
            `"${row.employee_name}"`
          ].join(','))
        ].join('\n')

        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=stock-logs.csv'
          }
        })
      }

      // Optimized count query - only essential joins
      const countQuery = `
        SELECT COUNT(*) as total
        FROM product_stock_ledgers psl
        JOIN products p ON psl.product_id = p.id
        JOIN branches b ON psl.branch_id = b.id
        WHERE ${whereClause}
      `
      
      let countResult;
      if (queryParams.length > 0) {
        countResult = await query(countQuery, queryParams)
      } else {
        countResult = await query(countQuery)
      }
      const total = parseInt(countResult.rows[0].total)

      // Two-step approach for better performance
      // Step 1: Get the basic data with pagination
      const basicDataQuery = `
        SELECT 
          psl.id,
          psl.product_id,
          p.name as product_name,
          p.sku as product_sku,
          psl.branch_id,
          b.name as branch_name,
          psl.batch_id,
          pb.batch_number,
          psl.quantity,
          psl.entry_type,
          psl.reference_type,
          psl.reference_id,
          psl.cost_price,
          psl.selling_price,
          psl.notes,
          psl.created_at,
          e.name as employee_name
        FROM product_stock_ledgers psl
        JOIN products p ON psl.product_id = p.id
        JOIN branches b ON psl.branch_id = b.id
        LEFT JOIN purchase_batches pb ON psl.batch_id = pb.id
        LEFT JOIN employees e ON psl.created_by = e.id
        WHERE ${whereClause}
        ORDER BY psl.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `

      // Add pagination parameters
      queryParams.push(limit, offset)
      
      let basicResult;
      if (queryParams.length > 2) {
        basicResult = await query(basicDataQuery, queryParams)
      } else {
        const simplePaginationQuery = `
          SELECT 
            psl.id,
            psl.product_id,
            p.name as product_name,
            p.sku as product_sku,
            psl.branch_id,
            b.name as branch_name,
            psl.batch_id,
            pb.batch_number,
            psl.quantity,
            psl.entry_type,
            psl.reference_type,
            psl.reference_id,
            psl.cost_price,
            psl.selling_price,
            psl.notes,
            psl.created_at,
            e.name as employee_name
          FROM product_stock_ledgers psl
          JOIN products p ON psl.product_id = p.id
          JOIN branches b ON psl.branch_id = b.id
          LEFT JOIN purchase_batches pb ON psl.batch_id = pb.id
          LEFT JOIN employees e ON psl.created_by = e.id
          ${!userDetails.role_id ? `WHERE psl.branch_id = '${userDetails.branch_id}'` : ''}
          ORDER BY psl.created_at DESC
          LIMIT $1 OFFSET $2
        `
        basicResult = await query(simplePaginationQuery, [limit, offset])
      }

      // Step 2: Get reference numbers only for the returned rows
      if (basicResult.rows.length > 0) {
        const stockLogIds = basicResult.rows.map(row => row.id)
        const placeholders = stockLogIds.map((_, index) => `$${index + 1}`).join(',')
        
        const referenceQuery = `
          SELECT 
            psl.id,
            CASE psl.reference_type
              WHEN 'purchase_order' THEN po.order_number
              WHEN 'sales_order' THEN so.order_number
              WHEN 'stock_transfer' THEN str.request_number
              WHEN 'stock_adjustment' THEN sa.adjustment_number
              WHEN 'purchase_return' THEN pr.return_number
              WHEN 'sales_return' THEN sr.return_number
              ELSE psl.reference_id
            END as reference_number
          FROM product_stock_ledgers psl
          LEFT JOIN purchase_orders po ON psl.reference_type = 'purchase_order' AND psl.reference_id = po.id
          LEFT JOIN sales_orders so ON psl.reference_type = 'sales_order' AND psl.reference_id = so.id
          LEFT JOIN stock_transfer_requests str ON psl.reference_type = 'stock_transfer' AND psl.reference_id = str.id
          LEFT JOIN stock_adjustments sa ON psl.reference_type = 'stock_adjustment' AND psl.reference_id = sa.id
          LEFT JOIN purchase_returns pr ON psl.reference_type = 'purchase_return' AND psl.reference_id = pr.id
          LEFT JOIN sales_returns sr ON psl.reference_type = 'sales_return' AND psl.reference_id = sr.id
          WHERE psl.id IN (${placeholders})
        `
        
        const referenceResult = await query(referenceQuery, stockLogIds)
        const referenceMap = new Map(
          referenceResult.rows.map(row => [row.id, row.reference_number])
        )
        
        // Merge the results
        const finalResult = basicResult.rows.map(row => ({
          ...row,
          reference_number: referenceMap.get(row.id) || row.reference_id
        }))
        
        const totalPages = Math.ceil(total / limit)

        return NextResponse.json<ApiResponse>({
          success: true,
          data: finalResult,
          message: 'Stock logs retrieved successfully',
          metadata: {
            pagination: {
              current_page: page,
              total_pages: totalPages,
              total_items: total,
              items_per_page: limit,
              has_next: page < totalPages,
              has_prev: page > 1
            }
          },
          timestamp: new Date().toISOString()
        })
      }

      // Empty result case
      return NextResponse.json<ApiResponse>({
        success: true,
        data: [],
        message: 'No stock logs found',
        metadata: {
          pagination: {
            current_page: page,
            total_pages: 0,
            total_items: 0,
            items_per_page: limit,
            has_next: false,
            has_prev: false
          }
        },
        timestamp: new Date().toISOString()
      })

    } catch (error: any) {
      console.error('Get stock logs error:', error)

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Failed to retrieve stock logs',
        errors: [{ message: error.message }],
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  })(request)
}
