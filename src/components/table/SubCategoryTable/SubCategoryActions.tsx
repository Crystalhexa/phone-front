import { useState } from 'react';
import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { useDeleteSubCategoryMutation } from '@/state/api';
import { TableAction } from "./SubCategoryColumn";
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";
import {  EditSubcategory, Subcategory } from '@/types/category';

export const useSubCategoryActions = () => {
  // Dialog state management
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedsubCategory, setSelectedSubcategory] = useState<EditSubcategory>();

  // Mutation hooks
  const [deleteSubCategory, { isLoading: isDeleting }] = useDeleteSubCategoryMutation();


  const handleEdit = (subcategory: EditSubcategory) => {
    setSelectedSubcategory(subcategory);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (subcategory: Subcategory) => {
    if (!confirm(`Are you sure you want to delete "${subcategory}"?`)) {
      return;
    }
    try {
      console.log(subcategory)
      await deleteSubCategory(subcategory.subcategory_id).unwrap();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete category');
    }
  };



  // Define table actions
  const tableActions: TableAction[] = [
    {
      label: "Edit sub Category",
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
        triggerLabel="Edit sub category" // This won't be used since we're controlling the dialog
        title={`Edit sub category: ${selectedsubCategory?.name}`}
        description="Update Sub category information"
        formType="subcategory"
        formProps={{
          categoryId: selectedsubCategory?.id,
         subcategoryId: selectedsubCategory?.id,
          mode: 'edit', 
          showExport: true,
          isEdit: true, 
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
    selectedsubCategory,
  };
};