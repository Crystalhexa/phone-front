// app/api/auth/employee/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, query, transaction } from '@/lib/database/connection'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password_hash: z.string().min(6).optional(),
  is_active: z.boolean(),
  role_id: z.string(),
  employee: z.object({
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
})
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params
  await initDatabase()

  try {
    const result = await query(
      `SELECT 
        u.id as user_id, u.username, u.email as user_email, u.is_active as user_active, u.role_id,
        e.id as employee_id, e.employee_number, e.name, e.email, e.phone, e.nic, e.gender, e.position,
        e.department, e.date_of_birth, e.hire_date, e.is_active as employee_active
       FROM users u
       JOIN employees e ON e.user_id = u.id
       WHERE u.id = $1`,
      [id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const row = result.rows[0]

    const user = {
      username: row.username,
      email: row.user_email,
      password_hash: '',
      is_active: row.user_active,
      role_id: row.role_id,
      employee: {
        employee_number: row.employee_number,
        name: row.name,
        email: row.email || row.user_email,
        phone: row.phone || '',
        nic: row.nic || '',
        gender: row.gender || 'MALE',
        position: row.position || '',
        department: row.department || '',
        date_of_birth: row.date_of_birth ? new Date(row.date_of_birth).toISOString() : null,
        hire_date: row.hire_date ? new Date(row.hire_date).toISOString() : null,
        is_active: row.employee_active ?? true,
      },
    }

    return NextResponse.json({ success: true, data: user })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, message: 'Failed to fetch user' }, { status: 500 })
  }
}



export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initDatabase()

  try {
    const body = updateSchema.parse(await req.json())
    const { employee } = body

    await transaction(async client => {
      const updateUserQuery = `
        UPDATE users SET username = $1, email = $2, is_active = $3, role_id = $4
        ${body.password_hash ? `, password_hash = '${await bcrypt.hash(body.password_hash, 12)}'` : ''}
        WHERE id = $5
      `
      await client.query(updateUserQuery, [
        body.username,
        body.email,
        body.is_active,
        body.role_id,
        params.id
      ])

      await client.query(
        `UPDATE employees SET
          employee_number = $1, name = $2, email = $3, phone = $4, nic = $5,
          gender = $6, position = $7, department = $8, date_of_birth = $9,
          hire_date = $10, is_active = $11
         WHERE user_id = $12`,
        [
          employee.employee_number,
          employee.name,
          employee.email,
          employee.phone,
          employee.nic,
          employee.gender,
          employee.position,
          employee.department,
          employee.date_of_birth,
          employee.hire_date,
          employee.is_active,
          params.id
        ]
      )
    })

    return NextResponse.json({ success: true, message: 'User updated successfully' })

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await initDatabase()

  try {
    await transaction(async client => {
      await client.query('DELETE FROM employees WHERE user_id = $1', [params.id])
      await client.query('DELETE FROM users WHERE id = $1', [params.id])
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete user' }, { status: 500 })
  }
}
