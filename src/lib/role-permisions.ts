// lib/role-permissions.ts
export const ROLE_PERMISSIONS = {
  // Super Admin - Full access to everything
  SUPER_ADMIN: {
    // User Management
    "user:create": true,
    "user:read": true,
    "user:update": true,
    "user:delete": true,
    "user:activate": true,
    "user:deactivate": true,
    
    // Employee Management
    "employee:create": true,
    "employee:read": true,
    "employee:update": true,
    "employee:delete": true,
    "employee:view_salary": true,
    "employee:manage_all": true,
    
    // Role Management
    "role:create": true,
    "role:read": true,
    "role:update": true,
    "role:delete": true,
    "role:assign": true,
    
    // Purchase Orders
    "purchase_order:create": true,
    "purchase_order:read": true,
    "purchase_order:update": true,
    "purchase_order:delete": true,
    "purchase_order:approve": true,
    "purchase_order:reject": true,
    "purchase_order:view_all": true,
    
    // Stock Management
    "stock:read": true,
    "stock:create": true,
    "stock:update": true,
    "stock:delete": true,
    "stock:transfer": true,
    "stock:adjust": true,
    "stock:approve_transfer": true,
    "stock:view_all_locations": true,
    
    // Deliveries
    "delivery:create": true,
    "delivery:read": true,
    "delivery:update": true,
    "delivery:delete": true,
    "delivery:dispatch": true,
    "delivery:receive": true,
    
    // Reports & Analytics
    "reports:view": true,
    "reports:export": true,
    "reports:financial": true,
    "reports:inventory": true,
    "reports:employee": true,
    
    // System Management
    "system:configure": true,
    "system:backup": true,
    "system:logs": true,
    "notifications:manage": true
  },

  // Admin - Administrative access with some restrictions
  ADMIN: {
    // User Management
    "user:create": true,
    "user:read": true,
    "user:update": true,
    "user:delete": false, // Cannot delete users
    "user:activate": true,
    "user:deactivate": true,
    
    // Employee Management
    "employee:create": true,
    "employee:read": true,
    "employee:update": true,
    "employee:delete": false, // Cannot delete employees
    "employee:view_salary": true,
    "employee:manage_all": true,
    
    // Role Management
    "role:create": false, // Cannot create roles
    "role:read": true,
    "role:update": false, // Cannot modify roles
    "role:delete": false,
    "role:assign": true, // Can assign existing roles
    
    // Purchase Orders
    "purchase_order:create": true,
    "purchase_order:read": true,
    "purchase_order:update": true,
    "purchase_order:delete": true,
    "purchase_order:approve": true,
    "purchase_order:reject": true,
    "purchase_order:view_all": true,
    
    // Stock Management
    "stock:read": true,
    "stock:create": true,
    "stock:update": true,
    "stock:delete": false,
    "stock:transfer": true,
    "stock:adjust": true,
    "stock:approve_transfer": true,
    "stock:view_all_locations": true,
    
    // Deliveries
    "delivery:create": true,
    "delivery:read": true,
    "delivery:update": true,
    "delivery:delete": false,
    "delivery:dispatch": true,
    "delivery:receive": true,
    
    // Reports & Analytics
    "reports:view": true,
    "reports:export": true,
    "reports:financial": true,
    "reports:inventory": true,
    "reports:employee": true,
    
    // System Management
    "system:configure": false,
    "system:backup": false,
    "system:logs": true,
    "notifications:manage": true
  },

  // Manager - Department/Team management
  MANAGER: {
    // User Management
    "user:create": false,
    "user:read": true,
    "user:update": false,
    "user:delete": false,
    
    // Employee Management
    "employee:create": true,
    "employee:read": true,
    "employee:update": true,
    "employee:delete": false,
    "employee:view_salary": false, // Cannot view salary info
    "employee:manage_department": true, // Only their department
    
    // Role Management
    "role:create": false,
    "role:read": true,
    "role:update": false,
    "role:delete": false,
    "role:assign": false,
    
    // Purchase Orders
    "purchase_order:create": true,
    "purchase_order:read": true,
    "purchase_order:update": true,
    "purchase_order:delete": false,
    "purchase_order:approve": true, // Can approve within limits
    "purchase_order:reject": false,
    "purchase_order:view_department": true, // Only department POs
    
    // Stock Management
    "stock:read": true,
    "stock:create": false,
    "stock:update": false,
    "stock:delete": false,
    "stock:transfer": true,
    "stock:adjust": false,
    "stock:approve_transfer": true,
    "stock:view_department": true,
    
    // Deliveries
    "delivery:create": false,
    "delivery:read": true,
    "delivery:update": true,
    "delivery:delete": false,
    "delivery:dispatch": true,
    "delivery:receive": true,
    
    // Reports & Analytics
    "reports:view": true,
    "reports:export": true,
    "reports:financial": false,
    "reports:inventory": true,
    "reports:employee": true, // Only their department
    
    // System Management
    "notifications:view": true
  },

  // Supervisor - Team lead level access
  SUPERVISOR: {
    // User Management
    "user:read": true,
    
    // Employee Management
    "employee:read": true,
    "employee:update": false,
    "employee:view_team": true, // Only their team
    
    // Purchase Orders
    "purchase_order:create": true,
    "purchase_order:read": true,
    "purchase_order:update": true,
    "purchase_order:delete": false,
    "purchase_order:approve": false,
    "purchase_order:view_team": true,
    
    // Stock Management
    "stock:read": true,
    "stock:transfer": true,
    "stock:view_assigned": true,
    
    // Deliveries
    "delivery:read": true,
    "delivery:update": true,
    "delivery:dispatch": true,
    "delivery:receive": true,
    
    // Reports
    "reports:view": true,
    "reports:inventory": true,
    
    "notifications:view": true
  },

  // Employee - Basic user access
  EMPLOYEE: {
    // User Management
    "user:read": false,
    
    // Employee Management
    "employee:read": false,
    "employee:view_own": true, // Only their own profile
    "employee:update_own": true, // Only their own profile
    
    // Purchase Orders
    "purchase_order:create": false,
    "purchase_order:read": false,
    "purchase_order:view_own": true, // Only POs they created
    
    // Stock Management
    "stock:read": true,
    "stock:view_assigned": true,
    
    // Deliveries
    "delivery:read": false,
    "delivery:view_assigned": true,
    
    // Basic access
    "notifications:view": true
  },

  // Warehouse Manager - Stock and inventory focused
  WAREHOUSE_MANAGER: {
    // Employee Management
    "employee:read": true,
    "employee:view_warehouse": true,
    
    // Purchase Orders
    "purchase_order:read": true,
    "purchase_order:update": true,
    "purchase_order:view_all": true,
    
    // Stock Management - Full stock control
    "stock:read": true,
    "stock:create": true,
    "stock:update": true,
    "stock:delete": false,
    "stock:transfer": true,
    "stock:adjust": true,
    "stock:approve_transfer": true,
    "stock:view_all_locations": true,
    "stock:audit": true,
    
    // Deliveries - Full delivery management
    "delivery:create": true,
    "delivery:read": true,
    "delivery:update": true,
    "delivery:delete": false,
    "delivery:dispatch": true,
    "delivery:receive": true,
    "delivery:track": true,
    
    // Reports
    "reports:view": true,
    "reports:export": true,
    "reports:inventory": true,
    
    "notifications:view": true
  },

  // Finance Manager - Financial operations focused
  FINANCE_MANAGER: {
    // User Management
    "user:read": true,
    
    // Employee Management
    "employee:read": true,
    "employee:view_salary": true,
    
    // Purchase Orders - Financial approval focus
    "purchase_order:create": false,
    "purchase_order:read": true,
    "purchase_order:update": false,
    "purchase_order:delete": false,
    "purchase_order:approve": true,
    "purchase_order:reject": true,
    "purchase_order:view_all": true,
    "purchase_order:financial_approve": true,
    
    // Stock Management
    "stock:read": true,
    "stock:view_all_locations": true,
    
    // Reports - Full financial reporting
    "reports:view": true,
    "reports:export": true,
    "reports:financial": true,
    "reports:inventory": true,
    "reports:employee": true,
    "reports:purchase": true,
    
    "notifications:view": true
  },

  // Store Keeper - Basic stock operations
  STORE_KEEPER: {
    // Stock Management - Basic operations
    "stock:read": true,
    "stock:update": true,
    "stock:transfer": false,
    "stock:adjust": false,
    "stock:view_assigned": true,
    
    // Deliveries
    "delivery:read": true,
    "delivery:update": true,
    "delivery:receive": true,
    
    // Basic reporting
    "reports:view": true,
    "reports:inventory": true,
    
    "notifications:view": true
  }
};

