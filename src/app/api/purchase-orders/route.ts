// app/api/purchase-orders/route.ts
import { NextResponse } from 'next/server';
import { initDatabase, query, transaction } from '@/lib/database/connection';
import { z } from 'zod';
import { AuthenticatedRequest, withAuth } from '@/middleware/auth';

// ========== Custom Error Classes ==========

class PurchaseOrderError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'PurchaseOrderError';
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends PurchaseOrderError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends PurchaseOrderError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

class AuthorizationError extends PurchaseOrderError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends PurchaseOrderError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND_ERROR', 404, details);
    this.name = 'NotFoundError';
  }
}

class BusinessLogicError extends PurchaseOrderError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_LOGIC_ERROR', 422, details);
    this.name = 'BusinessLogicError';
  }
}

// ========== Validation Schemas ==========

const PurchaseOrderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID format'),
  quantity: z.number().positive('Quantity must be positive'),
  cost_price: z.number().positive('Cost price must be positive'),
  wholesale_price: z.number().positive().optional(),
  retail_price: z.number().positive('Retail price must be positive'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
});

const CreatePurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid('Invalid supplier ID format'),
  items: z.array(PurchaseOrderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  expected_delivery_date: z.string().datetime().optional()
});

// ========== Types ==========

interface PurchaseOrderItem {
  product_id: string;
  quantity: number;
  cost_price: number;
  wholesale_price?: number;
  retail_price: number;
  notes?: string;
}

interface CreatePurchaseOrderRequest {
  supplier_id: string;
  items: PurchaseOrderItem[];
  notes?: string;
  expected_delivery_date?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: string[] | null;
  error_code?: string;
  timestamp: string;
  request_id?: string;
}

// ========== Helper Functions ==========

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate branch permissions for purchase orders
 */
