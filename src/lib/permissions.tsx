export const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Employee Management
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_UPDATE: 'employee:update',
  EMPLOYEE_DELETE: 'employee:delete',
  
  // Role Management
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  
  // Purchase Orders
  PO_CREATE: 'purchase_order:create',
  PO_READ: 'purchase_order:read',
  PO_UPDATE: 'purchase_order:update',
  PO_DELETE: 'purchase_order:delete',
  PO_APPROVE: 'purchase_order:approve',
  
  // Stock Management
  STOCK_READ: 'stock:read',
  STOCK_TRANSFER: 'stock:transfer',
  STOCK_ADJUST: 'stock:adjust',
  
  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export class PermissionService {
  static hasPermission(userPermissions: Record<string, any>, permission: Permission): boolean {
    return userPermissions[permission] === true;
  }

  static hasAnyPermission(userPermissions: Record<string, any>, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userPermissions, permission));
  }

  static hasAllPermissions(userPermissions: Record<string, any>, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userPermissions, permission));
  }
}