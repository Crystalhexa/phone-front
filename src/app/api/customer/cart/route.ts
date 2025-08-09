// app/api/customers/route.ts
import { query } from '@/lib/database/connection'
import cuid from 'cuid'
import { NextRequest } from 'next/server'
import { z } from 'zod'

// Types
interface Customer {
  id: string
  customer_number: string
  name: string
  email: string | null
  nic: string | null
  phone: string | null
  address: string | null
  date_of_birth: Date | null
  customer_type: 'RETAIL' | 'WHOLESALE' | 'VIP'
  credit_limit: number | null
  outstanding_balance: number
  loyalty_points: number
  discount_percentage: number | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message: string
  errors?: any[] | null
  timestamp: string
  metadata?: any
}

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  nic: z.string().max(20).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  customer_type: z.enum(['RETAIL', 'WHOLESALE', 'VIP']).default('RETAIL'),
  credit_limit: z.number().optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
})

// GET /api/customers - Search customers
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    
    let queryText = `
      SELECT 
        id,
        customer_number,
        name,
        email,
        nic,
        phone,
        address,
        customer_type,
        outstanding_balance,
        loyalty_points,
        discount_percentage,
        is_active,
        created_at
      FROM customers 
      WHERE is_active = true
    `
    
    const queryParams: any[] = []
    
    if (search) {
      queryText += ` AND (
        name ILIKE $1 OR 
        customer_number ILIKE $1 OR 
        phone ILIKE $1 OR   
        nic ILIKE $1 OR
        email ILIKE $1
      )`
      queryParams.push(`%${search}%`)
    }
    
    queryText += ` ORDER BY name ASC LIMIT $${queryParams.length + 1}`
    queryParams.push(limit)
    
    const result = await query<Customer>(queryText, queryParams)
    
    const response: ApiResponse<Customer[]> = {
      success: true,
      data: result.rows,
      message: 'Customers retrieved successfully',
      timestamp: new Date().toISOString()
    }
    
    return Response.json(response)
    
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    
    const response: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to fetch customers',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }
    
    return Response.json(response, { status: 500 })
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    const validatedData = createCustomerSchema.parse(body)
    
    
    
    // Check for unique constraints
    const checks: Promise<any>[] = []
    if (validatedData.email) {
      checks.push(query('SELECT id FROM customers WHERE email = $1', [validatedData.email]))
    }
    if (validatedData.nic) {
      checks.push(query('SELECT id FROM customers WHERE nic = $1', [validatedData.nic]))
    }
    if (validatedData.phone) {
      checks.push(query('SELECT id FROM customers WHERE phone = $1', [validatedData.phone]))
    }
    
    if (checks.length > 0) {
      const checkResults = await Promise.all(checks)
      const duplicates = checkResults.filter(result => result.rows.length > 0)
      
      if (duplicates.length > 0) {
        const response: ApiResponse = {
          success: false,
          data: null,
          message: 'Customer with this email, NIC, or phone already exists',
          timestamp: new Date().toISOString()
        }
        return Response.json(response, { status: 400 })
      }
    }
          const customerId = cuid();

    
    // Insert new customer
    const insertQuery = `
      INSERT INTO customers (
        id,
        name,
        email,
        nic,
        phone,
        address,
        date_of_birth,
        customer_type,
        credit_limit,
        discount_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10)
      RETURNING 
        id,
        name,
        email,
        nic,
        phone,
        address,
        customer_type,
        outstanding_balance,
        loyalty_points,
        discount_percentage,
        is_active,
        created_at
    `
    
    const insertParams = [
      customerId,
      validatedData.name,
      validatedData.email || null,
      validatedData.nic || null,
      validatedData.phone || null,
      validatedData.address || null,
      validatedData.date_of_birth ? new Date(validatedData.date_of_birth) : null,
      validatedData.customer_type,
      validatedData.credit_limit || null,
      validatedData.discount_percentage || null
    ]
    
    const result = await query<Customer>(insertQuery, insertParams)
    const newCustomer = result.rows[0]
    
    const response: ApiResponse<Customer> = {
      success: true,
      data: newCustomer,
      message: 'Customer created successfully',
      timestamp: new Date().toISOString()
    }
    
    return Response.json(response, { status: 201 })
    
  } catch (error: any) {
    console.error('Error creating customer:', error)
    
    if (error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        data: null,
        message: 'Validation error',
        errors: error.errors,
        timestamp: new Date().toISOString()
      }
      return Response.json(response, { status: 400 })
    }
    
    const response: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to create customer',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }
    
    return Response.json(response, { status: 500 })
  }
}