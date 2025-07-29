// app/api/purchase-orders/[id]/route.ts
import { ApiResponse, query } from '@/lib/database/connection';
import { NextRequest, NextResponse } from 'next/server';


interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity_ordered: number;
  quantity_received: number;
  cost_price: number;
  wholesale_price: number | null;
  retail_price: number;
  line_total: number;
  batch_number: string | null;
  expiry_date: string | null;
  barcodes: Barcode[];
}

interface Barcode {
  id: string;
  code: string;
  type: string;
  status: string;
  purchased_at: string;
  purchase_cost: number;
  condition: string;
  warranty_expiry: string | null;
  location_branch: string | null;
  notes: string | null;
}

interface PurchaseOrderDetails {
  id: string;
  order_number: string;
  invoice_number: string | null;
  supplier_name: string;
  supplier_code: string;
  supplier_contact: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;
  purchased_by_name: string | null;
  branch_name: string | null;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  items: PurchaseOrderItem[];
}

export async function GET(
 request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PurchaseOrderDetails>>> {
  try {
         const { id: idParam } = await params;
  const id = idParam;

    if (!id) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Purchase order ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Fetch purchase order details with supplier and user info
    const orderQuery = `
      SELECT 
        po.id,
        po.order_number,
        po.invoice_number,
        po.order_date,
        po.expected_date,
        po.received_date,
        po.status,
        po.subtotal,
        po.tax_amount,
        po.total_amount,
        po.notes,
        s.name as supplier_name,
        s.code as supplier_code,
        s.contact_name as supplier_contact,
        s.phone as supplier_phone,
        s.email as supplier_email,
        b.name as branch_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.purchased_by = u.id
      LEFT JOIN branches b ON po.branch_id = b.id
      WHERE po.id = $1
    `;

    const orderResult = await query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Purchase order not found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const orderData = orderResult.rows[0];

    // Fetch purchase order items with product details and barcodes
    const itemsQuery = `
      SELECT 
        poi.id,
        poi.product_id,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.cost_price,
        poi.wholesale_price,
        poi.retail_price,
        poi.line_total,
        poi.batch_number,
        poi.expiry_date,
        p.name as product_name,
        pb.id as batch_id
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      LEFT JOIN purchase_batches pb ON pb.purchase_order_item_id = poi.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.created_at
    `;

    const itemsResult = await query(itemsQuery, [id]);

    // Fetch barcodes for each batch
    const batchIds = itemsResult.rows.map(row => row.batch_id).filter(Boolean);
    
    let barcodesData: any[] = [];
    if (batchIds.length > 0) {
      const barcodesQuery = `
        SELECT 
          ib.id,
          ib.purchase_batch_id,
          ib.code,
          ib.type,
          ib.status,
          ib.purchased_at,
          ib.purchase_cost,
          ib.condition,
          ib.warranty_expiry,
          ib.location_branch,
          ib.notes,
          br.name as branch_name
        FROM item_barcodes ib
        LEFT JOIN branches br ON ib.location_branch = br.id
        WHERE ib.purchase_batch_id = ANY($1)
        ORDER BY ib.created_at
      `;

      const barcodesResult = await query(barcodesQuery, [batchIds]);
      barcodesData = barcodesResult.rows;
    }

    // Group barcodes by batch_id
    const barcodesByBatch = barcodesData.reduce((acc, barcode) => {
      const batchId = barcode.purchase_batch_id;
      if (!acc[batchId]) {
        acc[batchId] = [];
      }
      acc[batchId].push({
        id: barcode.id,
        code: barcode.code,
        type: barcode.type,
        status: barcode.status,
        purchased_at: barcode.purchased_at,
        purchase_cost: parseFloat(barcode.purchase_cost),
        condition: barcode.condition,
        warranty_expiry: barcode.warranty_expiry,
        location_branch: barcode.branch_name,
        notes: barcode.notes
      });
      return acc;
    }, {} as Record<string, Barcode[]>);

    // Structure the response data
    const items: PurchaseOrderItem[] = itemsResult.rows.map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name || 'Unknown Product',
      product_code: item.product_code || '',
      quantity_ordered: item.quantity_ordered,
      quantity_received: item.quantity_received,
      cost_price: parseFloat(item.cost_price),
      wholesale_price: item.wholesale_price ? parseFloat(item.wholesale_price) : null,
      retail_price: parseFloat(item.retail_price),
      line_total: parseFloat(item.line_total),
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      barcodes: barcodesByBatch[item.batch_id] || []
    }));

    const purchaseOrder: PurchaseOrderDetails = {
      id: orderData.id,
      order_number: orderData.order_number,
      invoice_number: orderData.invoice_number,
      supplier_name: orderData.supplier_name || 'Unknown Supplier',
      supplier_code: orderData.supplier_code || '',
      supplier_contact: orderData.supplier_contact,
      supplier_phone: orderData.supplier_phone,
      supplier_email: orderData.supplier_email,
      purchased_by_name: orderData.purchased_by_name,
      branch_name: orderData.branch_name,
      order_date: orderData.order_date,
      expected_date: orderData.expected_date,
      received_date: orderData.received_date,
      status: orderData.status,
      subtotal: parseFloat(orderData.subtotal || '0'),
      tax_amount: parseFloat(orderData.tax_amount || '0'),
      total_amount: parseFloat(orderData.total_amount || '0'),
      notes: orderData.notes,
      items
    };

    return NextResponse.json({
      success: true,
      data: purchaseOrder,
      message: 'Purchase order details retrieved successfully',
      timestamp: new Date().toISOString(),
      metadata: {
        totalItems: items.length,
        totalBarcodes: barcodesData.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching purchase order details:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      message: 'Failed to retrieve purchase order details',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}