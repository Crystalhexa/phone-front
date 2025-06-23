// /app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, query, transaction, ApiResponse } from '@/lib/database/connection'
import { z } from 'zod'

// 1. Zod Schema for request payload
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  subcategories: z.array(z.string().min(1)).optional(),
})

type CreateCategoryPayload = z.infer<typeof createCategorySchema>

export async function POST(request: NextRequest) {
  let payload: CreateCategoryPayload
  try {
    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: parsed.error.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    payload = parsed.data
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid JSON',
        errors: [err instanceof Error ? err.message : 'Invalid input'],
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }
  await initDatabase()
  const categoryErrors: { name: string; error: string }[] = [];
  const subcategoryErrors: { index: number; name: string; error: string }[] = [];

  try {
    const result = await transaction(async (client) => {
      let categoryId: number | null = null;

      try {
        const categoryRes = await client.query(
          `INSERT INTO "Category" (name, description) VALUES ($1, $2) RETURNING category_id`,
          [payload.name, payload.description ?? null]
        );
        categoryId = categoryRes.rows[0].category_id;
      } catch (categoryErr: any) {
        if (categoryErr.code === '23505') {
          categoryErrors.push({
            name: payload.name,
            error: `Category with name '${payload.name}' already exists.`,
          });
          throw new Error('CATEGORY_DUPLICATE'); // Custom flag for rollback
        }
        throw categoryErr;
      }

      if (payload.subcategories?.length) {
        for (let i = 0; i < payload.subcategories.length; i++) {
          const subName = payload.subcategories[i];
          try {
            await client.query(
              `INSERT INTO "SubCategory" (name, description, category_id) VALUES ($1, $2, $3)`,
              [subName, null, categoryId]
            );
          } catch (subErr: any) {
            let message = subErr.message || 'Unknown error';
            if (subErr.code === '23505') {
              message = `Subcategory with name '${subName}' already exists.`;
            }
            subcategoryErrors.push({ index: i, name: subName, error: message });
          }
        }
      }

      return { categoryId };
    });

    const responsePayload = {
      success: categoryErrors.length === 0 && subcategoryErrors.length === 0,
      data: {
        category_id: result.categoryId,
        subcategory_errors: subcategoryErrors.length ? subcategoryErrors : null,
      },
      message:
        categoryErrors.length > 0
          ? categoryErrors[0].error
          : subcategoryErrors.length > 0
            ? 'Category created, but some subcategories failed.'
            : 'Category and all subcategories created successfully.',
      errors: [...categoryErrors, ...subcategoryErrors],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(responsePayload, {
      status: responsePayload.success ? 201 : categoryErrors.length ? 400 : 207,
    });
  } catch (error: any) {
    if (error.message === 'CATEGORY_DUPLICATE') {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: categoryErrors[0]?.error || 'Duplicate category name.',
          errors: categoryErrors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Internal Server Error',
        errors: [error.message || error],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '10', 10)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const offset = (page - 1) * limit
  const search = searchParams.get('search') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'name'
  const sortOrder = searchParams.get('sortOrder') ?? 'asc'

  const validSortBy = ['name', 'category_id']
  const validSortOrder = ['asc', 'desc']
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name'
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc'

  try {
    await initDatabase()

    // Use conditional queries instead of dynamic SQL to avoid injection
    let query_text: string
    let params: any[]

    if (safeSortBy === 'name') {
      query_text = `
        WITH filtered_categories AS (
          SELECT 
            c.category_id, 
            c.name, 
            c.description,
            COUNT(*) OVER() as total_count
          FROM "Category" c
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
                'subcategory_id', s.subcategory_id,
                'name', s.name,
                'description', s.description
              ) ORDER BY s.name
            ) FILTER (WHERE s.subcategory_id IS NOT NULL),
            '[]'::json
          ) AS subcategories
        FROM filtered_categories fc
        LEFT JOIN "SubCategory" s ON s.category_id = fc.category_id
        GROUP BY fc.category_id, fc.name, fc.description, fc.total_count
        ORDER BY fc.name ${safeSortOrder}
      `
    } else {
      query_text = `
        WITH filtered_categories AS (
          SELECT 
            c.category_id, 
            c.name, 
            c.description,
            COUNT(*) OVER() as total_count
          FROM "Category" c
          WHERE c.name ILIKE $1
          ORDER BY c.category_id ${safeSortOrder}
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
                'subcategory_id', s.subcategory_id,
                'name', s.name,
                'description', s.description
              ) ORDER BY s.name
            ) FILTER (WHERE s.subcategory_id IS NOT NULL),
            '[]'::json
          ) AS subcategories
        FROM filtered_categories fc
        LEFT JOIN "SubCategory" s ON s.category_id = fc.category_id
        GROUP BY fc.category_id, fc.name, fc.description, fc.total_count
        ORDER BY fc.category_id ${safeSortOrder}
      `
    }

    params = [`%${search}%`, limit, offset]
    const result = await query(query_text, params)

    const categories = result.rows
    const total = categories.length > 0 ? parseInt(categories[0].total_count, 10) : 0

    // Remove total_count from individual category objects
    const cleanCategories = categories.map(({ total_count, ...category }) => category)

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
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Category fetch error:', error)
    const errorResponse: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to retrieve categories',
      errors: [error],
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}