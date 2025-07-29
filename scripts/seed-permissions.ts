import cuid from 'cuid'
import bcrypt from 'bcryptjs'
import { initDatabase, query, closeDatabase } from '@/lib/database/connection'
import { permissionGroups } from '@/lib/permission-groups'

// === ENV VARIABLES ===
const DEFAULT_USERNAME = process.env.DEFAULT_USER_USERNAME || 'admin'
const DEFAULT_EMAIL = process.env.DEFAULT_USER_EMAIL
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD ||'';

if (!DEFAULT_EMAIL || !DEFAULT_PASSWORD) {
  console.error('❌ DEFAULT_USER_EMAIL and DEFAULT_USER_PASSWORD must be set in environment.')
  process.exit(1)
}

async function seedPermissionsAndAdminUser() {
  console.log('🔁 Seeding permission groups and default user...')
  await initDatabase()

  try {
    // --- Seed Permission Groups & Permissions ---
    for (const group of permissionGroups) {
      const groupRes = await query('SELECT id FROM permission_groups WHERE name = $1', [group.name])

      let groupId: string

      if (groupRes.rows.length === 0) {
        groupId = cuid()
        await query(
          `INSERT INTO permission_groups (id, name) VALUES ($1, $2)`,
          [groupId, group.name]
        )
        console.log(`✅ Created group: ${group.name}`)
      } else {
        groupId = groupRes.rows[0].id
        console.log(`🔄 Using existing group: ${group.name}`)
      }

      for (const permission of group.permissions) {
        const permRes = await query('SELECT id FROM permissions WHERE name = $1', [permission.name])

        if (permRes.rows.length === 0) {
          await query(
            `INSERT INTO permissions (id, name, description, group_id)
             VALUES ($1, $2, $3, $4)`,
            [cuid(), permission.name, permission.description, groupId]
          )
          console.log(`   ✅ Created permission: ${permission.name}`)
        } else {
          console.log(`   ⏩ Skipped existing permission: ${permission.name}`)
        }
      }
    }

    // --- Seed Default Admin User ---
    const userRes = await query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [DEFAULT_EMAIL])

    if (userRes.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12)

      const userId = cuid()
      await query(
        `INSERT INTO users (id, username, email, password_hash, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
        [userId, DEFAULT_USERNAME, DEFAULT_EMAIL, hashedPassword]
      )
      const employeeId = cuid();
      await query(
        `INSERT INTO employees (id, user_id)
         VALUES ($1, $2)`,
        [employeeId, userId]
      )

      console.log(`✅ Created default admin user: ${DEFAULT_EMAIL}`)
    } else {
      console.log(`🔄 Default admin user already exists: ${DEFAULT_EMAIL}`)
    }

    console.log('✅ Seeding completed successfully!')
  } catch (err) {
    console.error('❌ Seeding error:', err)
    process.exit(1)
  } finally {
    await closeDatabase()
  }
}

seedPermissionsAndAdminUser()
