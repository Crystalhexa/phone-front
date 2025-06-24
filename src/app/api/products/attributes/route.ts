// /app/api/attributes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initDatabase, query, transaction } from '@/lib/database/connection'
import { ApiResponse } from '@/lib/database/connection'

// Zod schema for input validation
const attributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  description: z.string().optional(),
  values: z.array(z.string().min(1)).optional(),
})

type CreateAttributePayload = z.infer<typeof attributeSchema>

/**
 * Checks if an attribute with the given name already exists in the database.
 * @param name The name of the attribute to check.
 * @returns A promise that resolves to true if the attribute exists, false otherwise.
 */
async function checkAttributeExists(name: string): Promise<boolean> {
  const result = await query(
    `SELECT attribute_id FROM attributes WHERE name = $1`,
    [name]
  )
  return result.rows.length > 0
}

/**
 * Checks which of the given attribute values already exist in the database.
 * This leverages the UNIQUE constraint on the 'value' column in 'attribute_values'.
 * @param valueNames An array of value strings to check.
 * @returns A promise that resolves to an array of value strings that already exist.
 */
async function checkAttributeValuesExist(valueNames: string[]): Promise<string[]> {
  if (!valueNames.length) return []

  // Create placeholders for the IN clause ($1, $2, ...)
  const placeholders = valueNames.map((_, i) => `$${i + 1}`).join(',')
  const result = await query(
    `SELECT value FROM attribute_values WHERE value IN (${placeholders})`,
    valueNames
  )

  return result.rows.map((row) => row.value)
}

/**
 * Inserts a new attribute and its associated values into the database within a transaction.
 * Ensures atomicity: either both attribute and all values are inserted, or none are.
 * @param payload The attribute data to create, including its name, description, and optional values.
 * @returns A promise that resolves to an object containing the new attribute's ID.
 */
async function createAttributeInDB(payload: CreateAttributePayload) {
  return await transaction(async (client) => {
    // Insert the new attribute into the 'attributes' table
    const attributeRes = await client.query(
      `INSERT INTO attributes (name, description) VALUES ($1, $2) RETURNING attribute_id`,
      [payload.name, payload.description ?? null] // Use null if description is undefined
    )
    const attributeId = attributeRes.rows[0].attribute_id

    // If values are provided, insert them into the 'attribute_values' table
    if (payload.values?.length) {
      for (const val of payload.values) {
        await client.query(
          `INSERT INTO attribute_values (value, "attributeId") VALUES ($1, $2)`, // Corrected: "attributeId" is now quoted
          [val, attributeId]
        )
      }
    }

    return { attributeId }
  })
}

/**
 * Handles POST requests to create a new attribute.
 * Validates input, checks for existing attributes/values, and performs a transactional insert.
 * @param request The NextRequest object.
 * @returns A NextResponse indicating success or failure.
 */
