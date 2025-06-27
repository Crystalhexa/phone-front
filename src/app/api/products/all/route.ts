import { initDatabase, query, transaction } from '@/lib/database/connection';
import { NextRequest, NextResponse } from 'next/server';
import cuid from 'cuid'; // ✅ Import cuid

interface ProductRequest {
  name: string;
  description?: string;
  subcategory_id?: string;
  brand_id?: string;
  is_variable: boolean;
  attributes: Array<{ attribute_id: string }>;
  variations: Array<{
    sku: string;
    name: string;
    cost_price: number;
    wholesale_price?: number;
    retail_price: number;
    stock_quantity: number;
    low_stock_threshold: number;
    warranty_period?: number;
    barcode?: string;
    attributes: Array<{
      attribute_id: string;
      attribute_value_id: string;
    }>;
  }>;
  default_variation: {
    sku: string;
    cost_price?: number;
    wholesale_price?: number;
    retail_price?: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
    warranty_period?: number;
    barcode?: string;
  };
}

export async function POST(request: NextRequest) {
  await initDatabase();

  try {
    const body: ProductRequest = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const productId = cuid(); // ✅ Generate ID manually

    await transaction(async (client) => {
      // 1. Insert into products
      await client.query(
        `INSERT INTO products (id, name, description, subcategory_id, brand_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          productId,
          body.name,
          body.description || null,
          body.subcategory_id || null,
          body.brand_id || null,
        ]
      );

      // 2. Insert product-level attributes
      for (const attr of body.attributes || []) {
        await client.query(
          `INSERT INTO product_attributes (id, product_id, attribute_id, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [cuid(), productId, attr.attribute_id]
        );
      }

      // 3. Insert variations
      if (body.is_variable) {
        for (const variation of body.variations) {
          const variationId = cuid(); // ✅

          await client.query(
            `INSERT INTO product_variations (
              id, product_id, sku, name, cost_price, wholesale_price, retail_price,
              stock_quantity, low_stock_threshold, warranty_period, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [
              variationId,
              productId,
              variation.sku,
              variation.name || null,
              variation.cost_price,
              variation.wholesale_price || null,
              variation.retail_price,
              variation.stock_quantity,
              variation.low_stock_threshold,
              variation.warranty_period || null,
            ]
          );

          // 4. Insert variation attributes
          for (const attr of variation.attributes || []) {
            await client.query(
              `INSERT INTO product_variation_attributes 
                (id, variation_id, attribute_id, attribute_value_id, created_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [cuid(), variationId, attr.attribute_id, attr.attribute_value_id]
            );
          }

          // 5. Insert barcode if provided
          if (variation.barcode) {
            await client.query(
              `INSERT INTO barcodes (id, variation_id, code, type, is_active, created_at)
               VALUES ($1, $2, $3, 'INTERNAL', true, NOW())`,
              [cuid(), variationId, variation.barcode]
            );
          }
        }
      } else {
        // 6. Default variation for non-variable product
        const def = body.default_variation;
        const defVariationId = cuid();

        await client.query(
          `INSERT INTO product_variations (
            id, product_id, sku, name, cost_price, wholesale_price, retail_price,
            stock_quantity, low_stock_threshold, warranty_period, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            defVariationId,
            productId,
            def.sku,
            body.name,
            def.cost_price || 0,
            def.wholesale_price || null,
            def.retail_price || 0,
            def.stock_quantity || 0,
            def.low_stock_threshold || 5,
            def.warranty_period || null,
          ]
        );

        if (def.barcode) {
          await client.query(
            `INSERT INTO barcodes (id, variation_id, code, type, is_active, created_at)
             VALUES ($1, $2, $3, 'INTERNAL', true, NOW())`,
            [cuid(), defVariationId, def.barcode]
          );
        }
      }
    });

    return NextResponse.json(
      { success: true, message: 'Product created successfully', productId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('❌ Product creation failed:', err);
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}




export async function GET(request: NextRequest) {
  await initDatabase();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const args: any[] = [limit, offset];
    let whereClause = '';
    if (search) {
      args.push(`%${search}%`);
      whereClause = `WHERE p.name ILIKE $3 OR p.description ILIKE $3`;
    }

    const dataQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.is_variable,
        p.created_at,
        s.name AS subcategory_name,
        b.name AS brand_name,
        COUNT(DISTINCT v.id) AS variation_count
      FROM products p
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variations v ON p.id = v.product_id
      ${whereClause}
      GROUP BY p.id, s.name, b.name
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const productsRes = await query(dataQuery, args);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products p
      ${whereClause}
    `;
    const countArgs = search ? [`%${search}%`] : [];
    const countRes = await query(countQuery, countArgs);
    const total = parseInt(countRes.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: {
        products: productsRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Fetched products successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error fetching products:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch products', error: error.message }, { status: 500 });
  }
}
