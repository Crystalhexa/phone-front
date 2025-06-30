import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ApiResponse, initDatabase, query, transaction } from '@/lib/database/connection'
import cuid from 'cuid'

// ========= Zod Schemas =========
const employeeSchema = z.object({
  employee_number: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().transform(val => val.trim() === '' ? null : val.trim()).optional().nullable(),
  nic: z.string().transform(val => val.trim() === '' ? null : val.trim()).optional().nullable(),
  gender: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  is_active: z.boolean()
})

const userSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password_hash: z.string().min(6),
  is_active: z.boolean(),
  role_id: z.string().cuid(),
  employee: employeeSchema
})

// GET all users with employees
export async function GET(req: NextRequest) {
  await initDatabase()

  const { searchParams } = new URL(req.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = (page - 1) * limit
  const search = searchParams.get('search')?.trim()
  const sortBy = searchParams.get('sortBy') || 'e.name'
  const sortOrder = searchParams.get('sortOrder')?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'

  try {
    // Get total count
    const totalQuery = await query(`
      SELECT COUNT(*) FROM users u
      JOIN employees e ON e.user_id = u.id
      ${search ? `WHERE e.name ILIKE $1 OR e.email ILIKE $1` : ''}
    `, search ? [`%${search}%`] : [])

    const total = parseInt(totalQuery.rows[0].count)

    // Get paginated data
    const dataQuery = await query(`
      SELECT 
        u.id as user_id, u.username, u.email as user_email, u.is_active as user_active, u.role_id,
        e.id as employee_id, e.employee_number, e.name, e.email, e.phone, e.nic, e.gender, e.position,
        e.department, e.date_of_birth, e.hire_date, e.is_active as employee_active
      FROM users u
      JOIN employees e ON e.user_id = u.id
      ${search ? `WHERE e.name ILIKE $1 OR e.email ILIKE $1` : ''}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}
    `, search ? [`%${search}%`, limit, offset] : [limit, offset])

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        users: dataQuery.rows,
        total,
        page,
        limit,
      },
      message: 'Users fetched successfully',
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (err: any) {
    console.error('❌ GET /users error:', err)
    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: 'Failed to fetch users',
      errors: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST create new user with employee
export async function POST(req: NextRequest) {
  await initDatabase()

  try {
    const json = await req.json()
    const body = userSchema.parse(json)

    const result = await transaction(async client => {
      const userId = cuid()
      const employeeId = cuid()
      const hashedPassword = await bcrypt.hash(body.password_hash, 12)

      await client.query(
        `INSERT INTO users (id, username, email, password_hash, is_active, role_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, body.username, body.email, hashedPassword, body.is_active, body.role_id]
      )

      const emp = body.employee
      await client.query(
        `INSERT INTO employees (
          id, employee_number, name, email, phone, nic, gender, position,
          department, date_of_birth, hire_date, is_active, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          employeeId,
          emp.employee_number,
          emp.name,
          emp.email,
          emp.phone,
          emp.nic,
          emp.gender,
          emp.position,
          emp.department,
          emp.date_of_birth,
          emp.hire_date,
          emp.is_active,
          userId
        ]
      )

      return {
        user_id: userId,
        employee_id: employeeId
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: 'User and employee created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (err: any) {
    console.error('❌ POST /users error:', err)

    if (err.code === '23505') {  // Unique constraint violation
      const detail = err.detail || ''
      let field = 'a unique field'

      if (detail.includes('users_username_key')) field = 'username'
      else if (detail.includes('users_email_key')) field = 'user email'
      else if (detail.includes('employees_email_key')) field = 'employee email'
      else if (detail.includes('employees_phone_key')) field = 'employee phone'
      else if (detail.includes('employees_employee_number_key')) field = 'employee number'
      else if (detail.includes('employees_nic_key')) field = 'employee NIC'

      return NextResponse.json<ApiResponse>({
        success: false,
        data: null,
        message: `Conflict on field: ${field}. ${detail}`,
        timestamp: new Date().toISOString()
      }, { status: 409 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: err.message || 'Internal Server Error',
      errors: err.issues || null,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
