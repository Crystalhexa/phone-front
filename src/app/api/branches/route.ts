
import { ApiResponse, initDatabase, query, transaction } from '@/lib/database/connection';
import cuid from 'cuid';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod'


const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  location: z.string().min(1, "Location is required"),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  is_active: z.boolean().optional(),
  is_main_branch: z.boolean().optional(),
  can_purchase: z.boolean().optional(),
  timezone: z.string().optional(),
})

function generateBranchCode(location: string): string {
  const initials = location.split(/\s+/).map(word => word[0]?.toUpperCase()).join('').slice(0, 3)
  const random = Math.floor(100 + Math.random() * 900)
  return `${initials}${random}`
}

export async function POST(req: NextRequest) {
  await initDatabase();
  const timestamp = new Date().toISOString();
  
  try {
    const json = await req.json();
    const parsed = branchSchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: parsed.error.errors[0]?.message || 'Invalid input',
        data: null,
        timestamp,
      }, { status: 400 })
    }
    
    const data = parsed.data;
    const branchCode = generateBranchCode(data.location);
    
    const result = await transaction(async client => {
      const branchId = cuid();
      
      // 1. Create the branch
      const { rows: branchRows } = await client.query(`
        INSERT INTO branches (
          id, name, code, location, address, phone, email,
          is_active, is_main_branch, can_purchase, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        branchId,
        data.name,
        branchCode,
        data.location,
        data.address || null,
        data.phone || null,
        data.email || null,
        data.is_active ?? true,
        data.is_main_branch ?? false,
        data.can_purchase ?? false,
        data.timezone || 'UTC',
      ]);
      
      const branch = branchRows[0];
      
      // 2. Get all active products
      const { rows: productRows } = await client.query(`
        SELECT id FROM products WHERE is_active = true
      `);
      
      // 3. Create branch_inventory records for all active products
      if (productRows.length > 0) {
        const inventoryValues = productRows.map((product, index) => {
          const baseIndex = index * 9; // 9 parameters per record
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`;
        }).join(', ');
        
        const inventoryParams = productRows.flatMap(product => [
          cuid(), // id
          branchId, // branch_id
          product.id, // product_id
          0, // total_quantity
          0, // reserved_quantity
          5, // low_stock_threshold (default)
          20, // reorder_quantity (default)
          null, // last_restock_date
          null, // last_sale_date
        ]);
        
        await client.query(`
          INSERT INTO branch_inventory (
            id, branch_id, product_id, total_quantity, reserved_quantity,
            low_stock_threshold, reorder_quantity, last_restock_date, last_sale_date
          ) VALUES ${inventoryValues}
        `, inventoryParams);
      }
      
      return {
        branch,
        inventoryRecordsCreated: productRows.length
      };
    });
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Branch created successfully with ${result.inventoryRecordsCreated} inventory records initialized`,
      data: result.branch,
      timestamp,
    }, { status: 201 })
    
  } catch (err: any) {
    console.log(err);
    const isUnique = err.code === '23505';
    let message = 'Internal server error';
    
    if (isUnique) {
      if (err.detail?.includes('phone')) message = 'Phone already exists.';
      else if (err.detail?.includes('email')) message = 'Email already exists.';
      else if (err.detail?.includes('code')) message = 'Generated branch code already exists. Please retry.';
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      message,
      data: null,
      timestamp,
    }, { status: isUnique ? 409 : 500 })
  }
}


export async function GET(request: Request) {
  await initDatabase()
  const timestamp = new Date().toISOString()
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'DESC'
    const is_active = searchParams.get('is_active')
    
    // Calculate offset from page if provided
    const calculatedOffset = page > 1 ? (page - 1) * limit : offset
    
    // Build WHERE clause
    let whereClause = '1=1'
    let queryParams: any[] = []
    let paramIndex = 1
    
    // Add search filter (name, code, address)
    if (search) {
      whereClause += ` AND (
        LOWER(name) LIKE $${paramIndex} OR 
        LOWER(code) LIKE $${paramIndex + 1} OR 
        LOWER(address) LIKE $${paramIndex + 2}
      )`
      const searchTerm = `%${search.toLowerCase()}%`
      queryParams.push(searchTerm, searchTerm, searchTerm)
      paramIndex += 3
    }
    
    // Add is_active filter
    if (is_active !== null) {
      whereClause += ` AND is_active = $${paramIndex}`
      queryParams.push(is_active === 'true')
      paramIndex++
    }
    
    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['id', 'name', 'code', 'location', 'address', 'phone', 'email', 'is_active', 'is_main_branch', 'can_purchase', 'created_at', 'updated_at']
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Build the main query
    const mainQuery = `
      SELECT 
        id, name, code, location, address, phone, email, 
        is_active, is_main_branch, can_purchase, timezone,
        created_at, updated_at
      FROM branches 
      WHERE ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    // Build the count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM branches 
      WHERE ${whereClause}
    `
    
    // Execute queries
    const [result, countResult] = await Promise.all([
      query(mainQuery, [...queryParams, limit, calculatedOffset]),
      query(countQuery, queryParams)
    ])
    
    const totalCount = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalCount / limit)
    const currentPage = Math.floor(calculatedOffset / limit) + 1
    
    const response = {
      success: true,
      data: {
        branches: result.rows,
      }, 
       currentPage,
       totalPages,
       totalCount,
       limit,
       offset: calculatedOffset,
       hasNext: currentPage < totalPages,
       hasPrevious: currentPage > 1,
      message: 'Fetched branches successfully',
      timestamp
    }
    
    return NextResponse.json<ApiResponse>(response)
    
  } catch (err: any) {
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: 'Failed to fetch branches',
      errors: [err.message],
      timestamp,
    }, { status: 500 })
  }
}
