// /app/api/products/by-barcode/route.ts
import { initDatabase, query } from '@/lib/database/connection'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json({
      success: false,
      message: 'Barcode is required',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }

  await initDatabase()

  try {
    const sql = `
      SELECT 
        pv.id AS variation_id,
        pv.sku,
        pv.name AS variation_name,
        pv.retail_price,
        p.name AS product_name,
        img.image_url,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'name', a.name,
              'value', av.value
            )
          ) FILTER (WHERE a.id IS NOT NULL), 
          '[]'
        ) AS attributes
      FROM barcodes b
      JOIN product_variations pv ON b.variation_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN product_images img ON img.variation_id = pv.id AND img.is_primary = TRUE
      LEFT JOIN product_variation_attributes pva ON pva.variation_id = pv.id
      LEFT JOIN attributes a ON a.id = pva.attribute_id
      LEFT JOIN attribute_values av ON av.id = pva.attribute_value_id
      WHERE b.code = $1
      GROUP BY pv.id, p.name, img.image_url, b.is_active
      LIMIT 1
    `

    const result = await query(sql, [code])

    const row = result.rows[0]

    if (!row || row.is_active === false) {
      return NextResponse.json({
        success: false,
        message: 'Product not found',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Product retrieved successfully',
      timestamp: new Date().toISOString(),
      data: {
        id: row.variation_id,
        sku: row.sku,
        name: row.variation_name,
        retail_price: row.retail_price,
        product_name: row.product_name,
        image: row.image_url || null,
        attributes: row.attributes,
      },
    })
  } catch (err) {
    console.error('Barcode fetch error:', err)
    return NextResponse.json({
      success: false,
      message: 'Server error',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
