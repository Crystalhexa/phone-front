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
  branch_id:z.string().cuid(),
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
  role_id: z.string().cuid().optional(),
  employee: employeeSchema.optional()
})

// GET all users with employees
export async function GET(req: NextRequest) {
  await initDatabase();

  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = (page - 1) * limit;

  const search = searchParams.get("search")?.trim();
  const sortBy = searchParams.get("sortBy") || "e.name";
  const sortOrder = searchParams.get("sortOrder")?.toUpperCase() === "DESC" ? "DESC" : "ASC";

  // Optional: restrict sortBy to safe fields
  const allowedSortFields = ['e.name', 'u.username', 'b.name', 'r.name'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'e.name';

  try {
    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(e.name ILIKE $${values.length} OR e.email ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const totalQuery = await query(
      `
      SELECT COUNT(*)
      FROM users u
      JOIN employees e ON e.user_id = u.id
      ${whereClause}
      `,
      values
    );

    const total = parseInt(totalQuery.rows[0].count, 10);

    // Add pagination params
    values.push(limit);
    values.push(offset);

    // Get data with role name and branch name
    const dataQuery = await query(
      `
      SELECT 
        u.id AS user_id,
        u.username,
        u.email AS user_email,
        u.is_active AS user_active,
        u.role_id,
        r.name AS role_name,

        e.id AS employee_id,
        e.employee_number,
        e.name,
        e.email,
        e.phone,
        e.nic,
        e.gender,
        e.position,
        e.department,
        e.date_of_birth,
        e.hire_date,
        e.is_active AS employee_active,

        b.id AS branch_id,
        b.name AS branch_name

      FROM users u
      JOIN employees e ON e.user_id = u.id
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY ${safeSortBy} ${sortOrder}
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
      values
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        users: dataQuery.rows,
        total,
        page,
        limit,
      },
      message: "Users fetched successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ GET /users error:", err);

    return NextResponse.json<ApiResponse>({
      success: false,
      data: null,
      message: "Failed to fetch users",
      errors: err.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
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
          id, name, email, phone, nic, gender, position,
          department, date_of_birth, hire_date, is_active, user_id,branch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          employeeId,
          emp?.name,
          emp?.email,
          emp?.phone,
          emp?.nic,
          emp?.gender,
          emp?.position,
          emp?.department,
          emp?.date_of_birth,
          emp?.hire_date,
          emp?.is_active,
          userId,
          emp?.branch_id,
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
