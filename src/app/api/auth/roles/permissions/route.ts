import { NextRequest, NextResponse } from 'next/server';
import { RoleService } from '@/lib/services/roleService';
import { ApiResponse, initDatabase } from '@/lib/database/connection';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();

    const permissions = await RoleService.getAllPermissions();

    return NextResponse.json({
      success: true,
      data: permissions,
      message: 'Permissions retrieved successfully',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
  } catch (error: any) {
    console.error('GET /permissions API Error:', error);

    return NextResponse.json(
      {
        success: false,
        data: null,
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
