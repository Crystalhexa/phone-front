import { useState } from 'react';
import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { TableAction } from "./BranchColumn";
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";
import { useRouter } from 'next/navigation';
import { Branch } from '@/types/branch';
import { useDeleteBranchMutation } from '@/state/brnach';

export const useBranchActions = () => {
    const router = useRouter()
  // Dialog state management
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Mutation hooks
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

  // Action handlers
  const handleView = (brnach: Branch) => {
    setSelectedBranch(brnach);
    router.push(`/dashboard/products/categories/view/${brnach.id}`)
  };

  const handleEdit = (brnach: Branch) => {
    setSelectedBranch(brnach);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (brnach: Branch) => {
    if (!confirm(`Are you sure you want to delete "${brnach.name}"?`)) {
      return;
    }
    try {
      console.log(brnach)
      await deleteBranch(brnach.id).unwrap();
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
        title={`Edit Branch: ${selectedBranch?.name}`}
        description="Update Branch information"
        formType="branch"
        formProps={{
         branchId: selectedBranch?.id,
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
    selectedBranch,
  };
};