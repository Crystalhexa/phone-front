"use client"
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Shield, Loader2, AlertCircle } from 'lucide-react';
import { RoleWithPermissions, Permission } from '@/types/role';
import { useCreateRoleMutation, useDeleteRoleMutation, useGetAllPermissionsQuery, useGetAllRolesQuery, useUpdateRoleMutation } from '@/state/role';

interface RoleFormData {
  name: string;
  discount: number;
  description: string;
  is_active: boolean;
  permission_ids: string[];
}

interface RoleDialogProps {
  role?: RoleWithPermissions;
  permissions: Permission[];
  onSave: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  loading: boolean;
}

const RoleDialog: React.FC<RoleDialogProps> = ({
  role,
  permissions,
  onSave,
  onCancel,
  isOpen,
  loading
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || '',
    discount: role?.discount || 0,
    description: role?.description || '',
    is_active: role?.is_active ?? true,
    permission_ids: role?.permissions?.map(p => p.id) || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        discount: role.discount || 0,
        description: role.description || '',
        is_active: role.is_active ?? true,
        permission_ids: role.permissions?.map(p => p.id) || []
      });
    } else {
      setFormData({
        name: '',
        discount: 0,
        description: '',
        is_active: true,
        permission_ids: []
      });
    }
    setErrors({});
  }, [role, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (formData.permission_ids.length === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: checked
        ? [...prev.permission_ids, permissionId]
        : prev.permission_ids.filter(id => id !== permissionId)
    }));
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const groupName = permission.group?.name || 'Other';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogDescription>
            {role ? 'Modify role details and permissions' : 'Create a new role and assign permissions'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter role name"
                className={errors.name ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="discount">Role discount</Label>
              <Input
                id="discount"
                type='number'
                value={formData.discount }
                onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                placeholder="Enter role discount"
                className={errors.name ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              {/* <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter role description"
                rows={3}
                disabled={loading}
              /> */}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                disabled={loading}
              />
              <Label htmlFor="is_active">Active Role</Label>
            </div>

            <div>
              <Label className="text-base font-medium">Permissions</Label>
              {errors.permissions && <p className="text-sm text-red-500 mt-1">{errors.permissions}</p>}

              <div className="mt-3 space-y-4 max-h-64 overflow-y-auto border rounded-md p-3">
                {Object.entries(groupedPermissions).map(([groupName, groupPermissions]) => (
                  <div key={groupName} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 border-b pb-1">{groupName}</h4>
                    <div className="space-y-2 pl-2">
                      {groupPermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={formData.permission_ids.includes(permission.id)}
                            onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                            disabled={loading}
                          />
                          <Label htmlFor={permission.id} className="text-sm font-normal cursor-pointer">
                            <span className="font-medium">{permission.name}</span>
                            {permission.description && (
                              <span className="text-gray-500 ml-2">- {permission.description}</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {role ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function RoleManagementWithAPI() {
  const { data: rolesData, isLoading: loadingRoles, error: rolesError, refetch: refetchRoles } = useGetAllRolesQuery();
  const { data: permissionsData, isLoading: loadingPermissions } = useGetAllPermissionsQuery();
  const [createRole, { isLoading: creating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: deleting }] = useDeleteRoleMutation();

  const roles = rolesData?.data || [];
  const permissions = permissionsData?.data || [];
  const loading = loadingRoles || loadingPermissions;
  const error = rolesError ? 'Failed to load roles.' : null;


  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreateRole = () => {
    setSelectedRole(undefined);
    setIsDialogOpen(true);
  };

  const handleEditRole = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setIsDialogOpen(true);
  };

  const handleSaveRole = async (data: RoleFormData) => {
    setActionLoading(true);
    try {
      if (selectedRole) {
        await updateRole({ id: selectedRole.id, body: data }).unwrap();
      } else {
        await createRole(data).unwrap();
      }
      setIsDialogOpen(false);
      setSelectedRole(undefined);
      refetchRoles(); // optional, but ensures sync
    } catch (err) {
      console.error('Error saving role:', err);
    } finally {
      setActionLoading(false);
    }
  };


  const handleDeleteRole = async (roleId: string) => {
    setActionLoading(true);
    try {
      await deleteRole(roleId).unwrap();
    } catch (err) {
      console.error('Error deleting role:', err);
    } finally {
      setActionLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && roles.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading roles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>
        <Button
          onClick={handleCreateRole}
          className="flex items-center gap-2"
          disabled={loading || actionLoading}
        >
          <Plus className="w-4 h-4" />
          Create Role
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => refetchRoles()}
            >
              Retry
            </Button>

          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Roles Overview
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          </CardTitle>
          <CardDescription>
            Manage system roles and their associated permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No roles found. Create your first role to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {role.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.is_active ? "default" : "secondary"}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((permission) => (
                            <Badge key={permission.id} variant="outline" className="text-xs">
                              {permission.name}
                            </Badge>
                          ))}
                          {role.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.permissions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(role.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            disabled={loading || actionLoading}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || actionLoading}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the role "{role.name}"?
                                  This action cannot be undone and will remove all associated permissions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRole(role.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={actionLoading}
                                >
                                  {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <RoleDialog
        role={selectedRole}
        permissions={permissions}
        onSave={handleSaveRole}
        onCancel={() => setIsDialogOpen(false)}
        isOpen={isDialogOpen}
        loading={actionLoading}
      />

    </div>
  );
}