export const permissionGroups = [
  {
    name: 'User Management',
    permissions: [
      { name: 'create_user', description: 'Create a user' },
      { name: 'view_users', description: 'Read user data' },
      { name: 'update_user', description: 'Update a user' },
      { name: 'delete_user', description: 'Delete a user' }
    ]
  },
  {
    name: 'Store Permissions',
    permissions: [
      { name: 'create_store', description: 'Create a store' },
      { name: 'read_store', description: 'Read store data' },
      { name: 'update_store', description: 'Update a store' },
      { name: 'delete_store', description: 'Delete a store' }
    ]
  }
  ,
  {
    name: 'Customer Permissions',
    permissions: [
      { name: 'create_customer', description: 'Add new customer profiles' },
      { name: 'delete_customer', description: 'Remove customer profiles' },
      { name: 'edit_customer', description: 'Update customer profiles' },
      { name: 'delete_customer', description: 'Delete customer profiles' }
    ]
  },
  {
    name: 'Inventory Management',
    permissions: [
      { name: 'adjust_stock', description: 'Add stock levels and invnentory counts' },
      { name: 'create_product', description: 'Add new products to inventory' },
      { name: 'delete_product', description: 'Remove product from inventory' },
      { name: 'edite_product', description: 'Edit existing product information' },
      { name: 'view_stock', description: 'View current stock level and invnetory' }
    ]
  },
  {
    name: 'Reports & Analytics',
    permissions: [
      { name: 'export_reports', description: 'Export reports to various formats' },
      { name: 'view_financial_reports', description: 'View financial reports and summaries' },
      { name: 'view_inventory_reports', description: 'View inventory reports and analytics' },
      { name: 'view_sales_report', description: 'View sales reports and analytics' }
    ]
  },
    {
    name: 'Sales Management',
    permissions: [
      { name: 'apply_discount', description: 'Apply discount to sales' },
      { name: 'create_sale', description: 'Create new sales transections' },
      { name: 'refund_sales', description: 'process refund and returns' },
      { name: 'view_sales', description: 'View sales transection and history' }
    ]
  },
      {
    name: 'System administrations',
    permissions: [
      { name: 'backup_restore', description: 'Perform system backup and restore operations' },
      { name: 'manage_integrations', description: 'Manage thire party intergrations' },
      { name: 'system_settings', description: 'Access and modify system settings' },
      { name: 'view_logs', description: 'View system logs and audit trials' }
    ]
  },
];
