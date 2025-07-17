export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  role_id?: string;
  created_at: Date;
  updated_at: Date;
  avatar?:string
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  group_id: string;
  group: PermissionGroup;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roleId?: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    permissions: string[];
  };
  message: string;
  errors?: string[];
}