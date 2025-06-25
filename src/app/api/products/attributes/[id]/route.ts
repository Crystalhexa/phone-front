import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';
import cuid from 'cuid';

// Zod schema for request validation
const attributeUpdateSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  description: z.string().optional(),
  values: z.array(z.string().min(1)).optional(),
});

type UpdateAttributePayload = z.infer<typeof attributeUpdateSchema>;

// Fetch attribute and its values by ID
async function getAttributeById(attributeId: string) {
  const result = await query(
    `SELECT
      a.id,
      a.name,
      a.description,
      a.created_at,
      a.updated_at,
      COALESCE(array_agg(av.value ORDER BY av.value) FILTER (WHERE av.value IS NOT NULL), ARRAY[]::text[]) AS values
    FROM attributes a
    LEFT JOIN attribute_values av ON av.attribute_id = a.id
    WHERE a.id = $1
    GROUP BY a.id`,
    [attributeId]
  );
  return result.rows[0] || null;
}

// Check if attribute with same name (excluding current) exists
async function attributeNameExists(name: string, excludeId: string) {
  const result = await query(
    `SELECT id FROM attributes WHERE name = $1 AND id != $2`,
    [name, excludeId]
  );
  return result.rows.length > 0;
}

// Check for duplicate attribute values across different attributes
async function conflictingAttributeValues(values: string[], attributeId: string): Promise<string[]> {
  if (!values.length) return [];
  const placeholders = values.map((_, i) => `$${i + 2}`).join(',');
  const result = await query(
    `SELECT value FROM attribute_values WHERE value IN (${placeholders}) AND attribute_id != $1`,
    [attributeId, ...values]
  );
  return result.rows.map(r => r.value);
}

// Transactional update of attribute and values
async function updateAttributeInDB(attributeId: string, payload: UpdateAttributePayload) {
  return await transaction(async (client) => {
    await client.query(
      `UPDATE attributes SET name = $1, description = $2, updated_at = now() WHERE id = $3`,
      [payload.name, payload.description ?? null, attributeId]
    );

    await client.query(`DELETE FROM attribute_values WHERE attribute_id = $1`, [attributeId]);

    if (payload.values?.length) {
      for (const value of payload.values) {
        const valueId = cuid();
        await client.query(
          `INSERT INTO attribute_values (id, attribute_id, value) VALUES ($1, $2, $3)`,
          [valueId, attributeId, value]
        );
      }
    }

    return { attributeId };
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const { id: attributeId } = params;

    const attribute = await getAttributeById(attributeId);
    if (!attribute) {
      return NextResponse.json({
        success: false,
        message: `Attribute with ID ${attributeId} not found`,
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Attribute retrieved successfully',
      data: attribute,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let payload: UpdateAttributePayload | undefined;

  try {
    await initDatabase();
    const { id: attributeId } = params;

    const body = await request.json();
    const parsed = attributeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    payload = parsed.data;

    const nameExists = await attributeNameExists(payload.name, attributeId);
    if (nameExists) {
      return NextResponse.json({
        success: false,
        message: `Attribute name '${payload.name}' already exists`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    if (payload.values?.length) {
      const conflicts = await conflictingAttributeValues(payload.values, attributeId);
      if (conflicts.length) {
        return NextResponse.json({
          success: false,
          message: `The following values already exist under other attributes: ${conflicts.join(', ')}`,
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
    }

    await updateAttributeInDB(attributeId, payload);
    const updated = await getAttributeById(attributeId);

    return NextResponse.json({
      success: true,
      message: 'Attribute updated successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const { id: attributeId } = params;

    await transaction(async (client) => {
      await client.query(`DELETE FROM attribute_values WHERE attribute_id = $1`, [attributeId]);
      await client.query(`DELETE FROM attributes WHERE id = $1`, [attributeId]);
    });

    return NextResponse.json({
      success: true,
      message: `Attribute with ID ${attributeId} deleted successfully`,
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      errors: [error.message || error],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}