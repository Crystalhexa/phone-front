import { useState } from 'react';
import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { redirect } from 'next/navigation';
import { useDeleteSupplierMutation } from '@/state/supplier';
import { Supplier } from '@/types/supplier';
import { TableAction } from './SupplierColumn';

export const useSupplierActions = () => {
  // Dialog state management
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Mutation hooks
  const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

  // Action handlers
  const handleView = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    redirect(`/dashboard/orders/purchase/suppliers/update/${supplier.id}`);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete "${supplier.name}"?`)) {
      return;
    }
    try {
      await deleteSupplier(supplier.id).unwrap();
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


//   const EditDialog = () => (
//     isEditDialogOpen ? (
//       <ReusableDialogForm
//         showTrigger={false}
//         triggerLabel="Edit Category" // This won't be used since we're controlling the dialog
//         title={`Edit Brand: ${selectedBrand?.name}`}
//         description="Update brand information"
//         formType="brand"
//         formProps={{
//           brandId: selectedBrand?.id,
//           mode: 'edit', // Read-only mode
//           showExport: true,
//           isEdit: true, // Read-only mode
//           onClose: () => setIsViewDialogOpen(false)
//         }}
//         open={isEditDialogOpen}
//         onOpenChange={setIsEditDialogOpen}
//       />
//     ) : null
//   );

  return {
    tableActions,
    isDeleting,
    // EditDialog,
    isViewDialogOpen,
    isEditDialogOpen,
    selectedSupplier,
  };
};