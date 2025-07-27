import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';
import cuid from 'cuid';

// Zod schema for validation
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().nullable().optional(),
  nic: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  date_of_birth: z.string().datetime({ offset: true }).nullable().optional(),
  credit_limit: z.coerce.number().nullable().optional(),
  outstanding_balance: z.coerce.number().default(0),
  loyalty_points: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
});


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// GET handler — list customers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 100);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = (searchParams.get('sortOrder') ?? 'asc').toLowerCase();

  const validSortBy = ['name', 'id', 'customer_number', 'email'];
  const validSortOrder = ['asc', 'desc'];
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name';
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

  try {
    await initDatabase();

    const queryText = `
      WITH filtered_customers AS (
        SELECT 
          id, customer_number, name, email, nic, phone, address,
          date_of_birth, credit_limit, outstanding_balance,
          loyalty_points, is_active, created_at, updated_at,
          COUNT(*) OVER() AS total_count
        FROM customers
        WHERE name ILIKE $1 OR customer_number ILIKE $1 OR email ILIKE $1
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $2 OFFSET $3
      )
      SELECT * FROM filtered_customers
    `;

    const params = [`%${search}%`, limit, offset];
    const result = await query(queryText, params);
    const customers = result.rows;
    const total = customers.length > 0 ? parseInt(customers[0].total_count, 10) : 0;
    const cleanCustomers = customers.map(({ total_count, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: { customers: cleanCustomers, total, limit, page },
      message: 'Customers retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Customer fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve customers',
      data: null,
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await initDatabase();

  try {
    const json = await req.json();
    const data = customerSchema.parse(json);

    const result = await transaction(async client => {
      const customerId = cuid();

      const insertQuery = `
        INSERT INTO customers (
          id, name, email, nic, phone, address,
          date_of_birth, credit_limit, outstanding_balance,
          loyalty_points, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11
        )
        RETURNING *
      `;

      const params = [
        customerId,
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
      ];

      const res = await client.query(insertQuery, params);

      return res.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Customer created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201, headers: corsHeaders });

  } catch (err: any) {
    console.error('❌ POST /customers error:', err);

    // Handle PostgreSQL unique constraint violation
    if (err.code === '23505') {
      const detail = err.detail || '';
      let field = 'a unique field';

      if (detail.includes('customers_customer_number_key')) field = 'customer number';
      else if (detail.includes('customers_email_key')) field = 'email';
      else if (detail.includes('customers_phone_key')) field = 'phone';
      else if (detail.includes('customers_nic_key')) field = 'NIC';

      return NextResponse.json({
        success: false,
        data: null,
        message: `Conflict on field: ${field}. ${detail}`,
        timestamp: new Date().toISOString(),
      }, { status: 409, headers: corsHeaders });
    }

    // Handle validation or generic errors
    return NextResponse.json({
      success: false,
      data: null,
      message: err.message || 'Internal Server Error',
      errors: err.issues || null,
      timestamp: new Date().toISOString(),
    }, { status: 500, headers: corsHeaders });
  }
}
