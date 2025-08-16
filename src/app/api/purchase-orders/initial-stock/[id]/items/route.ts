import { ApiResponse,initDatabase, transaction } from "@/lib/database/connection";
import { handleApiError } from "@/lib/utils/apiHelpers";
import { AppError } from "@/lib/utils/AppError";
import { AuthenticatedRequest, withPermission } from "@/middleware/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission('view_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      await initDatabase();
      const { user: userDetails } = authedReq.user
          const { id: idParam } = await params;

      const purchaseOrderId = idParam;

      const result = await transaction(async (client) => {
        const query = `
          SELECT 
            poi.id,
            poi.product_id,
            p.name as product_name,
            p.sku as product_sku,
            p.is_unique,
            poi.quantity_ordered,
            poi.quantity_received,
            poi.cost_price,
            poi.wholesale_price,
            poi.retail_price,
            poi.line_total,
            pb.id as batch_id,
            poi.created_at,
            CASE 
              WHEN p.is_unique THEN 
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', ib.id,
                      'barcode', ib.id,
                      'status', ib.status
                    ) 
                    ORDER BY ib.created_at DESC
                  ) FILTER (WHERE ib.id IS NOT NULL), 
                  '[]'::json
                )
              ELSE '[]'::json
            END as barcodes
          FROM purchase_order_items poi
          LEFT JOIN products p ON poi.product_id = p.id
          LEFT JOIN purchase_batches pb ON poi.id = pb.purchase_order_item_id
          LEFT JOIN item_barcodes ib ON pb.id = ib.purchase_batch_id
          WHERE poi.purchase_order_id = $1
          GROUP BY poi.id, p.name, p.sku, p.is_unique, pb.id
          ORDER BY poi.created_at DESC
        `

        const itemsResult = await client.query(query, [purchaseOrderId])
        return itemsResult.rows
      })

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
        message: 'Items fetched successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error: any) {
      return handleApiError(error)
    }
  })(request)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      await initDatabase();
      const { user: userDetails } = authedReq.user;
          const { id: idParam } = await params;

      const purchaseOrderId = idParam;

      const result = await transaction(async (client) => {
        // Verify purchase order exists and is in DRAFT status
        const orderQuery = `
          SELECT id, status FROM purchase_orders 
          WHERE id = $1 AND purchased_by = $2
        `
        const orderResult = await client.query(orderQuery, [purchaseOrderId, userDetails.employee_id])
        
        if (orderResult.rows.length === 0) {
          throw new AppError('Purchase order not found', 404)
        }

        const order = orderResult.rows[0]
        if (order.status !== 'DRAFT') {
          throw new AppError('Purchase order is already closed', 400)
        }

        // Calculate totals from items
        const totalsQuery = `
          SELECT 
            COALESCE(SUM(line_total), 0) as subtotal,
            COUNT(*) as item_count
          FROM purchase_order_items 
          WHERE purchase_order_id = $1
        `
        const totalsResult = await client.query(totalsQuery, [purchaseOrderId])
        const { subtotal, item_count } = totalsResult.rows[0]

        if (item_count === 0) {
          throw new AppError('Cannot close purchase order without items', 400)
        }

        // Update purchase order status and totals
        const updateQuery = `
          UPDATE purchase_orders 
          SET 
            status = 'COMPLETED',
            subtotal = $1,
            total_amount = $1,
            received_date = $2,
            updated_at = $3
          WHERE id = $4
          RETURNING id, order_number, subtotal, total_amount
        `

        const updateResult = await client.query(updateQuery, [
          subtotal,
          new Date().toISOString(),
          new Date().toISOString(),
          purchaseOrderId
        ])

        return updateResult.rows[0]
      })

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
        message: 'Purchase order closed successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error: any) {
      return handleApiError(error)
    }
  })(request)
}