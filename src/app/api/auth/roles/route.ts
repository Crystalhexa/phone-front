import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "@/lib/services/roleService";
import { CreateRoleRequest } from "@/types/role";
import { ApiResponse, initDatabase } from "@/lib/database/connection";

export async function GET(req: NextRequest) {
  await initDatabase();
  const roles = await RoleService.getAllRoles();

  return NextResponse.json({
    success: true,
    data: roles,
    message: "Roles retrieved successfully",
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
}

export async function POST(req: NextRequest) {
  await initDatabase();
  const body = await req.json();
  const { name,discount, description, is_active, permission_ids }: CreateRoleRequest = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Role name is required",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(permission_ids)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Permission IDs must be an array",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  try {
    const newRole = await RoleService.createRole({
      name: name.trim(),
      discount:discount,
      description: description?.trim(),
      is_active: is_active ?? true,
      permission_ids,
    });

    return NextResponse.json(
      {
        success: true,
        data: newRole,
        message: "Role created successfully",
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Role name already exists",
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }
    console.error("POST /roles error", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