async function validateBranchPermissions(branchId: string): Promise<void> {
  const branchQuery = `
    SELECT id, name, code, is_main_branch, can_purchase, is_active
    FROM branches 
    WHERE id = $1
  `;
  
  try {
    const result = await query(branchQuery, [branchId]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Branch not found', { branchId });
    }
    
    const branch = result.rows[0];
    
    if (!branch.is_active) {
      throw new AuthorizationError('Branch is not active', { 
        branchId, 
        branchName: branch.name 
      });
    }
    
    if (!branch.is_main_branch) {
      throw new AuthorizationError('Only main branch can place purchase orders', { 
        branchId, 
        branchName: branch.name,
        isMainBranch: branch.is_main_branch
      });
    }
    
    if (!branch.can_purchase) {
      throw new AuthorizationError('Branch does not have purchase permissions', { 
        branchId, 
        branchName: branch.name,
        canPurchase: branch.can_purchase
      });
    }
  } catch (error) {
    if (error instanceof PurchaseOrderError) {
      throw error;
    }
    throw new DatabaseError('Failed to validate branch permissions', { 
      branchId,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Validate supplier exists and is active
 */
async function validateSupplier(supplierId: string): Promise<void> {
  const supplierQuery = `
    SELECT id, name, is_active FROM suppliers 
    WHERE id = $1
  `;
  
  try {
    const result = await query(supplierQuery, [supplierId]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Supplier not found', { supplierId });
    }
    
    const supplier = result.rows[0];
    
    if (!supplier.is_active) {
      throw new BusinessLogicError('Supplier is not active', { 
        supplierId,
        supplierName: supplier.name
      });
    }
  } catch (error) {
    if (error instanceof PurchaseOrderError) {
      throw error;
    }
    throw new DatabaseError('Failed to validate supplier', { 
      supplierId,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Validate all products exist and are active
 */
async function validateProducts(productIds: string[]): Promise<void> {
  if (productIds.length === 0) {
    throw new ValidationError('No products provided');
  }
  
  // Check for duplicate product IDs
  const uniqueProductIds = [...new Set(productIds)];
  if (uniqueProductIds.length !== productIds.length) {
    throw new ValidationError('Duplicate products are not allowed');
  }
  
  const productQuery = `
    SELECT id, name, is_active FROM products 
    WHERE id = ANY($1)
  `;
  
  try {
    const result = await query(productQuery, [uniqueProductIds]);
    
    if (result.rows.length !== uniqueProductIds.length) {
      const foundIds = result.rows.map(p => p.id);
      const missingIds = uniqueProductIds.filter(id => !foundIds.includes(id));
      throw new NotFoundError('One or more products not found', { 
        missingProductIds: missingIds 
      });
    }
    
    const inactiveProducts = result.rows.filter(p => !p.is_active);
    if (inactiveProducts.length > 0) {
      throw new BusinessLogicError('Some products are not active', { 
        inactiveProducts: inactiveProducts.map(p => ({
          id: p.id,
          name: p.name
        }))
      });
    }
  } catch (error) {
    if (error instanceof PurchaseOrderError) {
      throw error;
    }
    throw new DatabaseError('Failed to validate products', { 
      productIds: uniqueProductIds,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate next purchase order number
 */
async function generatePurchaseOrderNumber(client: any): Promise<string> {
  const orderNumberQuery = `
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS INTEGER)), 0) + 1 as next_number
    FROM purchase_orders 
    WHERE order_number LIKE 'PO%'
  `;
  
  try {
    const result = await client.query(orderNumberQuery);
    const nextNumber = result.rows[0].next_number;
    return `PO${nextNumber.toString().padStart(6, '0')}`;
  } catch (error) {
    throw new DatabaseError('Failed to generate purchase order number', { 
      originalError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate next batch number
 */
async function generateBatchNumber(client: any): Promise<string> {
  const batchNumberQuery = `
    SELECT COALESCE(MAX(CAST(SUBSTRING(batch_number FROM 3) AS INTEGER)), 0) + 1 as next_number
    FROM purchase_batches 
    WHERE batch_number LIKE 'BT%'
  `;
  
  try {
    const result = await client.query(batchNumberQuery);
    const nextNumber = result.rows[0].next_number;
    return `BT${nextNumber.toString().padStart(6, '0')}`;
  } catch (error) {
    throw new DatabaseError('Failed to generate batch number', { 
      originalError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Create error response
 */
function createErrorResponse(
  error: any, 
  requestId: string, 
  defaultMessage: string = 'An unexpected error occurred'
): NextResponse {
  let statusCode = 500;
  let message = defaultMessage;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errors: string[] = [];

  if (error instanceof PurchaseOrderError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = error.code;
    errors = [error.message];
  } else if (error instanceof z.ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  } else {
    console.error('Unexpected error:', error);
    errors = [message];
  }

  return NextResponse.json({
    success: false,
    data: null,
    message,
    errors,
    error_code: errorCode,
    timestamp: new Date().toISOString(),
    request_id: requestId
  } as ApiResponse<null>, { status: statusCode });
}

// ========== API Handlers ==========

/**
 * POST /api/purchase-orders
 * Create new purchase order with items
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const requestId = generateRequestId();
  
  try {
    await initDatabase();
    
    // Parse and validate request body
    const body: CreatePurchaseOrderRequest = await req.json();
    const validatedData = CreatePurchaseOrderSchema.parse(body);
    
    const { supplier_id, items, notes, expected_delivery_date } = validatedData;
    
    // Get user's branch ID from authentication
    const branchId = req.user?.user?.branchId;
    
    if (!branchId) {
      throw new AuthorizationError('User must be associated with a branch');
    }
    
    // Validate business logic
    await validateBranchPermissions(branchId);
    await validateSupplier(supplier_id);
    
    const productIds = items.map(item => item.product_id);
    await validateProducts(productIds);
    
    // Create purchase order in transaction
    const purchaseOrder = await transaction(async (client) => {
      try {
        // Generate purchase order number
        const orderNumber = await generatePurchaseOrderNumber(client);
        
        // Calculate total amount
        const totalAmount = items.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);
        
        // Create purchase order
        const createOrderQuery = `
          INSERT INTO purchase_orders (
            
            order_number, 
            branch_id, 
            supplier_id, 
            total_amount, 
            status, 
            notes, 
            expected_delivery_date,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, NOW(), NOW())
          RETURNING id, order_number, total_amount, status, created_at
        `;
        
        const orderResult = await client.query(createOrderQuery, [
          orderNumber,
          branchId,
          supplier_id,
          totalAmount,
          notes || null,
          expected_delivery_date || null
        ]);
        
        const purchaseOrderId = orderResult.rows[0].id;
        const createdOrder = orderResult.rows[0];
        
        // Create purchase order items and corresponding batches
        const createdItems = [];
        
        for (const item of items) {
          // Create purchase order item
          const createItemQuery = `
            INSERT INTO purchase_order_items (
              purchase_order_id, 
              product_id, 
              quantity, 
              cost_price, 
              wholesale_price, 
              retail_price, 
              notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, product_id, quantity, cost_price, wholesale_price, retail_price
          `;
          
          const itemResult = await client.query(createItemQuery, [
            purchaseOrderId,
            item.product_id,
            item.quantity,
            item.cost_price,
            item.wholesale_price || null,
            item.retail_price,
            item.notes || null
          ]);
          
          const createdItem = itemResult.rows[0];
          createdItems.push(createdItem);
          
          // Generate batch number
          const batchNumber = await generateBatchNumber(client);
          
          // Create corresponding purchase batch
          const createBatchQuery = `
            INSERT INTO purchase_batches (
              batch_number,
              product_id,
              purchase_order_id,
              supplier_id,
              quantity_ordered,
              quantity_received,
              cost_price,
              wholesale_price,
              retail_price,
              is_active,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, true, NOW(), NOW())
            RETURNING id, batch_number
          `;
          
          await client.query(createBatchQuery, [
            batchNumber,
            item.product_id,
            purchaseOrderId,
            supplier_id,
            item.quantity,
            item.cost_price,
            item.wholesale_price || null,
            item.retail_price
          ]);
        }
        
        return {
          ...createdOrder,
          items: createdItems,
          total_items: createdItems.length
        };
      } catch (error) {
        throw new DatabaseError('Failed to create purchase order in transaction', { 
          originalError: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: purchaseOrder,
      message: 'Purchase order created successfully',
      timestamp: new Date().toISOString(),
      request_id: requestId
    } as ApiResponse<any>, { status: 201 });
    
  } catch (error) {
    return createErrorResponse(error, requestId, 'Failed to create purchase order');
  }
});

/**
 * GET /api/purchase-orders
 * Get all purchase orders for the authenticated user's branch
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const requestId = generateRequestId();
  
  try {
    await initDatabase();
    
    const branchId = req.user?.user?.branchId;
    
    if (!branchId) {
      throw new AuthorizationError('User must be associated with a branch');
    }
    
    // Get purchase orders with supplier info
    const purchaseOrdersQuery = `
      SELECT 
        po.id,
        po.order_number,
        po.total_amount,
        po.status,
        po.notes,
        po.expected_delivery_date,
        po.created_at,
        po.updated_at,
        s.name as supplier_name,
        s.code as supplier_code,
        COUNT(poi.id) as total_items
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.branch_id = $1
      GROUP BY po.id, s.name, s.code
      ORDER BY po.created_at DESC
    `;
    
    const result = await query(purchaseOrdersQuery, [branchId]);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      message: 'Purchase orders retrieved successfully',
      timestamp: new Date().toISOString(),
      request_id: requestId
    } as ApiResponse<any>, { status: 200 });
    
  } catch (error) {
    return createErrorResponse(error, requestId, 'Failed to retrieve purchase orders');
  }
});