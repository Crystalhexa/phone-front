import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { initDatabase } from '@/lib/database/connection';

export async function POST(req: NextRequest) {
  await initDatabase();

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const result = await AuthService.login({ email, password });

    if (result.success) {
      // Create response with token cookie
      const response = NextResponse.json(
        {
          ...result,
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      );

      // Set HTTP-only cookie for additional security
      response.cookies.set({
        name: 'token',
        value: result.data?.token || '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 604800, // 7 days
        path: '/',
      });

      // Log activity with IP and user agent
      const forwardedFor = req.headers.get('x-forwarded-for');
      const userAgent = req.headers.get('user-agent');
      const ip = forwardedFor || 'unknown';

      await AuthService.logUserActivity(
        result.data!.user.id,
        'LOGIN',
        'USER',
        result.data!.user.id,
        { success: true },
        ip,
        userAgent || undefined
      );

      return response;
    }

    return NextResponse.json(
      {
        ...result,
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    );

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

