import { useState } from 'react';
import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { Category, useDeleteCategoryMutation } from '@/state/api';
import { TableAction } from "./BrandColumn";
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";
import { Brand, useDeleteBrandMutation } from '@/state/brand';

export const useBrandActions = () => {
  // Dialog state management
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Mutation hooks
  const [deleteBrand, { isLoading: isDeleting }] = useDeleteBrandMutation();

  // Action handlers
  const handleView = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      return;
    }
    try {
      await deleteBrand(brand.brand_id).unwrap();
      toast.success('Brand deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete brand');
    }
  };



  // Define table actions
  const tableActions: TableAction[] = [
    {
      label: "View Details",
      icon: Eye,
      onClick: handleView,
    },
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


  const EditDialog = () => (
    isEditDialogOpen ? (
      <ReusableDialogForm
        showTrigger={false}
        triggerLabel="Edit Category" // This won't be used since we're controlling the dialog
        title={`Edit Brand: ${selectedBrand?.name}`}
        description="Update brand information"
        formType="brand"
        formProps={{
          brandId: selectedBrand?.brand_id,
          mode: 'edit', // Read-only mode
          showExport: true,
          isEdit: true, // Read-only mode
          onClose: () => setIsViewDialogOpen(false)
        }}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    ) : null
  );

  return {
    tableActions,
    isDeleting,
    EditDialog,
    isViewDialogOpen,
    isEditDialogOpen,
    selectedBrand,
  };
};