// scripts/seed-roles-sql.ts
import { Pool } from 'pg';
import { DEFAULT_ROLES } from '../src/lib/role-permisions';
import dotenv from 'dotenv';
import cuid from 'cuid';

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:janath@localhost:5432/phone?schema=public";
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seedRoles() {
  console.log('🔁 Seeding default roles (SQL)...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const role of DEFAULT_ROLES) {
      const existing = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [role.name]
      );

      if (existing.rows.length === 0) {
        const id = cuid();
        await client.query(
          `INSERT INTO roles (id,name, description, permissions, is_active)
           VALUES ($1, $2, $3, $4,$5)`,
          [id,role.name, role.description, JSON.stringify(role.permissions), true]
        );
        console.log(`✅ Created role: ${role.name}`);
      } else {
        await client.query(
          `UPDATE roles SET permissions = $1 WHERE id = $2`,
          [JSON.stringify(role.permissions), existing.rows[0].id]
        );
        console.log(`🔄 Updated permissions for role: ${role.name}`);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Role seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during role seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRoles().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
