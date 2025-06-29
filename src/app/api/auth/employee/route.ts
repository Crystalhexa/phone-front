import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ApiResponse, initDatabase, transaction } from '@/lib/database/connection'
import cuid from 'cuid'

// ========= Zod Schemas =========
const employeeSchema = z.object({
  employee_number: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  nic: z.string().optional().nullable(),
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

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          user_id: userId,
          employee_id: employeeId
        },
        message: 'User and employee created successfully',
        timestamp: new Date().toISOString()
      }, { status: 201 })
    })

    return result

  } catch (err: any) {
    console.error('❌ POST /users error:', err)

    // Unique constraint violation
    if (err.code === '23505') {
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
        message: `Duplicate entry: ${field} already exists.`,
        errors: [detail],
        timestamp: new Date().toISOString()
      }, { status: 409 }) // Conflict
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: err?.message || 'Internal Server Error',
      errors: err?.issues || null,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
