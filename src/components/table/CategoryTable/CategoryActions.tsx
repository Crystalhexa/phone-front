import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { Category, useDeleteCategoryMutation } from '@/state/api';
import { TableAction } from "./CategoryColumn";

export const useCategoryActions = () => {
  // Mutation hooks
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  // Action handlers
  const handleView = (category: Category) => {
    console.log('View category:', category);
    // Navigate to category details page
    // router.push(`/categories/${category.category_id}`);
  };

  const handleEdit = (category: Category) => {
    console.log('Edit category:', category);
    // Navigate to edit page or open modal
    // router.push(`/categories/${category.category_id}/edit`);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await deleteCategory(category.category_id).unwrap();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const handleAddCategory = () => {
    console.log('Add new category');
    // Navigate to create page or open modal
    // router.push('/categories/new');
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

  return {
    tableActions,
    handleAddCategory,
    isDeleting,
  };
};