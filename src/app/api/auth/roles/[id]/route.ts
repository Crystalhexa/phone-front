// app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/middleware/auth'
import { query } from '@/lib/database/connection'
import { ROLE_PERMISSIONS } from '@/lib/role-permisions'
import z from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
  is_active: z.boolean().optional()
})

export const GET = withPermission("ROLE_READ")(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const roleRes = await query(
      `SELECT r.*, json_agg(json_build_object('id', u.id, 'username', u.username, 'email', u.email, 'is_active', u.is_active)) AS users
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       WHERE r.id = $1
       GROUP BY r.id`,
      [params.id]
    )

    if (roleRes.rowCount === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ role: roleRes.rows[0] })
  } catch (err) {
    console.error('❌ Get role failed:', err)
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 })
  }
})

export const PUT = withPermission("ROLE_UPDATE")(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const data = updateSchema.parse(await req.json())
    const { id } = params

    // Check if name exists
    if (data.name) {
      const exists = await query(`SELECT id FROM roles WHERE name = $1 AND id != $2`, [data.name, id])
      if ((exists.rowCount ?? 0) > 0) {
        return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 })
      }
    }

    const fields = []
    const values = []
    let i = 1

    for (const key in data) {
      fields.push(`${key} = $${i}`)
      values.push(
        key === 'permissions'
          ? JSON.stringify(data[key as keyof typeof data])
          : data[key as keyof typeof data]
      )
      i++
    }

    values.push(id)

    const updateQuery = `
      UPDATE roles
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING *`

    const result = await query(updateQuery, values)

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Role updated successfully', role: result.rows[0] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('❌ Update role failed:', err)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
})

export const DELETE = withPermission("ROLE_DELETE")(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params

    const userCount = await query(`SELECT COUNT(*) FROM users WHERE role_id = $1`, [id])
    if (parseInt(userCount.rows[0].count) > 0) {
      return NextResponse.json({
        error: 'Cannot delete role with assigned users. Please reassign users first.'
      }, { status: 400 })
    }

    const result = await query(`DELETE FROM roles WHERE id = $1 RETURNING *`, [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (err) {
    console.error('❌ Delete role failed:', err)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
})
