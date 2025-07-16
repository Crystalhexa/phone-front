import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/database/connection';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    userId: string;
    username: string;
    email: string;
    roleId: string;
    permissions: string[];
  };
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from Authorization header or cookie
      const authHeader = req.headers.get('authorization');
      const cookieToken = req.cookies.get('token')?.value;
      
      let token: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (cookieToken) {
        token = cookieToken;
      }

      if (!token) {
        return NextResponse.json(
          {
            success: false,
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        );
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Get user with permissions
      const userQuery = `
        SELECT u.id, u.username, u.email, u.role_id, u.is_active,
               COALESCE(
                 json_agg(
                   DISTINCT p.name
                 ) FILTER (WHERE p.name IS NOT NULL), 
                 '[]'::json
               ) as permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = $1 AND u.is_active = true
        GROUP BY u.id, u.username, u.email, u.role_id, u.is_active
      `;

      const userResult = await query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'User not found or inactive',
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];
      
      // Attach user to request
      (req as AuthenticatedRequest).user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        roleId: user.role_id,
        permissions: user.permissions
      };

      return handler(req as AuthenticatedRequest);

    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      );
    }
  };
}

export function withPermission(requiredPermission: string) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!req.user.permissions.includes(requiredPermission)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Insufficient permissions',
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        );
      }

      return handler(req);
    });
  };
}