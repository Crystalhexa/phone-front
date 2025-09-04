import { useState } from 'react';
import { Eye, Edit, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";
import { Customer } from '@/types/customer';
import { useDeleteCustomerMutation } from '@/state/customer';
import { TableAction } from './CustomerColumn';
import { redirect } from 'next/navigation';

export const useCustomerActions = () => {
  // Dialog state management
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Mutation hooks
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

  // Action handlers
  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
        redirect(`/dashboard/customers/statement/${customer.id}`);
  };

  const handleEdit = (customer: Customer) => {
    redirect(`/dashboard/customers/update/${customer.id}`);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.name}"?`)) {
      return;
    }
    try {
      await deleteCustomer(customer.id).unwrap();
      toast.success('Brand deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete brand');
    }
  };



  // Define table actions
  const tableActions: TableAction[] = [
    {
      label: "Customer Statement",
      icon: Eye,
      onClick: handleView,
    },
    {
      label: "Edit Customer",
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
    isEditDialogOpen,
    selectedCustomer,
  };
};