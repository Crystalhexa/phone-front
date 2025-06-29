import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PERMISSIONS } from '@/lib/permissions';
import { query } from '../database/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface DecodedToken {
  id: string;
  iat?: number;
  exp?: number;
}

export function withPermission(requiredPermission: keyof typeof PERMISSIONS) {
  return (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context: any) => {
      const authHeader = req.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
      }

      const token = authHeader.replace('Bearer ', '').trim();

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        const userId = decoded.id;

        if (!userId) {
          return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
        }

        // 🔍 Get role's permissions via raw SQL
        const result = await query<{
          permissions: Record<string, boolean>;
        }>(
          `SELECT r.permissions 
           FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.id = $1`,
          [userId]
        );

        const rolePermissions = result.rows?.[0]?.permissions;

        if (!rolePermissions) {
          return NextResponse.json({ error: 'User role or permissions not found' }, { status: 403 });
        }

        if (!rolePermissions[requiredPermission]) {
          return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        // 🟢 Authorized, continue
        (req as any).user = { id: userId, permissions: rolePermissions };
        return handler(req, context);

      } catch (error) {
        console.error('Auth middleware error:', error);
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    };
  };
}
