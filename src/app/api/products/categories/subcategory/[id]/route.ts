import { NextRequest, NextResponse } from 'next/server'
import cuid from 'cuid'
import { initDatabase, query } from '@/lib/database/connection'
import { console } from 'inspector';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  await initDatabase()
  const { id: idParam } = await params;

  const categoryId = idParam;
  if (!categoryId) {
    return NextResponse.json({
      success: false,
      message: 'Invalid or missing category ID',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }

  const body = await request.json()
  const name = body?.name

  if (!name || typeof name !== 'string') {
    return NextResponse.json({
      success: false,
      message: 'Subcategory name is required',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }

  try {
    // Step 1: Check if category exists
    const categoryCheck = await query(`SELECT id FROM categories WHERE id = $1`, [categoryId])
    if (categoryCheck.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Category not found',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 404 })
    }

    // Step 2: Insert subcategory
    const id = cuid()
    const insertResult = await query(
      `INSERT INTO subcategories (id, name, category_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, category_id`,
      [id, name, categoryId]
    )

    return NextResponse.json({
      success: true,
      message: 'Subcategory created successfully',
      data: insertResult.rows[0],
      timestamp: new Date().toISOString(),
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating subcategory:', error)

    const isUniqueViolation = error.code === '23505' // Unique constraint
    return NextResponse.json({
      success: false,
      message: isUniqueViolation
        ? 'Subcategory with this name already exists'
        : 'Internal server error',
      data: null,
      errors: isUniqueViolation
        ? [{ field: 'name', message: 'Already exists' }]
        : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url)
  const { id: idParam } = await params;
  const categoryId = idParam;
  console.log(categoryId)
  
  if (!categoryId) {
    return NextResponse.json({
      success: false,
      message: 'Category ID is required',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }

  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 100)
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1)
  const offset = (page - 1) * limit
  const search = searchParams.get('search') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'name'
  const sortOrder = (searchParams.get('sortOrder') ?? 'asc').toLowerCase()

  const validSortBy = ['name', 'id']
  const validSortOrder = ['asc', 'desc']
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name'
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc'

  try {
    await initDatabase()
    
    // First, get the category information
    const categoryQuery = `
      SELECT id, name FROM categories WHERE id = $1
    `
    const categoryResult = await query(categoryQuery, [categoryId])
    
    if (categoryResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Category not found',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 404 })
    }
    
    const category = categoryResult.rows[0]
    
    // Then get the subcategories with filtering and pagination
    const subcategoryQuery = `
      SELECT id, name
      FROM subcategories
      WHERE category_id = $1 AND name ILIKE $2
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $3 OFFSET $4
    `
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM subcategories
      WHERE category_id = $1 AND name ILIKE $2
    `
    
    const [subcategoryResult, countResult] = await Promise.all([
      query(subcategoryQuery, [categoryId, `%${search}%`, limit, offset]),
      query(countQuery, [categoryId, `%${search}%`])
    ])
    
    const subcategories = subcategoryResult.rows
    const total = parseInt(countResult.rows[0].total, 10)
    
    // Clean data to match Subcategory interface (only id and name)
    const cleanData = subcategories.map(row => ({
      id: row.id,
      name: row.name
    }))

    return NextResponse.json({
      success: true,
      data: {
        categoryId: category.id,
        name: category.name, // Category name
        total,
        subcategories: cleanData,
      },
      message: 'Subcategories retrieved successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Subcategory fetch error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve subcategories',
      data: null,
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDatabase()
  
  const { id: subcategoryId } = await params;
  
  if (!subcategoryId) {
    return NextResponse.json({
      success: false,
      message: 'Invalid or missing subcategory ID',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }

  let body;
  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Invalid JSON in request body',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }

  const name = body?.name;
  console.log(name)

  if (!name || typeof name !== 'string') {
    return NextResponse.json({
      success: false,
      message: 'Subcategory name is required',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }

  try {
    // Step 1: Check if subcategory exists
    const subcategoryCheck = await query(
      `SELECT id, name, category_id FROM subcategories WHERE id = $1`, 
      [subcategoryId]
    )
    
    if (subcategoryCheck.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Subcategory not found',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 404 })
    }

    // Step 2: Execute update query
    const updateResult = await query(
      `UPDATE subcategories 
       SET name = $1, updated_at = $2
       WHERE id = $3
       RETURNING id, name, category_id, created_at, updated_at`,
      [name, new Date(), subcategoryId]
    )

    return NextResponse.json({
      success: true,
      message: 'Subcategory updated successfully',
      data: updateResult.rows[0],
      timestamp: new Date().toISOString(),
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error updating subcategory:', error)
    
    const isUniqueViolation = error.code === '23505' // Unique constraint
    
    return NextResponse.json({
      success: false,
      message: isUniqueViolation
        ? 'Subcategory with this name already exists'
        : 'Internal server error',
      data: null,
      errors: isUniqueViolation
        ? [{ field: 'name', message: 'Already exists' }]
        : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDatabase();

  const { id: subcategoryId } = await params;

  if (!subcategoryId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid or missing subcategory ID',
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  try {
    // Step 1: Check if subcategory exists
    const subcategoryCheck = await query(
      `SELECT id FROM subcategories WHERE id = $1`,
      [subcategoryId]
    );

    if (subcategoryCheck.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Subcategory not found',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Step 2: Delete the subcategory
    await query(
      `DELETE FROM subcategories WHERE id = $1`,
      [subcategoryId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Subcategory deleted successfully',
        data: { id: subcategoryId },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting subcategory:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