// Helper function to create role with permissions
export async function createRoleWithPermissions(
  name: string,
  description: string,
  permissionSet: keyof typeof ROLE_PERMISSIONS
) {
  const permissions = ROLE_PERMISSIONS[permissionSet];
  
  return {
    name,
    description,
    permissions,
    is_active: true
  };
}

// Function to seed default roles
export const DEFAULT_ROLES = [
  {
    name: "Super Admin",
    description: "Full system access with all permissions",
    permissions: ROLE_PERMISSIONS.SUPER_ADMIN
  },
  {
    name: "Admin",
    description: "Administrative access with most permissions",
    permissions: ROLE_PERMISSIONS.ADMIN
  },
  {
    name: "Manager",
    description: "Department manager with team management capabilities",
    permissions: ROLE_PERMISSIONS.MANAGER
  },
  {
    name: "Supervisor",
    description: "Team supervisor with limited management access",
    permissions: ROLE_PERMISSIONS.SUPERVISOR
  },
  {
    name: "Employee",
    description: "Basic employee access",
    permissions: ROLE_PERMISSIONS.EMPLOYEE
  },
  {
    name: "Warehouse Manager",
    description: "Full warehouse and inventory management",
    permissions: ROLE_PERMISSIONS.WAREHOUSE_MANAGER
  },
  {
    name: "Finance Manager",
    description: "Financial operations and reporting",
    permissions: ROLE_PERMISSIONS.FINANCE_MANAGER
  },
  {
    name: "Store Keeper",
    description: "Basic stock and delivery operations",
    permissions: ROLE_PERMISSIONS.STORE_KEEPER
  }
];
