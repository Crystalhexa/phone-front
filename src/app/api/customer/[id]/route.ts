import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';

// --- Validation Schema (for PUT) ---
const customerUpdateSchema = z.object({
  customer_number: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
  nic: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  date_of_birth: z.string().datetime({ offset: true }).nullable().optional(),
  credit_limit: z.coerce.number().nullable().optional(),
  outstanding_balance: z.coerce.number(),
  loyalty_points: z.coerce.number(),
  is_active: z.boolean(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// --- GET: Get Customer by ID ---
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const result = await query('SELECT * FROM customers WHERE id = $1', [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Customer not found', data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Customer retrieved successfully',
    });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to retrieve customer' },
      { status: 500 }
    );
  }
}

// --- PUT: Update Customer ---
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const json = await req.json();
    const data = customerUpdateSchema.parse(json);

    const result = await transaction(async (client) => {
      const updateQuery = `
        UPDATE customers
        SET
          customer_number = $1,
          name = $2,
          email = $3,
          nic = $4,
          phone = $5,
          address = $6,
          date_of_birth = $7,
          credit_limit = $8,
          outstanding_balance = $9,
          loyalty_points = $10,
          is_active = $11,
          updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `;

      const values = [
        data.customer_number,
        data.name,
        data.email ?? null,
        data.nic ?? null,
        data.phone ?? null,
        data.address ?? null,
        data.date_of_birth ? new Date(data.date_of_birth) : null,
        data.credit_limit ?? null,
        data.outstanding_balance,
        data.loyalty_points,
        data.is_active,
        params.id,
      ];

      const res = await client.query(updateQuery, values);
      return res.rows[0];
    });

    if (!result) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// --- DELETE: Remove Customer ---
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const res = await query('DELETE FROM customers WHERE id = $1 RETURNING *', [params.id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
      data: res.rows[0],
    });
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
