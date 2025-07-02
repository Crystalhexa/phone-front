import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/type/variableProduct';
import { initDatabase, query } from '@/lib/database/connection';

interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: any[] | null;
  timestamp: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  if (!id) {
    return NextResponse.json<ApiResponse<Product>>({
      success: false,
      data: null,
      message: 'Product ID is required',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }

  try {
    await initDatabase();

    // Fetch product with all related data
    const productQuery = `
      SELECT 
        p.*,
        b.id as brand_id_ref, b.name as brand_name,
        s.id as subcategory_id_ref, s.name as subcategory_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      WHERE p.id = $1
    `;

    const productResult = await query(productQuery, [id]);

    if (productResult.rows.length === 0) {
      return NextResponse.json<ApiResponse<Product>>({
        success: false,
        data: null,
        message: 'Product not found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const productRow = productResult.rows[0];

    // Fetch product variations with barcodes and attributes
    const variationsQuery = `
      SELECT 
        pv.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', bc.id,
              'variation_id', bc.variation_id,
              'code', bc.code,
              'type', bc.type,
              'is_active', bc.is_active,
              'created_at', bc.created_at
            )
          ) FILTER (WHERE bc.id IS NOT NULL), 
          '[]'::json
        ) as barcodes,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', pva.id,
              'variation_id', pva.variation_id,
              'attribute_id', pva.attribute_id,
              'attribute_value_id', pva.attribute_value_id,
              'attribute', jsonb_build_object(
                'id', a.id,
                'name', a.name
              ),
              'attribute_value', jsonb_build_object(
                'id', av.id,
                'value', av.value
              )
            )
          ) FILTER (WHERE pva.id IS NOT NULL),
          '[]'::json
        ) as attributes
      FROM product_variations pv
      LEFT JOIN barcodes bc ON pv.id = bc.variation_id
      LEFT JOIN product_variation_attributes pva ON pv.id = pva.variation_id
      LEFT JOIN attributes a ON pva.attribute_id = a.id
      LEFT JOIN attribute_values av ON pva.attribute_value_id = av.id
      WHERE pv.product_id = $1
      GROUP BY pv.id
      ORDER BY pv.created_at
    `;

    const variationsResult = await query(variationsQuery, [id]);

    const product: Product = {
      id: productRow.id,
      name: productRow.name,
      description: productRow.description,
      subcategory_id: productRow.subcategory_id,
      brand_id: productRow.brand_id,
      created_at: productRow.created_at,
      updated_at: productRow.updated_at,
      brand: productRow.brand_name ? {
        id: productRow.brand_id_ref,
        name: productRow.brand_name
      } : undefined,
      subcategory: productRow.subcategory_name ? {
        id: productRow.subcategory_id_ref,
        name: productRow.subcategory_name
      } : undefined,
      variations: variationsResult.rows.map((row: { barcodes: any; attributes: any; }) => ({
        ...row,
        barcodes: Array.isArray(row.barcodes) ? row.barcodes : [],
        attributes: Array.isArray(row.attributes) ? row.attributes : []
      }))
    };

    return NextResponse.json<ApiResponse<Product>>({
      success: true,
      data: product,
      message: 'Product fetched successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json<ApiResponse<Product>>({
      success: false,
      data: null,
      message: 'Internal server error',
      errors: [error],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}