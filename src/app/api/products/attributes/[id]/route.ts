import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, query, transaction } from '@/lib/database/connection'
import { z } from 'zod'

// Zod Schema for update request payload
const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  // Assuming subcategories are simple names for insertion/deletion
  subcategories: z.array(z.string().min(1)).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

interface CategoryApiResponse {
  success: boolean;
  data: {
    category_id: number;
    name: string;
    description: string | null;
    subcategories: string[];
    status: 'active' | 'inactive';
  } | null;
  message: string;
  timestamp: string;
  errors?: any[];
}

/**
 * Retrieves a category by its ID, including its associated subcategories and status.
 * @param categoryId The ID of the category to retrieve.
 * @returns A promise that resolves to the category object or null if not found.
 */
async function getCategoryById(categoryId: string): Promise<any> {
  const query_text = `
    SELECT
      c.category_id,
      c.name,
      c.description,
      c.status,
      COALESCE(
        array_agg(s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS subcategories
    FROM "Category" c
    LEFT JOIN "SubCategory" s ON s.category_id = c.category_id
    WHERE c.category_id = $1
    GROUP BY c.category_id, c.name, c.description, c.status
  `;

  const result = await query(query_text, [categoryId]);
  return result.rows[0] || null;
}

/**
 * Checks if a category with the given ID exists.
 * @param categoryId The ID of the category to check.
 * @returns A promise that resolves to true if the category exists, false otherwise.
 */
async function checkCategoryExistsById(categoryId: string): Promise<boolean> {
  const result = await query(
    `SELECT category_id FROM "Category" WHERE category_id = $1`,
    [categoryId]
  );
  return result.rows.length > 0;
}

/**
 * Checks if a category with the given name already exists, excluding a specific category ID.
 * This is used to prevent naming conflicts during updates.
 * @param categoryName The name of the category to check.
 * @param excludeCategoryId The ID of the category to exclude from the check.
 * @returns A promise that resolves to true if a duplicate name exists, false otherwise.
 */
async function checkCategoryNameExists(categoryName: string, excludeCategoryId: string): Promise<boolean> {
  const result = await query(
    `SELECT category_id FROM "Category" WHERE name = $1 AND category_id != $2`,
    [categoryName, excludeCategoryId]
  );
  return result.rows.length > 0;
}

/**
 * Checks which of the given subcategory names already exist under a *different* category.
 * This helps prevent accidental assignment of subcategory names that are unique
 * across categories (if that's the desired constraint).
 * @param subcategoryNames An array of subcategory names to check.
 * @param categoryId The ID of the current category being updated. Subcategories
 * already belonging to this category will not be flagged.
 * @returns A promise that resolves to an array of subcategory names that are duplicates
 * in other categories.
 */
async function checkSubcategoriesExistForUpdate(subcategoryNames: string[], categoryId: string): Promise<string[]> {
  if (!subcategoryNames.length) return [];

  // Construct placeholders for the IN clause ($2, $3, ...)
  const placeholders = subcategoryNames.map((_, i) => `$${i + 2}`).join(',');
  const result = await query(
    `SELECT name FROM "SubCategory" WHERE name IN (${placeholders}) AND category_id != $1`,
    [categoryId, ...subcategoryNames] // $1 maps to categoryId, subsequent map to subcategoryNames
  );

  return result.rows.map(row => row.name);
}

/**
 * Updates a category and its associated subcategories in a single transaction.
 * This function performs a "replace all" strategy for subcategories: it deletes
 * all existing subcategories for the given category and then inserts the new set.
 * @param categoryId The ID of the category to update.
 * @param payload The update data for the category and its subcategories.
 * @returns A promise that resolves to an object containing the updated category's ID.
 */
async function updateCategoryInDatabase(categoryId: string, payload: UpdateCategoryPayload) {
  return await transaction(async (client) => {
    // 1. Update the main category details
    await client.query(
      `UPDATE "Category" SET name = $1, description = $2, status = $3 WHERE category_id = $4`,
      [payload.name, payload.description ?? null, payload.status ?? 'active', categoryId]
    );

    // 2. Delete all existing subcategories for this category
    await client.query(
      `DELETE FROM "SubCategory" WHERE category_id = $1`,
      [categoryId]
    );

    // 3. Insert the new set of subcategories
    if (payload.subcategories?.length) {
      for (const subName of payload.subcategories) {
        // Corrected: Assuming "SubCategory" table only has 'name' and 'category_id'
        // based on the provided schema for "attribute_values" and the payload structure.
        // If "SubCategory" has a 'description' column and it should be managed,
        // the Zod schema and payload would need to be extended.
        await client.query(
          `INSERT INTO "SubCategory" (name, category_id) VALUES ($1, $2)`,
          [subName, categoryId]
        );
      }
    }

    return { categoryId };
  });
}

