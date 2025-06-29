import cuid from 'cuid';
import { initDatabase, query } from '@/lib/database/connection';
import { permissionGroups } from '@/lib/permission-groups';

async function seedPermissions() {
  console.log('🔁 Seeding permission groups and permissions (SQL)...');

  await initDatabase();

  try {
    for (const group of permissionGroups) {
      const groupRes = await query('SELECT id FROM permission_groups WHERE name = $1', [group.name]);

      let groupId: string;

      if (groupRes.rows.length === 0) {
        groupId = cuid();
        await query(
          `INSERT INTO permission_groups (id, name) VALUES ($1, $2)`,
          [groupId, group.name]
        );
        console.log(`✅ Created group: ${group.name}`);
      } else {
        groupId = groupRes.rows[0].id;
        console.log(`🔄 Using existing group: ${group.name}`);
      }

      for (const permission of group.permissions) {
        const permRes = await query('SELECT id FROM permissions WHERE name = $1', [permission.name]);

        if (permRes.rows.length === 0) {
          await query(
            `INSERT INTO permissions (id, name, description, group_id)
             VALUES ($1, $2, $3, $4)`,
            [cuid(), permission.name, permission.description, groupId]
          );
          console.log(`   ✅ Created permission: ${permission.name}`);
        } else {
          console.log(`   ⏩ Skipped existing permission: ${permission.name}`);
        }
      }
    }

    console.log('✅ Permission seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error during permission seeding:', err);
    process.exit(1);
  }
}

seedPermissions();
