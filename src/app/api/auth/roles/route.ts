// app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/middleware/auth'
import { query } from '@/lib/database/connection'
import { ROLE_PERMISSIONS } from '@/lib/role-permisions'

export const POST = withPermission('ROLE_CREATE')(async (req: NextRequest) => {
  try {
    const { name, description, permissionSet } = await req.json()

     if (!ROLE_PERMISSIONS[permissionSet as keyof typeof ROLE_PERMISSIONS]) {
      return NextResponse.json(
        { error: 'Invalid permission set' },
        { status: 400 }
      );
    }

    const permissions = ROLE_PERMISSIONS[permissionSet as keyof typeof ROLE_PERMISSIONS];

    const insertQuery = `
      INSERT INTO roles (name, description, permissions)
      VALUES ($1, $2, $3)
      RETURNING *
    `

    const result = await query(insertQuery, [name, description, JSON.stringify(permissions)])
    const role = result.rows[0]

    return NextResponse.json({ message: 'Role created successfully', role })
  } catch (err) {
    console.error('❌ Role creation failed:', err)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
})

export const GET = withPermission('ROLE_READ')(async (_req: NextRequest) => {
  try {
    const selectQuery = `
      SELECT id, name, description, permissions, created_at, updated_at
      FROM roles
      ORDER BY created_at DESC
    `

    const result = await query(selectQuery)

    return NextResponse.json({
      message: 'Roles fetched successfully',
      roles: result.rows,
    })
  } catch (err) {
    console.error('❌ Failed to fetch roles:', err)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
})
