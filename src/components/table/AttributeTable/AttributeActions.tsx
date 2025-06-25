import { useState } from 'react';
import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { Category, useDeleteCategoryMutation } from '@/state/api';
import { TableAction } from "./AttributeColumn";
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";
import { Attribute } from '@/state/attribute';

export const useAttributeActions = () => {
  // Dialog state management
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);

  // Mutation hooks
  const [deleteAttribute, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  // Action handlers
  const handleView = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (attribute: Attribute) => {
    console.log("Editing attribute:", attribute);
    setSelectedAttribute(attribute);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (attribute: Attribute) => {
    if (!confirm(`Are you sure you want to delete "${attribute.name}"?`)) {
      return;
    }
    try {
      await deleteAttribute(attribute.id).unwrap();
      toast.success('Attribute deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete attribute');
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
        triggerLabel="Edit Attribute" // This won't be used since we're controlling the dialog
        title={`Edit Attribute: ${selectedAttribute?.name}`}
        description="Update attribute information"
        formType="attribute"
        formProps={{
         attributeId: selectedAttribute?.id,
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
    selectedAttribute,
  };
};