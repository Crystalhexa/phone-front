import { NextRequest, NextResponse } from 'next/server';
import { RoleService } from '@/lib/services/roleService';
import { UpdateRoleRequest } from '@/types/role';
import { ApiResponse, initDatabase } from '@/lib/database/connection';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  try {
    await initDatabase();
    const id = (await params).id;

    const role = await RoleService.getRoleById(id);
    if (!role) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Role not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: role,
      message: 'Role retrieved successfully',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
  } catch (error: any) {
    console.error('GET /roles/[id] Error:', error);
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  try {
    await initDatabase();
    const id = (await params).id;
    const body = (await req.json()) as UpdateRoleRequest;

    const updatedRole = await RoleService.updateRole(id, body);
    if (!updatedRole) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Role not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
  } catch (error: any) {
    if (error.message.includes('duplicate key')) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Role name already exists',
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    console.error('PUT /roles/[id] Error:', error);
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

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  try {
    await initDatabase();
    const id = (await params).id;

    const deleted = await RoleService.deleteRole(id);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Role not found',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Role deleted successfully',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
  } catch (error: any) {
    console.error('DELETE /roles/[id] Error:', error);
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
