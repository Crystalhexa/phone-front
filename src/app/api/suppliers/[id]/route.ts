import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';

// Updated Zod schema for supplier
const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
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
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// GET /api/suppliers/[id]
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await initDatabase();

    const result = await query(`SELECT * FROM suppliers WHERE id = $1`, [params.id]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Supplier not found',
        data: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('GET supplier by ID error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve supplier',
      data: null,
      errors: [error.message || error],
    }, { status: 500 });
  }
}

// PUT /api/suppliers/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initDatabase();

  try {
    const json = await req.json();
    const data = supplierSchema.parse(json);

    const updated = await transaction(async client => {
      const updateQuery = `
        UPDATE suppliers SET
          name = $1,
          code = $2,
          contact_name = $3,
          phone = $4,
          email = $5,
          address = $6,
          sales_rep_name = $7,
          sales_rep_phone = $8,
          is_active = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `;

      const values = [
        data.name,
        data.code,
        data.contact_name ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.address ?? null,
        data.sales_rep_name ?? null,
        data.sales_rep_phone ?? null,
        data.is_active,
        params.id,
      ];

      const result = await client.query(updateQuery, values);

      if (result.rowCount === 0) {
        throw new Error('Supplier not found');
      }

      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Supplier updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('PUT /suppliers/:id error:', err);

    return NextResponse.json({
      success: false,
      message: err.message || 'Failed to update supplier',
      data: null,
      errors: err.issues || null,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// DELETE /api/suppliers/[id] — Soft delete
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await initDatabase();

  try {
    const result = await query(
      `UPDATE suppliers SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [params.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Supplier not found',
        data: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier deactivated (soft deleted) successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('DELETE supplier error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete supplier',
      data: null,
      errors: [error.message || error],
    }, { status: 500 });
  }
}
