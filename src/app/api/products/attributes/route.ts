import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initDatabase, query, transaction } from '@/lib/database/connection'
import { ApiResponse } from '@/lib/database/connection'
import cuid from 'cuid'

// Zod schema for input validation
const attributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  description: z.string().optional(),
  values: z.array(z.string().min(1)).optional(),
})

type CreateAttributePayload = z.infer<typeof attributeSchema>

// Check if attribute already exists
async function checkAttributeExists(name: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM attributes WHERE name = $1',
    [name]
  )
  return result.rows.length > 0
}

// Check for duplicate values across the attribute_values table
async function checkAttributeValuesExist(valueNames: string[]): Promise<string[]> {
  if (!valueNames.length) return []

  const placeholders = valueNames.map((_, i) => `$${i + 1}`).join(',')
  const result = await query(
    `SELECT value FROM attribute_values WHERE value IN (${placeholders})`,
    valueNames
  )

  return result.rows.map(row => row.value)
}
async function createAttributeInDB(payload: CreateAttributePayload) {
  return await transaction(async (client) => {
    const attributeId = cuid() // Generate unique ID for the attribute

    // Insert attribute securely with parameterized query
    await client.query(
      'INSERT INTO attributes (id, name, description) VALUES ($1, $2, $3)',
      [attributeId, payload.name, payload.description ?? null]
    )

    // Insert values if present
    if (payload.values?.length) {
      for (const val of payload.values) {
        const valueId = cuid()
        await client.query(
          'INSERT INTO attribute_values (id, value, attribute_id) VALUES ($1, $2, $3)',
          [valueId, val, attributeId]
        )
      }
    }

    return { attributeId }
  })
}
// ✅ POST: Create Attribute
export async function POST(request: NextRequest) {
  let payload: CreateAttributePayload | undefined = undefined

  try {
    await initDatabase()

    const json = await request.json()
    const parsed = attributeSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 })
    }

    payload = parsed.data
    const exists = await checkAttributeExists(payload.name)
    if (exists) {
      return NextResponse.json({ message: `Attribute '${payload.name}' already exists` }, { status: 400 })
    }

    if (payload.values?.length) {
      const duplicates = await checkAttributeValuesExist(payload.values)
      if (duplicates.length) {
        return NextResponse.json(
          {
            message: `These values already exist: ${duplicates.join(', ')}. Please remove them.`,
          },
          { status: 400 }
        )
      }
    }

    const result = await createAttributeInDB(payload)

    return NextResponse.json(
      {
        message: 'Attribute created successfully',
        attribute_id: result.attributeId,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Attribute creation error:', error)

    if (error.code === '23505') {
      if (error.detail?.includes('(name)')) {
        return NextResponse.json(
          { message: `Duplicate attribute name: '${payload?.name ?? ''}'` },
          { status: 400 }
        )
      }
      if (error.detail?.includes('(value)')) {
        return NextResponse.json(
          { message: `Duplicate attribute value detected during insertion.` },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { message: `Unique constraint violation: ${error.detail}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// ✅ GET: List Attributes with Pagination, Search, and Sorting
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '10', 10)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const offset = (page - 1) * limit
  const search = searchParams.get('search') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'name'
  const sortOrder = searchParams.get('sortOrder') ?? 'asc'

  const validSortBy = ['name', 'id']
  const validSortOrder = ['asc', 'desc']
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name'
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc'

  try {
    await initDatabase()

    const queryText = `
      WITH filtered AS (
        SELECT 
          a.id,
          a.name,
          a.description,
          COUNT(*) OVER() AS total_count
        FROM attributes a
        WHERE a.name ILIKE $1
        ORDER BY a.${safeSortBy} ${safeSortOrder}
        LIMIT $2 OFFSET $3
      )
      SELECT 
        f.id,
        f.name,
        f.description,
        f.total_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', av.id,
              'value', av.value
            ) ORDER BY av.value
          ) FILTER (WHERE av.id IS NOT NULL),
          '[]'::json
        ) AS values
      FROM filtered f
      LEFT JOIN attribute_values av ON av.attribute_id = f.id
      GROUP BY f.id, f.name, f.description, f.total_count
      ORDER BY f.${safeSortBy} ${safeSortOrder}
    `

    const result = await query(queryText, [`%${search}%`, limit, offset])
    const rows = result.rows
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0
    const clean = rows.map(({ total_count, ...rest }) => rest)

    const response: ApiResponse = {
      success: true,
      data: {
        attributes: clean,
        total,
        limit,
        offset,
      },
      message: 'Attributes retrieved successfully',
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('GET attributes error:', error)
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Failed to retrieve attributes',
        errors: [error.message || 'Unknown error'],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
