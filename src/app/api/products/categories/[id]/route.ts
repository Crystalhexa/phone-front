// /app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, query, transaction } from '@/lib/database/connection'
import { z } from 'zod'

// Zod Schema for update request payload
const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  subcategories: z.array(z.string().min(1)).optional(),
});

type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

// Type definitions
interface CategoryApiResponse {
  success: boolean;
  data: {
    category_id: number;
    name: string;
    description: string | null;
    subcategories: string[];
  } | null;
  message: string;
  timestamp: string;
  errors?: any[];
}

// Helper function to get category by ID
async function getCategoryById(categoryId: string): Promise<any> {
  const query_text = `
    SELECT 
      c.category_id, 
      c.name, 
      c.description,
      COALESCE(
        array_agg(s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS subcategories
    FROM "Category" c
    LEFT JOIN "SubCategory" s ON s.category_id = c.category_id
    WHERE c.category_id = $1
    GROUP BY c.category_id, c.name, c.description
  `;

  const result = await query(query_text, [categoryId]);
  return result.rows[0] || null;
}

// Helper function to check if category exists (for update validation)
async function checkCategoryExistsById(categoryId: string): Promise<boolean> {
  const result = await query(
    `SELECT category_id FROM "Category" WHERE category_id = $1`,
    [categoryId]
  );
  return result.rows.length > 0;
}

// Helper function to check if category name exists (excluding current category)
async function checkCategoryNameExists(categoryName: string, excludeCategoryId: string): Promise<boolean> {
  const result = await query(
    `SELECT category_id FROM "Category" WHERE name = $1 AND category_id != $2`,
    [categoryName, excludeCategoryId]
  );
  return result.rows.length > 0;
}

// Helper function to check which subcategories already exist (excluding current category's subcategories)
async function checkSubcategoriesExistForUpdate(subcategoryNames: string[], categoryId: string): Promise<string[]> {
  if (!subcategoryNames.length) return [];
  
  // Create proper placeholders for the IN clause
  const placeholders = subcategoryNames.map((_, i) => `$${i + 2}`).join(',');
  const result = await query(
    `SELECT name FROM "SubCategory" WHERE name IN (${placeholders}) AND category_id != $1`,
    [categoryId, ...subcategoryNames]
  );
  
  return result.rows.map(row => row.name);
}

// Main function to update category
async function updateCategoryInDatabase(categoryId: string, payload: UpdateCategoryPayload) {
  return await transaction(async (client) => {
    // Update category
    await client.query(
      `UPDATE "Category" SET name = $1, description = $2 WHERE category_id = $3`,
      [payload.name, payload.description ?? null, categoryId]
    );
    
    // Delete existing subcategories for this category
    await client.query(
      `DELETE FROM "SubCategory" WHERE category_id = $1`,
      [categoryId]
    );
    
    // Create new subcategories if provided
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();

    const { id: categoryId } = await params;

    // Validate category ID
    if (!categoryId || isNaN(Number(categoryId))) {
      const errorResponse: CategoryApiResponse = {
        success: false,
        data: null,
        message: 'Invalid category ID provided',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Fetch category with subcategories
    const category = await getCategoryById(categoryId);

    if (!category) {
      const errorResponse: CategoryApiResponse = {
        success: false,
        data: null,
        message: `Category with ID ${categoryId} not found`,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const response: CategoryApiResponse = {
      success: true,
      data: {
        category_id: category.category_id,
        name: category.name,
        description: category.description,
        subcategories: category.subcategories || [],
      },
      message: 'Category retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching category by ID:', error);

    const errorResponse: CategoryApiResponse = {
      success: false,
      data: null,
      message: 'Internal server error',
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let payload: UpdateCategoryPayload | undefined;
  
  try {
    await initDatabase();

    const { id: categoryId } = await params;

    // Validate category ID
    if (!categoryId || isNaN(Number(categoryId))) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid category ID provided',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Check if category exists
    const categoryExists = await checkCategoryExistsById(categoryId);
    if (!categoryExists) {
      return NextResponse.json(
        { 
          success: false,
          message: `Category with ID ${categoryId} not found`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Validate request body
    try {
      const body = await request.json();
      const parsed = updateCategorySchema.safeParse(body);
      
      if (!parsed.success) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Invalid request data',
            errors: parsed.error.errors,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
      
      payload = parsed.data;
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid JSON format',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Check if category name already exists (excluding current category)
    const nameExists = await checkCategoryNameExists(payload.name, categoryId);
    if (nameExists) {
      return NextResponse.json(
        { 
          success: false,
          message: `Category name '${payload.name}' already exists`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // If subcategories provided, check which ones already exist in other categories
    if (payload.subcategories?.length) {
      const existingSubcategories = await checkSubcategoriesExistForUpdate(payload.subcategories, categoryId);
      
      if (existingSubcategories.length > 0) {
        return NextResponse.json(
          { 
            success: false,
            message: `These subcategories already exist in other categories: ${existingSubcategories.join(', ')}`,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
    }

    // Update category and subcategories
    await updateCategoryInDatabase(categoryId, payload);

    // Fetch updated category data to return
    const updatedCategory = await getCategoryById(categoryId);

    const response: CategoryApiResponse = {
      success: true,
      data: {
        category_id: updatedCategory.category_id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        subcategories: updatedCategory.subcategories || [],
      },
      message: 'Category updated successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error updating category:', error);

    // Handle database constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('category')) {
        return NextResponse.json(
          { 
            success: false,
            message: `Category name '${payload?.name}' already exists`,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { 
            success: false,
            message: 'Duplicate entry found',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error',
        errors: [error.message || error],
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}