import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query } from '@/lib/database/connection';
import { z } from 'zod';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse and sanitize query params
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 100); // max 100 per page
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = (searchParams.get('sortOrder') ?? 'asc').toLowerCase();

  // Allowed sort fields & orders
  const validSortBy = ['name', 'brand_id'];
  const validSortOrder = ['asc', 'desc'];

  // Validate sortBy and sortOrder to avoid injection
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name';
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

  try {
    await initDatabase();

    const queryText = `
      WITH filtered_brands AS (
        SELECT 
          brand_id, 
          name, 
          description,
          COUNT(*) OVER() as total_count
        FROM "Brand"
        WHERE name ILIKE $1
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $2 OFFSET $3
      )
      SELECT 
        brand_id, 
        name, 
        description,
        total_count
      FROM filtered_brands
    `;

    const params = [`%${search}%`, limit, offset];

    const result = await query(queryText, params);

    const brands = result.rows;
    const total = brands.length > 0 ? parseInt(brands[0].total_count, 10) : 0;

    // Remove total_count from individual objects
    const cleanBrands = brands.map(({ total_count, ...brand }) => brand);

    const response = {
      success: true,
      data: {
        brands: cleanBrands,
        total,
        limit,
        page,
      },
      message: 'Brands retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Brand fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Failed to retrieve brands',
        errors: [error],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

const brandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// Basic CORS headers - adjust origins as needed
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(req: NextRequest) {
  // Handle preflight OPTIONS request (for CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Placeholder for authentication check
    // e.g. const user = await authenticate(req);
    // if (!user) return unauthorized response

    const body = await req.json();

    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input',
          errors: parsed.error.format(),
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { name, description } = parsed.data;

    await initDatabase();

    try {
      const result = await query(
        `
          INSERT INTO "Brand" (name, description)
          VALUES ($1, $2)
          RETURNING brand_id, name, description
        `,
        [name, description ?? null]
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Brand created successfully',
          data: result.rows[0],
          timestamp: new Date().toISOString(),
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('POST /brand error:', error);

      return NextResponse.json(
        {
          success: false,
          message: 'Internal server error',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    // Catch JSON parsing errors or unexpected errors here
    console.error('POST /brand outer error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Bad request',
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 400, headers: corsHeaders }
    );
  }
}
