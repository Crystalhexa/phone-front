import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './database/connection';

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roleId?: string;
  permissions?: Record<string, any>;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return null;
    }
  }

  static async getUserFromToken(token: string) {
    const payload = this.verifyToken(token);
    if (!payload) return null;

    const sql = `
      SELECT 
        u.id AS "id",
        u.username,
        u.email,
        u.role_id AS "roleId",
        u.is_active,
        r.name AS "roleName",
        r.permissions AS "rolePermissions",
        e.id AS "employeeId",
        e.first_name,
        e.last_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE u.id = $1
      LIMIT 1
    `;

    const result = await query(sql, [payload.userId]);
    return result.rows[0] || null;
  }
}
