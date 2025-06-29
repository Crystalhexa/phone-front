export const permissionGroups = [
  {
    name: 'User Permissions',
    permissions: [
      { name: 'USER_CREATE', description: 'Create a user' },
      { name: 'USER_READ', description: 'Read user data' },
      { name: 'USER_UPDATE', description: 'Update a user' },
      { name: 'USER_DELETE', description: 'Delete a user' }
    ]
  },
  {
    name: 'Store Permissions',
    permissions: [
      { name: 'STORE_CREATE', description: 'Create a store' },
      { name: 'STORE_READ', description: 'Read store data' },
      { name: 'STORE_UPDATE', description: 'Update a store' },
      { name: 'STORE_DELETE', description: 'Delete a store' }
    ]
  }
];
