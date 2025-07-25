// ========== FIXED API: /api/inventory/stock-logs/route.ts ==========
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
        // Export CSV
        const exportQuery = `
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
            COALESCE(psl.reference_id, '') as reference_id,
            COALESCE(psl.notes, '') as notes,
            COALESCE(e.name, '') as employee_name
          FROM product_stock_ledgers psl
          JOIN products p ON psl.product_id = p.id
          JOIN branches b ON psl.branch_id = b.id
          LEFT JOIN purchase_batches pb ON psl.batch_id = pb.id
          LEFT JOIN employees e ON psl.created_by = e.id
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
        const headers = ['Date', 'Product', 'SKU', 'Branch', 'Type', 'Quantity', 'Batch', 'Cost Price', 'Selling Price', 'Reference', 'Notes', 'Employee']
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
            `"${row.reference_type}:${row.reference_id}"`,
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

      // Count query
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

      // Main query
      const stockLogsQuery = `
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
      
      let result;
      if (queryParams.length > 2) { // More than just limit and offset
        result = await query(stockLogsQuery, queryParams)
      } else {
        // Only pagination parameters, no filters
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
        result = await query(simplePaginationQuery, [limit, offset])
      }

      const totalPages = Math.ceil(total / limit)

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result.rows,
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