/**
 * Handles GET requests to retrieve a single category by ID.
 * @param request The NextRequest object.
 * @param params Object containing the category ID from the URL.
 * @returns A NextResponse with the category data or an error message.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // Corrected: params is an object, not a Promise
) {
  try {
    await initDatabase();
    const { id: categoryId } = params;

    // Validate if categoryId is provided and is a valid number
    if (!categoryId || isNaN(Number(categoryId))) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Invalid category ID provided',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const category = await getCategoryById(categoryId);

    if (!category) {
      return NextResponse.json({
        success: false,
        data: null,
        message: `Category with ID ${categoryId} not found`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        category_id: category.category_id,
        name: category.name,
        description: category.description,
        subcategories: category.subcategories || [], // Ensure subcategories is an array
        status: category.status,
      },
      message: 'Category retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error fetching category:', error);
    return NextResponse.json({
      success: false,
      data: null,
      message: 'Internal server error',
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Handles PUT requests to update an existing category.
 * @param request The NextRequest object.
 * @param params Object containing the category ID from the URL.
 * @returns A NextResponse indicating success or failure of the update.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } } // Corrected: params is an object, not a Promise
) {
  let payload: UpdateCategoryPayload | undefined;

  try {
    await initDatabase();
    const { id: categoryId } = params;

    // Validate if categoryId is provided and is a valid number
    if (!categoryId || isNaN(Number(categoryId))) {
      return NextResponse.json({
        success: false,
        message: 'Invalid category ID provided',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if the category to be updated actually exists
    const categoryExists = await checkCategoryExistsById(categoryId);
    if (!categoryExists) {
      return NextResponse.json({
        success: false,
        message: `Category with ID ${categoryId} not found`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Parse and validate the request body
    try {
      const body = await request.json();
      const parsed = updateCategorySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({
          success: false,
          message: 'Invalid request data',
          errors: parsed.error.errors,
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      payload = parsed.data;
    } catch {
      // Catch JSON parsing errors
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check for duplicate category name (excluding the current category being updated)
    const nameExists = await checkCategoryNameExists(payload.name, categoryId);
    if (nameExists) {
      return NextResponse.json({
        success: false,
        message: `Category name '${payload.name}' already exists`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check for subcategory name conflicts if subcategories are provided
    if (payload.subcategories?.length) {
      const existing = await checkSubcategoriesExistForUpdate(payload.subcategories, categoryId);
      if (existing.length > 0) {
        return NextResponse.json({
          success: false,
          message: `These subcategories already exist in other categories: ${existing.join(', ')}. Please choose unique names or associate them with this category.`,
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
    }

    // Perform the transactional update
    await updateCategoryInDatabase(categoryId, payload);
    // Fetch the updated category to return in the response
    const updatedCategory = await getCategoryById(categoryId);

    return NextResponse.json({
      success: true,
      data: {
        category_id: updatedCategory.category_id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        subcategories: updatedCategory.subcategories || [],
        status: updatedCategory.status,
      },
      message: 'Category updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Handles DELETE requests to remove an existing category.
 * @param request The NextRequest object.
 * @param params Object containing the category ID from the URL.
 * @returns A NextResponse indicating success or failure of the deletion.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } } // Corrected: params is an object, not a Promise
) {
  try {
    await initDatabase();
    const { id: categoryId } = params;

    // Validate if categoryId is provided and is a valid number
    if (!categoryId || isNaN(Number(categoryId))) {
      return NextResponse.json({
        success: false,
        message: "Invalid category ID provided",
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if the category to be deleted exists
    const categoryExists = await checkCategoryExistsById(categoryId);
    if (!categoryExists) {
      return NextResponse.json({
        success: false,
        message: `Category with ID ${categoryId} not found`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Perform the deletion in a transaction to ensure atomicity
    await transaction(async (client) => {
      // Delete associated subcategories first to satisfy foreign key constraints
      await client.query(`DELETE FROM "SubCategory" WHERE category_id = $1`, [categoryId]);
      // Then delete the main category
      await client.query(`DELETE FROM "Category" WHERE category_id = $1`, [categoryId]);
    });

    return NextResponse.json({
      success: true,
      data: null,
      message: `Category with ID ${categoryId} deleted successfully`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error",
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
