// /app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';
import cuid from 'cuid';

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  sales_rep_name: z.string().nullable().optional(),
  sales_rep_phone: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 100);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = (searchParams.get('sortOrder') ?? 'asc').toLowerCase();

  const validSortBy = ['name', 'id', 'code', 'email'];
  const validSortOrder = ['asc', 'desc'];
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name';
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

  try {
    await initDatabase();

    const queryText = `
      WITH filtered_suppliers AS (
        SELECT 
          id, name, code, contact_name, phone, email, address,
          sales_rep_name, sales_rep_phone, is_active, created_at, updated_at,
          COUNT(*) OVER() AS total_count
        FROM suppliers
        WHERE name ILIKE $1 OR code ILIKE $1 OR email ILIKE $1
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $2 OFFSET $3
      )
      SELECT * FROM filtered_suppliers
    `;

    const params = [`%${search}%`, limit, offset];
    const result = await query(queryText, params);
    const suppliers = result.rows;
    const total = suppliers.length > 0 ? parseInt(suppliers[0].total_count, 10) : 0;
    const cleanSuppliers = suppliers.map(({ total_count, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: { suppliers: cleanSuppliers, total, limit, page },
      message: 'Suppliers retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve suppliers',
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
    const data = supplierSchema.parse(json);

    const result = await transaction(async client => {
      const supplierId = cuid();

      const insertQuery = `
        INSERT INTO suppliers (
          id, name, contact_name, phone, email, address,
          sales_rep_name, sales_rep_phone, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9
        )
        RETURNING *
      `;

      const params = [
        supplierId,
        data.name,
        data.contact_name ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.address ?? null,
        data.sales_rep_name ?? null,
        data.sales_rep_phone ?? null,
        data.is_active,
      ];

      const res = await client.query(insertQuery, params);
      return res.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Supplier created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201, headers: corsHeaders });

  } catch (err: any) {
    if (err.code === '23505') {
      const detail = err.detail || '';
      let field = 'a unique field';

      if (detail.includes('suppliers_code_key')) field = 'code';
      else if (detail.includes('suppliers_email_key')) field = 'email';

      return NextResponse.json({
        success: false,
        data: null,
        message: `Conflict on field: ${field}. ${detail}`,
        timestamp: new Date().toISOString(),
      }, { status: 409, headers: corsHeaders });
    }

    return NextResponse.json({
      success: false,
      data: null,
      message: err.message || 'Internal Server Error',
      errors: err.issues || null,
      timestamp: new Date().toISOString(),
    }, { status: 500, headers: corsHeaders });
  }
}
