// app/api/customers/[id]/route.ts
import { query } from '@/lib/database/connection'
import { NextRequest } from 'next/server'

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

// GET /api/customers/[id] - Get customer by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params
    
    const result = await query<Customer>(`
      SELECT 
        id,
        customer_number,
        name,
        email,
        nic,
        phone,
        address,
        date_of_birth,
        customer_type,
        credit_limit,
        outstanding_balance,
        loyalty_points,
        discount_percentage,
        is_active,
        created_at,
        updated_at
      FROM customers 
      WHERE id = $1 AND is_active = true
    `, [id])
    
    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        data: null,
        message: 'Customer not found',
        timestamp: new Date().toISOString()
      }
      return Response.json(response, { status: 404 })
    }
    
    const response: ApiResponse<Customer> = {
      success: true,
      data: result.rows[0],
      message: 'Customer retrieved successfully',
      timestamp: new Date().toISOString()
    }
    
    return Response.json(response)
    
  } catch (error: any) {
    console.error('Error fetching customer:', error)
    
    const response: ApiResponse = {
      success: false,
      data: null,
      message: 'Failed to fetch customer',
      errors: [error.message],
      timestamp: new Date().toISOString()
    }
    
    return Response.json(response, { status: 500 })
  }
}