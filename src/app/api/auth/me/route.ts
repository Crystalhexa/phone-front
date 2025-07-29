import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(async (authedReq: NextRequest & { user: any }) => {
    try {

      return NextResponse.json(
        {
          success: true,
          data: authedReq.user,
          message: 'User profile retrieved successfully',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[AUTH_ME_ERROR]', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  })(req);
}