export async function POST(request: NextRequest) {
  let payload: CreateAttributePayload | undefined = undefined // Declare payload outside try for error logging

  try {
    await initDatabase() // Initialize database connection

    const json = await request.json()
    const parsed = attributeSchema.safeParse(json)

    // Validate request body against Zod schema
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 })
    }

    payload = parsed.data

    // Check if attribute with the same name already exists
    const exists = await checkAttributeExists(payload.name)
    if (exists) {
      return NextResponse.json({ message: `Attribute '${payload.name}' already exists` }, { status: 400 })
    }

    // Check for duplicate attribute values before insertion
    if (payload.values?.length) {
      const duplicates = await checkAttributeValuesExist(payload.values)
      if (duplicates.length) {
        // Return a specific message if some values already exist
        return NextResponse.json(
          {
            message: `Attribute creation is prevented because these values already exist: ${duplicates.join(', ')}. Please remove existing values from the request.`,
          },
          { status: 400 }
        )
      }
    }

    // Create the attribute and its values in a transaction
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

    // Handle PostgreSQL unique constraint violation (error code '23505')
    if (error.code === '23505') {
      // This specifically catches cases where an attribute name or value (if not caught by pre-checks)
      // violates a unique constraint during the actual insert.
      // The `detail` property often contains more specific information about the violated constraint.
      if (error.detail?.includes('Key (name)')) {
        return NextResponse.json(
          { message: `Duplicate attribute name: '${payload?.name ?? ''}'` },
          { status: 400 }
        )
      } else if (error.detail?.includes('Key (value)')) {
        // This case should ideally be caught by checkAttributeValuesExist, but as a fallback:
        return NextResponse.json(
          { message: `Duplicate attribute value detected during insertion.` },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { message: `Duplicate entry violation: ${error.detail || error.message}` },
        { status: 400 }
      )
    }

    // Catch all other internal server errors
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handles GET requests to retrieve attributes with pagination, searching, and sorting.
 * @param request The NextRequest object containing URL search parameters.
 * @returns A NextResponse with the list of attributes and pagination metadata.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Parse pagination parameters with default values
  const limit = parseInt(searchParams.get('limit') ?? '10', 10)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const offset = (page - 1) * limit
  const search = searchParams.get('search') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'name'
  const sortOrder = searchParams.get('sortOrder') ?? 'asc'

  // Define valid sorting columns and orders to prevent SQL injection
  const validSortBy = ['name', 'attribute_id']
  const validSortOrder = ['asc', 'desc']
  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'name'
  const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc'

  try {
    await initDatabase() // Initialize database connection

    let queryText: string
    // Construct the SQL query based on the sortBy parameter
    if (safeSortBy === 'name') {
      queryText = `
        WITH filtered_attributes AS (
          SELECT 
            a.attribute_id,
            a.name,
            a.description,
            -- Calculate total count before applying limit/offset for pagination metadata
            COUNT(*) OVER() as total_count
          FROM attributes a
          WHERE a.name ILIKE $1 -- Case-insensitive search
          ORDER BY a.name ${safeSortOrder} -- Apply sorting
          LIMIT $2 OFFSET $3 -- Apply pagination
        )
        SELECT 
          fa.attribute_id,
          fa.name,
          fa.description,
          fa.total_count,
          -- Aggregate attribute values into a JSON array
          COALESCE(
            json_agg(
              json_build_object(
                'attribute_values_id', av.attribute_values_id,
                'value', av.value
              ) ORDER BY av.value -- Order values within the array
            ) FILTER (WHERE av.attribute_values_id IS NOT NULL), -- Only include if values exist
            '[]'::json -- Default to empty JSON array if no values
          ) AS values
        FROM filtered_attributes fa
        LEFT JOIN attribute_values av ON av."attributeId" = fa.attribute_id -- Join to get associated values
        GROUP BY fa.attribute_id, fa.name, fa.description, fa.total_count -- Group by attribute details for json_agg
        ORDER BY fa.name ${safeSortOrder} -- Final ordering for the main result set
      `
    } else { // sortBy === 'attribute_id'
      queryText = `
        WITH filtered_attributes AS (
          SELECT 
            a.attribute_id,
            a.name,
            a.description,
            COUNT(*) OVER() as total_count
          FROM attributes a
          WHERE a.name ILIKE $1
          ORDER BY a.attribute_id ${safeSortOrder}
          LIMIT $2 OFFSET $3
        )
        SELECT 
          fa.attribute_id,
          fa.name,
          fa.description,
          fa.total_count,
          COALESCE(
            json_agg(
              json_build_object(
                'attribute_values_id', av.attribute_values_id,
                'value', av.value
              ) ORDER BY av.value
            ) FILTER (WHERE av.attribute_values_id IS NOT NULL),
            '[]'::json
          ) AS values
        FROM filtered_attributes fa
        LEFT JOIN attribute_values av ON av."attributeId" = fa.attribute_id
        GROUP BY fa.attribute_id, fa.name, fa.description, fa.total_count
        ORDER BY fa.attribute_id ${safeSortOrder}
      `
    }

    // Execute the query with search term, limit, and offset
    const result = await query(queryText, [`%${search}%`, limit, offset])
    const rows = result.rows
    // Extract total count from the first row (if available) for pagination metadata
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0
    // Remove the temporary total_count column from the final attribute objects
    const clean = rows.map(({ total_count, ...rest }) => rest)

    // Construct the successful API response
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
    console.error('Attribute fetch error:', error)
    // Construct the error API response
    const errorResponse: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to retrieve attributes',
      errors: [error.message || 'Unknown error'], // Include error message for debugging
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
