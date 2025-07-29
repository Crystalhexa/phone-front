// lib/services/roleService.ts
import { PoolClient } from 'pg';
import { Permission, CreateRoleRequest, UpdateRoleRequest, RoleWithPermissions } from '@/types/role';
import { query, transaction } from '../database/connection';
import cuid from 'cuid';

export class RoleService {
  // Get all roles with their permissions
  static async getAllRoles(): Promise<RoleWithPermissions[]> {
    const sql = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN p.id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'id', p.id,
                  'name', p.name,
                  'description', p.description,
                  'group_id', p.group_id,
                  'group', JSON_BUILD_OBJECT(
                    'id', pg.id,
                    'name', pg.name,
                    'description', pg.description
                  )
                )
              ELSE NULL
            END
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN permission_groups pg ON p.group_id = pg.id
      GROUP BY r.id, r.name, r.description, r.is_active, r.created_at, r.updated_at
      ORDER BY r.created_at DESC
    `;

    const result = await query(sql);
    return result.rows;
  }

  // Get role by ID with permissions
  static async getRoleById(id: string): Promise<RoleWithPermissions | null> {
    const sql = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN p.id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'id', p.id,
                  'name', p.name,
                  'description', p.description,
                  'group_id', p.group_id,
                  'group', JSON_BUILD_OBJECT(
                    'id', pg.id,
                    'name', pg.name,
                    'description', pg.description
                  )
                )
              ELSE NULL
            END
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN permission_groups pg ON p.group_id = pg.id
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.description, r.is_active, r.created_at, r.updated_at
    `;

    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  // Create new role with permissions
  static async createRole(roleData: CreateRoleRequest): Promise<RoleWithPermissions> {
    return await transaction(async (client: PoolClient) => {
      // Insert role
      const roleInsertSql = `
        INSERT INTO roles (id,name,discount, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3,$4,$5, NOW(), NOW())
        RETURNING id, name, description, is_active, created_at, updated_at
      `;
      const roleId = cuid(); // Generate a new UUID for the role
      const roleResult = await client.query(roleInsertSql, [
        roleId,
        roleData.name,
        roleData.discount,
        roleData.description || null,
        roleData.is_active ?? true
      ]);

      const newRole = roleResult.rows[0];

      // Insert role permissions if any
      if (roleData.permission_ids && roleData.permission_ids.length > 0) {

        for(const permissionId of roleData.permission_ids){
          const rolePermissionId = cuid(); // Generate a new UUID for each row
          await client.query(
            `INSERT INTO role_permissions (id, role_id, permission_id) VALUES ($1, $2, $3)`,
            [rolePermissionId, newRole.id, permissionId]
          );
        }
        }

      // Get the complete role with permissions
      return await this.getRoleByIdWithClient(client, newRole.id);
    });
  }

  // Update role and its permissions
  static async updateRole(id: string, roleData: UpdateRoleRequest): Promise<RoleWithPermissions | null> {
    return await transaction(async (client: PoolClient) => {
      // Check if role exists
      const existingRole = await client.query('SELECT id FROM roles WHERE id = $1', [id]);
      if (existingRole.rows.length === 0) {
        throw new Error('Role not found');
      }

      // Build dynamic SQL for role update
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (roleData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(roleData.name);
      }
      if (roleData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(roleData.description);
      }
      if (roleData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(roleData.is_active);
      }

      // Always update the updated_at field
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      if (updateFields.length > 1) { // More than just updated_at
        const updateSql = `
          UPDATE roles 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;
        await client.query(updateSql, updateValues);
      }

      // Update permissions if provided
      if (roleData.permission_ids !== undefined) {
        // Delete existing permissions
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // Insert new permissions
        if (roleData.permission_ids.length > 0) {
          for (const permissionId of roleData.permission_ids) {
            const rolePermissionId = cuid(); // Generate a new UUID for each row
            await client.query(
              `INSERT INTO role_permissions (id, role_id, permission_id) VALUES ($1, $2, $3)`,
              [rolePermissionId, id, permissionId]
            );
          }
        }

      }

      // Get the updated role with permissions
      return await this.getRoleByIdWithClient(client, id);
    });
  }

  // Delete role
  static async deleteRole(id: string): Promise<boolean> {
    return await transaction(async (client: PoolClient) => {
      // Check if role exists
      const existingRole = await client.query('SELECT id FROM roles WHERE id = $1', [id]);
      if (existingRole.rows.length === 0) {
        throw new Error('Role not found');
      }

      // Delete role permissions first (foreign key constraint)
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

      // Delete role
      const result = await client.query('DELETE FROM roles WHERE id = $1', [id]);

      return (result.rowCount ?? 0) > 0;
    });
  }

  // Get all permissions grouped by permission groups
  static async getAllPermissions(): Promise<Permission[]> {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.group_id,
        JSON_BUILD_OBJECT(
          'id', pg.id,
          'name', pg.name,
          'description', pg.description
        ) as group
      FROM permissions p
      LEFT JOIN permission_groups pg ON p.group_id = pg.id
      ORDER BY pg.name, p.name
    `;

    const result = await query(sql);
    return result.rows;
  }

  // Helper method to get role by ID within a transaction
  private static async getRoleByIdWithClient(client: PoolClient, id: string): Promise<RoleWithPermissions> {
    const sql = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN p.id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'id', p.id,
                  'name', p.name,
                  'description', p.description,
                  'group_id', p.group_id,
                  'group', JSON_BUILD_OBJECT(
                    'id', pg.id,
                    'name', pg.name,
                    'description', pg.description
                  )
                )
              ELSE NULL
            END
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN permission_groups pg ON p.group_id = pg.id
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.description, r.is_active, r.created_at, r.updated_at
    `;

    const result = await client.query(sql, [id]);
    return result.rows[0];
  }
}

function uuidv4() {
  throw new Error('Function not implemented.');
}
