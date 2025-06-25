import { useState } from 'react';
import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { useDeleteCategoryMutation } from '@/state/api';
import { TableAction } from "./CategoryColumn";
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";
import { Category } from '@/types/category';

export const useCategoryActions = () => {
  // Dialog state management
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Mutation hooks
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  // Action handlers
  const handleView = (category: Category) => {
    setSelectedCategory(category);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }
    try {
      console.log(category)
      await deleteCategory(category.id).unwrap();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete category');
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
      label: "Edit Category",
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
        title={`Edit Category: ${selectedCategory?.name}`}
        description="Update category information"
        formType="category"
        formProps={{
         categoryId: selectedCategory?.id,
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
    selectedCategory,
  };
};