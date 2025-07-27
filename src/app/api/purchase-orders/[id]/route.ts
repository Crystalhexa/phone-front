import { ApiResponse, query } from '@/lib/database/connection';
import { NextRequest, NextResponse } from 'next/server';

// Types based on your schema
interface PurchaseOrderDetails {
  id: string;
  order_number: string;
  invoice_number?: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  supplier_contact_name?: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_address?: string;
  supplier_sales_rep_name: string;
  supplier_sales_rep_phone?: string;
  purchased_by?: string;
  purchaser_name?: string;
  purchaser_email?: string;
  branch_id?: string;
  branch_name?: string;
  branch_code?: string;
  branch_location?: string;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED';
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

interface ItemBarcode {
  id: string;
  code: string;
  type: 'EXTERNAL' | 'INTERNAL' | 'SUPPLIER' | 'MANUFACTURER';
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RETURNED' | 'DAMAGED';
  purchased_at: string;
  purchase_cost: string;
  warranty_expiry?: string;
  condition: 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'DEFECTIVE' | 'RETURNED' | 'REPAIRED' | 'REFURBISHED';
  location_branch?: string;
  sold_at?: string;
  sold_price?: string;
  sold_to_customer?: string;
  notes?: string;
}

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_model: string;
  product_sku: string;
  brand_name?: string;
  category_name?: string;
  subcategory_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  cost_price: string;
  wholesale_price?: string;
  retail_price: string;
  line_total: string;
  batch_number?: string;
  expiry_date?: string;
  item_barcodes: ItemBarcode[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Purchase order ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Fetch purchase order with all related information
    const purchaseOrderQuery = `
      SELECT 
        po.id,
        po.order_number,
        po.invoice_number,
        po.supplier_id,
        s.name as supplier_name,
        s.code as supplier_code,
        s.contact_name as supplier_contact_name,
        s.phone as supplier_phone,
        s.email as supplier_email,
        s.address as supplier_address,
        s.sales_rep_name as supplier_sales_rep_name,
        s.sales_rep_phone as supplier_sales_rep_phone,
        po.purchased_by,
        u.username as purchaser_name,
        u.email as purchaser_email,
        po.branch_id,
        b.name as branch_name,
        b.code as branch_code,
        b.location as branch_location,
        po.order_date,
        po.expected_date,
        po.received_date,
        po.status,
        po.subtotal,
        po.tax_amount,
        po.total_amount,
        po.notes,
        po.created_at,
        po.updated_at
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.purchased_by = u.id
      LEFT JOIN branches b ON po.branch_id = b.id
      WHERE po.id = $1
    `;

    const orderResult = await query(purchaseOrderQuery, [id]);

    if (orderResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: 'Purchase order not found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const orderData = orderResult.rows[0];

    // Fetch purchase order items with product details and item barcodes
    const itemsQuery = `
      SELECT 
        poi.id,
        poi.product_id,
        p.name as product_name,
        p.model as product_model,
        p.sku as product_sku,
        br.name as brand_name,
        c.name as category_name,
        sc.name as subcategory_name,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.cost_price,
        poi.wholesale_price,
        poi.retail_price,
        poi.line_total,
        poi.batch_number,
        poi.expiry_date,
        -- Item barcodes information
        ib.id as barcode_id,
        ib.code as barcode_code,
        ib.type as barcode_type,
        ib.status as barcode_status,
        ib.purchased_at,
        ib.purchase_cost,
        ib.warranty_expiry,
        ib.condition as barcode_condition,
        ib.location_branch,
        ib.sold_at,
        ib.sold_price,
        ib.sold_to_customer,
        ib.notes as barcode_notes,
        -- Customer info for sold items
        c_sold.name as customer_name,
        -- Branch info for location
        b_location.name as location_branch_name
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      LEFT JOIN brands br ON p.brand_id = br.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN categories c ON sc.category_id = c.id
      LEFT JOIN purchase_batches pb ON poi.id = pb.purchase_order_item_id
      LEFT JOIN item_barcodes ib ON pb.id = ib.purchase_batch_id
      LEFT JOIN customers c_sold ON ib.sold_to_customer = c_sold.id
      LEFT JOIN branches b_location ON ib.location_branch = b_location.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.created_at ASC, ib.code ASC
    `;

    const itemsResult = await query(itemsQuery, [id]);

    // Group items by purchase order item ID and collect barcodes
    const itemsMap = new Map<string, any>();
    
    itemsResult.rows.forEach(row => {
      if (!itemsMap.has(row.id)) {
        itemsMap.set(row.id, {
          id: row.id,
          product_id: row.product_id,
          product_name: row.product_name,
          product_model: row.product_model,
          product_sku: row.product_sku,
          brand_name: row.brand_name,
          category_name: row.category_name,
          subcategory_name: row.subcategory_name,
          quantity_ordered: row.quantity_ordered,
          quantity_received: row.quantity_received,
          cost_price: row.cost_price,
          wholesale_price: row.wholesale_price,
          retail_price: row.retail_price,
          line_total: row.line_total,
          batch_number: row.batch_number,
          expiry_date: row.expiry_date,
          item_barcodes: []
        });
      }

      // Add barcode if it exists
      if (row.barcode_id) {
        itemsMap.get(row.id).item_barcodes.push({
          id: row.barcode_id,
          code: row.barcode_code,
          type: row.barcode_type,
          status: row.barcode_status,
          purchased_at: row.purchased_at,
          purchase_cost: row.purchase_cost,
          warranty_expiry: row.warranty_expiry,
          condition: row.barcode_condition,
          location_branch: row.location_branch_name,
          sold_at: row.sold_at,
          sold_price: row.sold_price,
          sold_to_customer: row.customer_name,
          notes: row.barcode_notes
        });
      }
    });

    const items: PurchaseOrderItem[] = Array.from(itemsMap.values());

    // Construct complete purchase order details
    const purchaseOrderDetails: PurchaseOrderDetails = {
      id: orderData.id,
      order_number: orderData.order_number,
      invoice_number: orderData.invoice_number,
      supplier_id: orderData.supplier_id,
      supplier_name: orderData.supplier_name,
      supplier_code: orderData.supplier_code,
      supplier_contact_name: orderData.supplier_contact_name,
      supplier_phone: orderData.supplier_phone,
      supplier_email: orderData.supplier_email,
      supplier_address: orderData.supplier_address,
      supplier_sales_rep_name: orderData.supplier_sales_rep_name,
      supplier_sales_rep_phone: orderData.supplier_sales_rep_phone,
      purchased_by: orderData.purchased_by,
      purchaser_name: orderData.purchaser_name,
      purchaser_email: orderData.purchaser_email,
      branch_id: orderData.branch_id,
      branch_name: orderData.branch_name,
      branch_code: orderData.branch_code,
      branch_location: orderData.branch_location,
      order_date: orderData.order_date,
      expected_date: orderData.expected_date,
      received_date: orderData.received_date,
      status: orderData.status,
      subtotal: orderData.subtotal,
      tax_amount: orderData.tax_amount,
      total_amount: orderData.total_amount,
      notes: orderData.notes,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
      items
    };

    // Calculate barcode statistics
    const totalBarcodes = items.reduce((sum, item) => sum + item.item_barcodes.length, 0);
    const availableBarcodes = items.reduce((sum, item) => 
      sum + item.item_barcodes.filter(barcode => barcode.status === 'AVAILABLE').length, 0
    );
    const soldBarcodes = items.reduce((sum, item) => 
      sum + item.item_barcodes.filter(barcode => barcode.status === 'SOLD').length, 0
    );

    return NextResponse.json<ApiResponse<PurchaseOrderDetails>>({
      success: true,
      data: purchaseOrderDetails,
      message: 'Purchase order details retrieved successfully',
      timestamp: new Date().toISOString(),
      metadata: {
        total_items: items.length,
        total_ordered_quantity: items.reduce((sum, item) => sum + item.quantity_ordered, 0),
        total_received_quantity: items.reduce((sum, item) => sum + item.quantity_received, 0),
        total_barcodes: totalBarcodes,
        available_barcodes: availableBarcodes,
        sold_barcodes: soldBarcodes,
        barcode_status_breakdown: {
          available: availableBarcodes,
          sold: soldBarcodes,
          reserved: items.reduce((sum, item) => 
            sum + item.item_barcodes.filter(barcode => barcode.status === 'RESERVED').length, 0
          ),
          returned: items.reduce((sum, item) => 
            sum + item.item_barcodes.filter(barcode => barcode.status === 'RETURNED').length, 0
          ),
          damaged: items.reduce((sum, item) => 
            sum + item.item_barcodes.filter(barcode => barcode.status === 'DAMAGED').length, 0
          )
        },
        supplier_info: {
          name: orderData.supplier_name,
          code: orderData.supplier_code
        },
        branch_info: orderData.branch_name ? {
          name: orderData.branch_name,
          code: orderData.branch_code
        } : null
      }
    });

  } catch (error: any) {
    console.error('Error fetching purchase order details:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: 'Failed to fetch purchase order details',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
