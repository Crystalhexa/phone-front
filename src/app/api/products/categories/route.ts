// /app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, initDatabase, query, transaction } from '@/lib/database/connection'
import { z } from 'zod'
import cuid from 'cuid';
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  subcategories: z.array(z.string().min(1)).optional(),
});

type CreateCategoryPayload = z.infer<typeof createCategorySchema>;

async function checkCategoryExists(categoryName: string): Promise<boolean> {
  const result = await query(
    `SELECT id FROM "categories" WHERE name = $1`,
    [categoryName]
  );
  return result.rows.length > 0;
}

async function checkSubcategoriesExist(subcategoryNames: string[]): Promise<string[]> {
  if (!subcategoryNames.length) return [];

  const placeholders = subcategoryNames.map((_, i) => `$${i + 1}`).join(',');
  const result = await query(
    `SELECT name FROM "subcategories" WHERE name IN (${placeholders})`,
    subcategoryNames
  );

  return result.rows.map(row => row.name);
}

async function createCategoryInDatabase(payload: CreateCategoryPayload) {
  return await transaction(async (client) => {
    const categoryId = cuid(); // generate id manually
    const categoryRes = await client.query(
      `INSERT INTO "categories" (id, name, description) VALUES ($1, $2, $3) RETURNING id`,
      [categoryId, payload.name, payload.description ?? null]
    );

    if (payload.subcategories?.length) {
      for (const subName of payload.subcategories) {
        const subcategoryId = cuid();
        await client.query(
          `INSERT INTO "subcategories" (id, name, category_id) VALUES ($1, $2, $3)`,
          [subcategoryId, subName, categoryId]
        );
      }
    }

    return { categoryId };
  });
}

export async function POST(request: NextRequest) {
  let payload: CreateCategoryPayload | undefined;
  try {
    await initDatabase();

    try {
      const body = await request.json();
      const parsed = createCategorySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
      }

      payload = parsed.data;
    } catch {
      return NextResponse.json({ message: 'Invalid JSON format' }, { status: 400 });
    }

    const categoryExists = await checkCategoryExists(payload.name);
    if (categoryExists) {
      return NextResponse.json(
        { message: `Category '${payload.name}' already exists` },
        { status: 400 }
      );
    }

    if (payload.subcategories?.length) {
      const existingSubcategories = await checkSubcategoriesExist(payload.subcategories);

      if (existingSubcategories.length > 0) {
        return NextResponse.json(
          {
            message: `Category is OK but these subcategories already exist: ${existingSubcategories.join(', ')}`
          },
          { status: 400 }
        );
      }
    }

    const result = await createCategoryInDatabase(payload);

    return NextResponse.json(
      {
        message: 'Category created successfully',
        category_id: result.categoryId
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error in category creation:', error);

    if (error.code === '23505') {
      if (error.constraint?.includes('category')) {
        return NextResponse.json(
          { message: `Category '${payload?.name}' already exists` },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { message: 'Duplicate entry found' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const offset = (page - 1) * limit;
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = searchParams.get('sortOrder') ?? 'asc';

  const validSortBy = ['name', 'category_id'];
  const validSortOrder = ['asc', 'desc'];
  const safeSortBy = validSortBy.includes(sortBy) ? (sortBy === 'category_id' ? 'id' : sortBy) : 'name';
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

  try {
    await initDatabase();

    let query_text: string;
    let params: any[];

    if (safeSortBy === 'name') {
      query_text = `
        WITH filtered_categories AS (
          SELECT 
            c.id AS category_id, 
            c.name, 
            c.description,
            COUNT(*) OVER() as total_count
          FROM "categories" c
          WHERE c.name ILIKE $1
          ORDER BY c.name ${safeSortOrder}
          LIMIT $2 OFFSET $3
        )
        SELECT 
          fc.category_id, 
          fc.name, 
          fc.description,
          fc.total_count,
          COALESCE(
            json_agg(
              json_build_object(
                'subcategory_id', s.id,
                'name', s.name,
                'description', NULL
              ) ORDER BY s.name
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::json
          ) AS subcategories
        FROM filtered_categories fc
        LEFT JOIN "subcategories" s ON s.category_id = fc.category_id
        GROUP BY fc.category_id, fc.name, fc.description, fc.total_count
        ORDER BY fc.name ${safeSortOrder}
      `;
    } else {
      query_text = `
        WITH filtered_categories AS (
          SELECT 
            c.id AS category_id, 
            c.name, 
            c.description,
            COUNT(*) OVER() as total_count
          FROM "categories" c
          WHERE c.name ILIKE $1
          ORDER BY c.id ${safeSortOrder}
          LIMIT $2 OFFSET $3
        )
        SELECT 
          fc.category_id, 
          fc.name, 
          fc.description,
          fc.total_count,
          COALESCE(
            json_agg(
              json_build_object(
                'subcategory_id', s.id,
                'name', s.name,
                'description', NULL
              ) ORDER BY s.name
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::json
          ) AS subcategories
        FROM filtered_categories fc
        LEFT JOIN "subcategories" s ON s.category_id = fc.category_id
        GROUP BY fc.category_id, fc.name, fc.description, fc.total_count
        ORDER BY fc.category_id ${safeSortOrder}
      `;
    }

    params = [`%${search}%`, limit, offset];
    const result = await query(query_text, params);

    const categories = result.rows;
    const total = categories.length > 0 ? parseInt(categories[0].total_count, 10) : 0;
    const cleanCategories = categories.map(({ total_count, ...category }) => category);

    const response: ApiResponse = {
      success: true,
      data: {
        categories: cleanCategories,
        total,
        limit,
        offset,
      },
      message: 'Categories retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Category fetch error:', error);
    const errorResponse: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to retrieve categories',
      errors: [error],
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
