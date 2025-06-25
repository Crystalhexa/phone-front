// /app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  subcategories: z.array(z.string().min(1)).optional(),
});

type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

interface CategoryApiResponse {
  success: boolean;
  data: {
    category_id: string;
    name: string;
    description: string | null;
    subcategories: string[];
  } | null;
  message: string;
  timestamp: string;
  errors?: any[];
}

async function getCategoryById(categoryId: string): Promise<any> {
  const result = await query(
    `SELECT 
      c.id AS category_id,
      c.name,
      c.description,
      COALESCE(
        array_agg(s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS subcategories
    FROM categories c
    LEFT JOIN subcategories s ON s.category_id = c.id
    WHERE c.id = $1
    GROUP BY c.id`,
    [categoryId]
  );
  return result.rows[0] || null;
}

async function updateCategoryInDatabase(categoryId: string, payload: UpdateCategoryPayload) {
  return await transaction(async (client) => {
    await client.query(
      `UPDATE categories SET name = $1, description = $2, updated_at = NOW() WHERE id = $3`,
      [payload.name, payload.description ?? null, categoryId]
    );

    await client.query(`DELETE FROM subcategories WHERE category_id = $1`, [categoryId]);

    if (payload.subcategories?.length) {
      for (const subName of payload.subcategories) {
        await client.query(
          `INSERT INTO subcategories (id, name, category_id) VALUES (gen_random_uuid(), $1, $2)`,
          [subName, categoryId]
        );
      }
    }

    return { categoryId };
  });
}

export async function GET(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    const category = await getCategoryById((await params).id);

    if (!category) {
      return NextResponse.json({ success: false, data: null, message: 'Category not found', timestamp: new Date().toISOString() }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        category_id: category.category_id,
        name: category.name,
        description: category.description,
        subcategories: category.subcategories,
      },
      message: 'Category retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', errors: [error.message], timestamp: new Date().toISOString() }, { status: 500 });
  }
}

export async function PUT(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  let payload: UpdateCategoryPayload | undefined;
  try {
    await initDatabase();
    const categoryId = (await params).id;

    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid data', errors: parsed.error.errors, timestamp: new Date().toISOString() }, { status: 400 });
    }

    payload = parsed.data;
    await updateCategoryInDatabase(categoryId, payload);
    const updatedCategory = await getCategoryById(categoryId);

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.code === '23505') {
      const constraint = error.constraint || '';
      if (constraint.includes('categories_name')) {
        return NextResponse.json({ success: false, message: `Category name '${payload?.name}' already exists`, timestamp: new Date().toISOString() }, { status: 400 });
      }
      if (constraint.includes('subcategories_name')) {
        return NextResponse.json({ success: false, message: `One or more subcategories already exist`, timestamp: new Date().toISOString() }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, message: 'Internal server error', errors: [error.message], timestamp: new Date().toISOString() }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDatabase();
    const categoryId = (await params).id;

    await transaction(async (client) => {
      await client.query(`DELETE FROM subcategories WHERE category_id = $1`, [categoryId]);
      await client.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
    });

    return NextResponse.json({ success: true, data: null, message: 'Category deleted successfully', timestamp: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Internal server error', errors: [error.message], timestamp: new Date().toISOString() }, { status: 500 });
  }
}
