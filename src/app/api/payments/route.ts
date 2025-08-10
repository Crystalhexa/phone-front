import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';
import { AuthenticatedRequest, withPermission } from '@/middleware/auth';
import cuid from 'cuid';

// Validation schema
const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  amountPaid: z.number().min(0).optional().default(0),
  order_id: z.string().optional(),
  orderId: z.string().optional(), // Handle both field names
  customer_id: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD','DEBIT_CARD', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_PAYMENT']),
  received_amount: z.number().min(0).optional(),
  change_amount: z.number().min(0).optional().default(0),
  reference_number: z.string().optional(),
  cheque_number: z.string().optional(),
  cheque_date: z.string().optional(), // ISO date string
  bank_name: z.string().optional(),
  notes: z.string().optional().default(''),
});

type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export async function POST(request: NextRequest) {
  return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
    try {
      // Initialize database if needed
      await initDatabase();
      
      const { user: userDetails } = authedReq.user;
      const branchId = userDetails.branch_id;
      
      if (!branchId) {
        return NextResponse.json({
          success: false,
          message: 'User branch not found',
          data: null,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }

      // Parse and validate request body
      const body = await request.json();
      const validationResult = createPaymentSchema.safeParse(body);
      
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.errors,
          data: null,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }

      const data = validationResult.data;
      
      // Handle both order_id and orderId field names
      const salesOrderId = data.order_id || data.orderId;
      
      // Validate payment method specific requirements
      if (data.paymentMethod === 'CASH') {
        if (!data.received_amount || data.received_amount <= 0) {
          return NextResponse.json({
            success: false,
            message: 'Received amount is required for cash payments',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }
        
        // Calculate change amount for cash payments
        const changeAmount = Math.max(0, data.received_amount - data.amount);
        data.change_amount = changeAmount;
      }

      // Validate sales order exists if provided
      if (salesOrderId) {
        const orderCheck = await query(
          'SELECT id, customer_id, total_amount, branch_id FROM sales_orders WHERE id = $1',
          [salesOrderId]
        );
        
        if (orderCheck.rows.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'Sales order not found',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 404 });
        }
        
        const order = orderCheck.rows[0];
        
        // Ensure the order belongs to the same branch
        if (order.branch_id !== branchId) {
          return NextResponse.json({
            success: false,
            message: 'Sales order does not belong to your branch',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 403 });
        }
        
        // Use customer from order if not provided
        if (!data.customer_id) {
          data.customer_id = order.customer_id;
        }
      }

      // Validate customer exists if provided
      if (data.customer_id) {
        const customerCheck = await query(
          'SELECT id FROM customers WHERE id = $1',
          [data.customer_id]
        );
        
        if (customerCheck.rows.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'Customer not found',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 404 });
        }
      }

      // Generate payment number
      const paymentNumberResult = await query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 4) AS INTEGER)), 0) + 1 as next_number
         FROM payments 
         WHERE payment_number LIKE 'PAY%'`
      );
      const nextNumber = paymentNumberResult.rows[0]?.next_number || 1;
      const paymentNumber = `PAY${String(nextNumber).padStart(6, '0')}`;
      const paymentId = cuid()
      // Create payment within a transaction
      const result = await transaction(async (client) => {
        // Insert payment
        const insertPaymentQuery = `
          INSERT INTO payments (
            id,
            payment_number,
            sales_order_id,
            customer_id,
            branch_id,
            payment_method,
            payment_status,
            amount,
            received_amount,
            change_amount,
            reference_number,
            cheque_number,
            cheque_date,
            bank_name,
            payment_date,
            processed_by,
            notes,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,$17, NOW(), NOW()
          ) RETURNING *
        `;
        
        const paymentValues = [
          paymentId,
          paymentNumber,
          salesOrderId || null,
          data.customer_id || null,
          branchId,
          data.paymentMethod,
          'PAID', // Default status
          data.amount,
          data.received_amount || null,
          data.change_amount || 0,
          data.reference_number || null,
          data.cheque_number || null,
          data.cheque_date ? new Date(data.cheque_date) : null,
          data.bank_name || null,
          new Date(),
          userDetails.employee_id, // processed_by
          data.notes || '',
        ];
        
        const paymentResult = await client.query(insertPaymentQuery, paymentValues);
        const payment = paymentResult.rows[0];
        
      
        return payment;
      });

      // Fetch the complete payment with relations
      const completePayment = await query(`
        SELECT 
          p.*,
          c.name as customer_name,
          so.order_number,
          b.name as branch_name,
          e.name as processed_by_name
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN sales_orders so ON p.sales_order_id = so.id
        LEFT JOIN branches b ON p.branch_id = b.id
        LEFT JOIN employees e ON p.processed_by = e.id
        WHERE p.id = $1
      `, [result.id]);

      return NextResponse.json({
        success: true,
        message: 'Payment created successfully',
        data: completePayment.rows[0],
        timestamp: new Date().toISOString()
      }, { status: 201 });

    } catch (error: any) {
      console.error('❌ Error creating payment:', error);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to create payment',
        errors: [error.message],
        data: null,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  })(request);
}