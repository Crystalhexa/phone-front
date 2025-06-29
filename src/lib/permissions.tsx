// lib/permissions.ts

export const PERMISSIONS = {
  // User Management Permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',
  USER_PROFILE_UPDATE: 'user:profile:update',
  USER_PASSWORD_RESET: 'user:password:reset',
  USER_ACTIVATE: 'user:activate',
  USER_DEACTIVATE: 'user:deactivate',

  // Role Management Permissions
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  ROLE_LIST: 'role:list',
  ROLE_ASSIGN: 'role:assign',
  ROLE_REVOKE: 'role:revoke',

  // Permission Management Permissions
  PERMISSION_CREATE: 'permission:create',
  PERMISSION_READ: 'permission:read',
  PERMISSION_UPDATE: 'permission:update',
  PERMISSION_DELETE: 'permission:delete',
  PERMISSION_LIST: 'permission:list',
  PERMISSION_ASSIGN: 'permission:assign',
  PERMISSION_REVOKE: 'permission:revoke',

  // Content Management Permissions
  CONTENT_CREATE: 'content:create',
  CONTENT_READ: 'content:read',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  CONTENT_LIST: 'content:list',
  CONTENT_PUBLISH: 'content:publish',
  CONTENT_UNPUBLISH: 'content:unpublish',
  CONTENT_MODERATE: 'content:moderate',

  // System Administration Permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_RESTORE: 'system:restore',
  SYSTEM_MAINTENANCE: 'system:maintenance',

  // Analytics and Reporting Permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  REPORTS_CREATE: 'reports:create',
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',

  // Financial Permissions
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  FINANCE_APPROVE: 'finance:approve',
  FINANCE_AUDIT: 'finance:audit',

  // Organization Management Permissions
  ORG_CREATE: 'org:create',
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',
  ORG_SETTINGS: 'org:settings',

  // Project Management Permissions
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_MANAGE: 'project:manage',

  // API and Integration Permissions
  API_READ: 'api:read',
  API_WRITE: 'api:write',
  API_ADMIN: 'api:admin',
  INTEGRATION_MANAGE: 'integration:manage',

  // Notification Permissions
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_MANAGE: 'notification:manage',
  NOTIFICATION_BROADCAST: 'notification:broadcast',

  // Security Permissions
  SECURITY_AUDIT: 'security:audit',
  SECURITY_MONITOR: 'security:monitor',
  SECURITY_CONFIGURE: 'security:configure',

  // File Management Permissions
  FILE_UPLOAD: 'file:upload',
  FILE_DOWNLOAD: 'file:download',
  FILE_DELETE: 'file:delete',
  FILE_MANAGE: 'file:manage',

  // Dashboard and UI Permissions
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_ADMIN: 'dashboard:admin',
  UI_CUSTOMIZE: 'ui:customize',
} as const;


export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
