import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { initDatabase, query } from '@/lib/database/connection';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    user: {
      userId: string;
      username: string;
      email: string;
      role_id: string;
      is_active: boolean;

      // Employee details
      employee_id?: string;
      employee_number?: string;
      employee_name?: string;

      // Branch details
      branch_id: string;
      branch_name?: string;
      branch_phone?: string;
      branch_address?: string;

      // Role details
      role_name: string;
      role_discount: number;

      // User permissions
      permissions: string[];
    }
  };
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      await initDatabase();

      const authHeader = req.headers.get('authorization');
      const cookieToken = req.cookies.get('accessToken')?.value;
      let token: string | null = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (cookieToken) {
        token = cookieToken;
      }

      if (!token) {
        return NextResponse.json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }, { status: 401 });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        const userQuery = `
          SELECT 
            u.id, 
            u.username, 
            u.email, 
            u.role_id, 
            u.is_active,
            -- Employee details
            e.id as employee_id,
            e.employee_number,
            e.name as employee_name,
            -- Branch details
            e.branch_id,
            b.name as branch_name,
            b.phone as branch_phone,
            b.address as branch_address,
            -- Role details
            r.name as role_name,
            r.discount as role_discount,
            -- User permissions
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
            LEFT JOIN employees e ON u.id = e.user_id
            LEFT JOIN branches b ON e.branch_id = b.id
          WHERE u.id = $1 AND u.is_active = true
          GROUP BY 
            u.id, u.username, u.email, u.role_id, u.is_active,
            e.id, e.employee_number, e.name, e.branch_id, b.name, b.phone, b.address,
            r.name, r.discount
        `;
        
        const userResult = await query(userQuery, [decoded.userId]);
        console.log(userResult.rows[0]);
        
        if (userResult.rows.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'User not found or inactive',
            timestamp: new Date().toISOString()
          }, { status: 401 });
        }

        const user = userResult.rows[0];
        
        // Attach user data to request
        (req as AuthenticatedRequest).user = {
          user: {
            userId: user.id,
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            is_active: user.is_active,
            employee_id: user.employee_id,
            employee_number: user.employee_number,
            employee_name: user.employee_name,
            branch_id: user.branch_id,
            branch_name: user.branch_name,
            branch_phone: user.branch_phone,
            branch_address: user.branch_address,
            role_name: user.role_name,
            role_discount: user.role_discount,
            permissions: user.permissions,
          },
        };

      } catch (tokenError: any) {
        console.error('Token verification error:', tokenError);

        if (tokenError.name === 'TokenExpiredError' || tokenError.name === 'JsonWebTokenError') {
          const response = NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 });
          response.cookies.delete('accessToken');
          return response;
        }

        return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
      }

      return handler(req as AuthenticatedRequest);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json({
        success: false,
        message: 'Authentication failed',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
  };
}

export function withPermission(requiredPermission: string) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return withAuth(async (req: AuthenticatedRequest) => {
      // Check if user DOES NOT have the required permission
      if (!req.user.user.permissions.includes(requiredPermission)) {
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