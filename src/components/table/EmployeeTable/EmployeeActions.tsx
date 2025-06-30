import { useState } from 'react';
import { Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";
import { Brand, useDeleteBrandMutation } from '@/state/brand';
import { TableAction } from './EmployeeColumn';
import { redirect } from 'next/navigation';
import { CreateUserRequest } from '@/types/user';

export const useEmployeeActions = () => {
  // Dialog state management
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Mutation hooks
  const [deleteBrand, { isLoading: isDeleting }] = useDeleteBrandMutation();

  const handleEdit = (employee: CreateUserRequest) => {
    
    redirect(`/dashboard/user/employees/update/${employee.user_id}`);
  };

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      return;
    }
    try {
      await deleteBrand(brand.id).unwrap();
      toast.success('Brand deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete brand');
    }
  };



  // Define table actions
  const tableActions: TableAction[] = [

    {
      label: "Edit Brand",
      icon: Edit,
      onClick: handleEdit,
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      onClick: handleDelete,
    },
  ];

  return {
    tableActions,
    isDeleting,
    isViewDialogOpen,
    isEditDialogOpen,
    selectedBrand,
  };
};