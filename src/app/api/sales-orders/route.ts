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
          'SALES_ORDER_CREATED',
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