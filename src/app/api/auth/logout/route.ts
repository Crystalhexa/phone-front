import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { initDatabase } from '@/lib/database/connection';
import { withAuth } from '@/middleware/auth';

export async function POST(req: NextRequest) {
  return withAuth(async (req: NextRequest & { user: any }) => {
    await initDatabase();

    try {
      // Log logout activity
      const forwardedFor = req.headers.get('x-forwarded-for');
      const userAgent = req.headers.get('user-agent');
      const ip = forwardedFor || 'unknown';

      await AuthService.logUserActivity(
        req.user.userId,
        'LOGOUT',
        'USER',
        req.user.userId,
        { success: true },
        ip,
        userAgent || undefined
      );

      // Create response and clear cookie
      const response = NextResponse.json(
        {
          success: true,
          message: 'Logout successful',
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      );

      // Clear cookie
      response.cookies.set({
        name: 'accessToken',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });

      return response;

    } catch (error) {
      console.error('Logout API error:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  })(req);
}