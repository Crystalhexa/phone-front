import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query } from '@/lib/database/connection';
import { z } from 'zod';

const brandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// GET handler — list brands with pagination, search, and sorting
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 100);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = (searchParams.get('sortOrder') ?? 'asc').toLowerCase();

  const validSortBy = ['name', 'brand_id', 'code'];
  const validSortOrder = ['asc', 'desc'];
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name';
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

  try {
    await initDatabase();

    const queryText = `
      WITH filtered_brands AS (
        SELECT 
          brand_id, name, code, description,
          COUNT(*) OVER() AS total_count
        FROM "Brand"
        WHERE name ILIKE $1 OR code ILIKE $1
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $2 OFFSET $3
      )
      SELECT brand_id, name, code, description, total_count
      FROM filtered_brands
    `;

    const params = [`%${search}%`, limit, offset];
    const result = await query(queryText, params);
    const brands = result.rows;
    const total = brands.length > 0 ? parseInt(brands[0].total_count, 10) : 0;
    const cleanBrands = brands.map(({ total_count, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: { brands: cleanBrands, total, limit, page },
      message: 'Brands retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Brand fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve brands',
      data: null,
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST handler — create brand
export async function POST(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = brandSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: parsed.error.format(),
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders });
    }

    const { name, code, description } = parsed.data;

    await initDatabase();

    const insertQuery = `
      INSERT INTO "Brand" (name, code, description)
      VALUES ($1, $2, $3)
      RETURNING brand_id, name, code, description
    `;

    const result = await query(insertQuery, [name, code, description ?? null]);

    return NextResponse.json({
      success: true,
      message: 'Brand created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('POST /brand error:', error);

    // PostgreSQL constraint errors
    if (error.code === '23505') {
      const constraint = error.constraint ?? '';
      const field = constraint.includes('name') ? 'name' : constraint.includes('code') ? 'code' : 'field';
      return NextResponse.json({
        success: false,
        message: `A brand with the same ${field} already exists.`,
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred while creating the brand.',
      data: null,
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500, headers: corsHeaders });
  }
}
