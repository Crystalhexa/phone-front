export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  group_id: string;
  group?: PermissionGroup;
}

export interface Role {
  id: string;
  name: string;
  discount?: number; // Added discount field
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface CreateRoleRequest {
  name: string;
  discount:number;
  description?: string;
  is_active?: boolean;
  permission_ids: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  discount?: number; // Added discount field
  description?: string;
  is_active?: boolean;
  permission_ids?: string[];
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}
export interface Props {
  userId?: string
  isEdit?: boolean
}
export interface Role  {
  id: string
  name: string
}

export interface RolesApiResponse {
  success: boolean
  message: string
  data: Role[]
}