import { User, Role, Permission, LoginCredentials, AuthResponse } from '@/types/auth';
import { PasswordService } from '@/lib/auth/password';
import { JWTService } from '@/lib/auth/jwt';
import { PoolClient } from 'pg';
import { query, transaction } from '../database/connection';

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      // Get user with role and permissions
      const userQuery = `
        SELECT 
          u.id, u.username, u.email, u.password_hash, u.is_active, u.role_id,
          u.created_at, u.updated_at,
          r.name as role_name,
          array_agg(DISTINCT p.name) as permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE u.email = $1 AND u.is_active = true
        GROUP BY u.id, u.username, u.email, u.password_hash, u.is_active, 
                 u.role_id, u.created_at, u.updated_at, r.name
      `;

      const result = await query(userQuery, [email]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      const userRow = result.rows[0];
      
      // Verify password
      const isPasswordValid = await PasswordService.verify(password, userRow.password_hash);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Create user object
      const user: User = {
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        is_active: userRow.is_active,
        role_id: userRow.role_id,
        created_at: userRow.created_at,
        updated_at: userRow.updated_at
      };

      // Get permissions (filter out null values)
      const permissions = userRow.permissions.filter((p: string) => p !== null);

      // Generate JWT token
      const token = JWTService.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        roleId: user.role_id,
        permissions
      });

      
      // Log user activity
      await this.logUserActivity(user.id, 'LOGIN', 'USER', user.id);

      return {
        success: true,
        data: {
          user,
          token,
          permissions
        },
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  static async register(userData: {
    username: string;
    email: string;
    password: string;
    roleId?: string;
  }): Promise<AuthResponse> {
    try {
      const { username, email, password, roleId } = userData;

      // Validate password
      const passwordValidation = PasswordService.validate(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: 'Password validation failed',
          errors: passwordValidation.errors
        };
      }

      // Hash password
      const passwordHash = await PasswordService.hash(password);

      // Create user in transaction
      const user = await transaction(async (client: PoolClient) => {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1 OR username = $2',
          [email, username]
        );

        if (existingUser.rows.length > 0) {
          throw new Error('User already exists');
        }

        // Create user
        const userResult = await client.query(
          `INSERT INTO users (username, email, password_hash, role_id, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, NOW(), NOW())
           RETURNING id, username, email, is_active, role_id, created_at, updated_at`,
          [username, email, passwordHash, roleId || null]
        );

        return userResult.rows[0];
      });

      // Get user permissions
      const permissions = await this.getUserPermissions(user.id);

      // Generate JWT token
      const token = JWTService.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        roleId: user.role_id,
        permissions
      });

      // Log user activity
      await this.logUserActivity(user.id, 'REGISTER', 'USER', user.id);

      return {
        success: true,
        data: {
          user,
          token,
          permissions
        },
        message: 'Registration successful'
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  }

  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const permissionsQuery = `
        SELECT DISTINCT p.name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = $1 AND u.is_active = true AND r.is_active = true
      `;

      const result = await query(permissionsQuery, [userId]);
      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }
  }

  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      
      if (!decoded) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Get user data
      const userQuery = `
        SELECT id, username, email, is_active, role_id, created_at, updated_at
        FROM users
        WHERE id = $1 AND is_active = true
      `;

      const result = await query(userQuery, [decoded.userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = result.rows[0];
      const permissions = await this.getUserPermissions(user.id);

      const token = JWTService.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        roleId: user.role_id,
        permissions
      });

      return {
        success: true,
        data: {
          user,
          token,
          permissions
        },
        message: 'Token refreshed successfully'
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }

  static async logUserActivity(
    userId: string,
    action: string,
    entity?: string,
    entityId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO user_activity_logs (user_id, action, entity, entity_id, metadata, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [userId, action, entity || null, entityId || null, JSON.stringify(metadata || {}), ipAddress || null, userAgent || null]
      );
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }
}