// /app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, initDatabase, query, transaction } from '@/lib/database/connection'
import { z } from 'zod'

// Zod Schema for request payload
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  subcategories: z.array(z.string().min(1)).optional(),
});

type CreateCategoryPayload = z.infer<typeof createCategorySchema>;

// Helper function to check if category exists
async function checkCategoryExists(categoryName: string): Promise<boolean> {
  const result = await query(
    `SELECT category_id FROM "Category" WHERE name = $1`,
    [categoryName]
  );
  return result.rows.length > 0;
}

// Helper function to check which subcategories already exist
async function checkSubcategoriesExist(subcategoryNames: string[]): Promise<string[]> {
  if (!subcategoryNames.length) return [];
  
  const placeholders = subcategoryNames.map((_, i) => `$${i + 1}`).join(',');
  const result = await query(
    `SELECT name FROM "SubCategory" WHERE name IN (${placeholders})`,
    subcategoryNames
  );
  
  return result.rows.map(row => row.name);
}

// Main function to create category
async function createCategoryInDatabase(payload: CreateCategoryPayload) {
  return await transaction(async (client) => {
    // Create category
    const categoryRes = await client.query(
      `INSERT INTO "Category" (name, description) VALUES ($1, $2) RETURNING category_id`,
      [payload.name, payload.description ?? null]
    );
    const categoryId = categoryRes.rows[0].category_id;
    
    // Create subcategories if provided
    if (payload.subcategories?.length) {
      for (const subName of payload.subcategories) {
        await client.query(
          `INSERT INTO "SubCategory" (name, description, category_id) VALUES ($1, $2, $3)`,
          [subName, null, categoryId]
        );
      }
    }
    
    return { categoryId };
  });
}

export async function POST(request: NextRequest) {
  let payload: CreateCategoryPayload | undefined;
  try {
    // Initialize database connection
    await initDatabase();
    
    // Validate request body
    try {
      const body = await request.json();
      const parsed = createCategorySchema.safeParse(body);
      
      if (!parsed.success) {
        return NextResponse.json(
          { message: 'Invalid request data' },
          { status: 400 }
        );
      }
      
      payload = parsed.data;
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid JSON format' },
        { status: 400 }
      );
    }
    
    // Check if category already exists
    const categoryExists = await checkCategoryExists(payload.name);
    if (categoryExists) {
      return NextResponse.json(
        { message: `Category '${payload.name}' already exists` },
        { status: 400 }
      );
    }
    
    // If subcategories provided, check which ones already exist
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
    
    // Create category and subcategories
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
    
    // Handle database constraint violations
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
    
    return NextResponse.json(
      { message: 'Internal server error' },
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