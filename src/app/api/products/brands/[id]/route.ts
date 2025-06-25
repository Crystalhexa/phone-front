import { initDatabase, query } from '@/lib/database/connection';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const brandUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
});

// GET /api/brand/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDatabase();
  const { id: idParam } = await params;
  const id = idParam;

  try {
    const result = await query(
      `SELECT id, name, code, description FROM "brands" WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Brand not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Brand retrieved',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('GET /brand/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Error retrieving brand',
        errors: [error.message || error],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// PUT /api/brand/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDatabase();
  const { id: idParam } = await params;
  const id = idParam;


  const body = await req.json();
  const parsed = brandUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Validation failed',
        errors: parsed.error.format(),
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  const { name, code, description } = parsed.data;

  try {
    const result = await query(
      `UPDATE "brands"
       SET name = $1, code = $2, description = $3
       WHERE id = $4
       RETURNING id, name, code, description`,
      [name, code, description ?? null, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Brand not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Brand updated',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('PUT /brand/[id] error:', error);

    if (error.code === '23505') {
      const field = error.constraint?.includes('name')
        ? 'name'
        : error.constraint?.includes('code')
        ? 'code'
        : 'field';
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `A brand with the same ${field} already exists.`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Error updating brand',
        errors: [error.message || error],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// DELETE /api/brand/[id]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDatabase();
  const { id: idParam } = await params;
  const id = idParam;

  try {
    const result = await query(
      `DELETE FROM "brands" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Brand not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: id },
      message: 'Brand deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('DELETE /brand/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Error deleting brand',
        errors: [error.message || error],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}