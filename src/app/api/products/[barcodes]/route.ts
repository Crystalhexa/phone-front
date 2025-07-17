// pages/api/products/[barcode].ts
import {  initDatabase, query } from '@/lib/database/connection'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { barcodes: string } }
) {
  await initDatabase()

  const barcodes = params.barcodes;
  console.log(barcodes)

  if (!barcodes) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Barcode is required',
        errors: null,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  try {
    const result = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.model,
        p.description,
        p.sku,
        p.warranty_period,
        p.is_active,
        p.brand_id,
        p.subcategory_id,
        p.created_at,
        p.updated_at
      FROM barcodes b
      JOIN products p ON p.id = b.product_id
      WHERE b.code = $1
        AND b.is_active = true
        AND p.is_active = true
      LIMIT 1
      `,
      [barcodes]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Product not found',
          errors: null,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    const product = result.rows[0]

    return NextResponse.json(
      {
        success: true,
        data: product,
        message: 'Product found',
        errors: null,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching product by barcode:', error)
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Internal Server Error',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

