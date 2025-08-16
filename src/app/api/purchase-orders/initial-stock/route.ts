import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiResponse, initDatabase, transaction } from '@/lib/database/connection'
import { createId } from '@paralleldrive/cuid2'
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'
import { validateSupplier } from '@/lib/services/validation.service'
import { handleApiError } from '@/lib/utils/apiHelpers'

const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier ID is required'),
  order_date: z.string().datetime().optional(),
  expected_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  is_initial_stock: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      await initDatabase();
      const { user: userDetails } = authedReq.user

      let body
      try {
        body = await request.json()
      } catch {
        return NextResponse.json<ApiResponse>({
          success: false,
          data: null,
          message: 'Invalid JSON payload',
          timestamp: new Date().toISOString()
        }, { status: 400 })
      }

      const validationResult = createPurchaseOrderSchema.safeParse(body)
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))

        return NextResponse.json<ApiResponse>({
          success: false,
          data: null,
          message: 'Validation failed',
          errors,
          timestamp: new Date().toISOString()
        }, { status: 400 })
      }

      const data = validationResult.data
      await validateSupplier(data.supplier_id)

      const result = await transaction(async (client) => {
        const id = createId()
        
        const query = `
          INSERT INTO purchase_orders (
            id, supplier_id, purchased_by, branch_id,
            order_date, expected_date, status, 
            subtotal, total_amount, notes, is_initial_stock
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, order_number, created_at
        `

        const values = [
          id,
          data.supplier_id,
          userDetails.employee_id,
          userDetails.branch_id,
          data.order_date || new Date().toISOString(),
          data.expected_date || null,
          'DRAFT', // New status for incomplete orders
          0, // Initial subtotal
          0, // Initial total
          data.notes || null,
          data.is_initial_stock
        ]

        const orderResult = await client.query(query, values)
        
        // Fetch full order details
        const fetchQuery = `
          SELECT 
            po.id,
            po.order_number,
            po.supplier_id,
            po.status,
            po.is_initial_stock,
            po.created_at,
            s.name as supplier_name,
            s.code as supplier_code,
            b.name as branch_name
          FROM purchase_orders po
          LEFT JOIN suppliers s ON po.supplier_id = s.id
          LEFT JOIN branches b ON po.branch_id = b.id
          WHERE po.id = $1
        `
        
        const fullOrderResult = await client.query(fetchQuery, [id])
        return fullOrderResult.rows[0]
      })

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
        message: 'Purchase order created successfully',
        timestamp: new Date().toISOString()
      }, { status: 201 })

    } catch (error: any) {
      return handleApiError(error)
    }
  })(request)
}