// components/table/SalesOrderTable/useSalesOrderActions.tsx
import { useState } from 'react';
import { Eye, Info, Printer, RefreshCcw, ChevronLeft } from "lucide-react";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';

// Import the SalesOrder type from the data hook
import { SalesOrder } from './useSalesOrderData';

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export const useSalesOrderActions = () => {
  const router = useRouter();
  
  // Dialog state management
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<SalesOrder | null>(null);
  const [showReturn, setShowReturn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'Rs. 0.00';
    return `Rs. ${amount.toFixed(2)}`;
  };

  // Action handlers
  const handleView = (order: SalesOrder) => {
    if (!order?.id) {
      toast.error('Invalid order ID');
      return;
    }
    router.push(`/dashboard/orders/sales/view/${order.id}`);
  };

  const handlePrintInvoice = (order: SalesOrder) => {
    if (!order?.id) {
      toast.error('Invalid order ID');
      return;
    }
    router.push(`/dashboard/orders/sales/all/print/${order.id}`);
  };

  const fetchOrderWithItems = async (id: string): Promise<SalesOrder | null> => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/sales-orders/${id}?include_items=true`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        toast.error(data.message || 'Failed to fetch order details');
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching order with items:', error);
      toast.error('Failed to fetch order details');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReturn = async (order: SalesOrder) => {
    if (!order?.id) {
      toast.error('Invalid order selected');
      return;
    }

    // Check if order status allows returns
    if (order.status !== 'COMPLETED' && order.status !== 'DELIVERED') {
      toast.error('Returns can only be generated for completed orders');
      return;
    }

    try {
      // If order doesn't have items or has empty items array, fetch them
      if (!order.items || order.items.length === 0) {
        const orderWithItems = await fetchOrderWithItems(order.id);
        if (orderWithItems) {
          setSelectedOrderForReturn(orderWithItems);
        } else {
          return; // Error already shown in fetchOrderWithItems
        }
      } else {
        setSelectedOrderForReturn(order);
      }
      
      setShowReturn(true);
    } catch (error) {
      console.error('Error preparing return:', error);
      toast.error('Failed to prepare return');
    }
  };

  const handleEdit = (order: SalesOrder) => {
    if (!order?.id) {
      toast.error('Invalid order selected');
      return;
    }

    // Check if order can be edited (usually only pending orders)
    if (order.status !== 'PENDING') {
      toast.error('Only pending orders can be edited');
      return;
    }

    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleBackFromReturn = () => {
    setShowReturn(false);
    setSelectedOrderForReturn(null);
  };

  const handleCloseEdit = () => {
    setIsEditDialogOpen(false);
    setSelectedOrder(null);
  };

  // Custom action cell component for quick info
  const QuickInfoAction = ({ order }: { order: SalesOrder }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <Info className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="border-b pb-2">
            <h4 className="font-semibold text-sm">Quick Info</h4>
            <p className="text-xs text-muted-foreground">Order #{order.order_number}</p>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Created:</span>
              <span className="text-muted-foreground">{formatDate(order.created_at)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Updated:</span>
              <span className="text-muted-foreground">{formatDate(order.updated_at)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Items:</span>
              <span className="text-muted-foreground">{order.items?.length || 0}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Total:</span>
              <span className="text-muted-foreground font-mono">{formatCurrency(order.total_amount)}</span>
            </div>
            
            {order.profit_amount !== undefined && (
              <div className="flex justify-between">
                <span className="font-medium">Profit:</span>
                <span className="text-green-600 font-mono">{formatCurrency(order.profit_amount)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="font-medium">Customer:</span>
              <span className="text-muted-foreground">{order.customer_name || 'Walk-in'}</span>
            </div>
            
            {order.employee_name && (
              <div className="flex justify-between">
                <span className="font-medium">Sales Rep:</span>
                <span className="text-muted-foreground">{order.employee_name}</span>
              </div>
            )}
          </div>
          
          {order.notes && (
            <div className="border-t pt-2">
              <p className="text-xs font-medium mb-1">Notes:</p>
              <p className="text-xs text-muted-foreground">
                {order.notes.length > 100 
                  ? `${order.notes.substring(0, 100)}...` 
                  : order.notes
                }
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  // Define table actions with conditional logic
  const tableActions: TableAction[] = [
    {
      label: "Quick Info",
      icon: Info,
      onClick: () => {}, // Handled by custom component
    },
    {
      label: "View Details",
      icon: Eye,
      onClick: handleView,
    },
    {
      label: "Print Invoice",
      icon: Printer,
      onClick: handlePrintInvoice,
    }
  ];

  // Filter actions based on order status and add dynamic properties
  const getActionsForOrder = (order: SalesOrder): TableAction[] => {
    return tableActions.map(action => ({
      ...action
    }));
  };

  const EditDialog = () => {
    if (!isEditDialogOpen || !selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Edit Sales Order</h2>
            <Button variant="ghost" size="sm" onClick={handleCloseEdit}>
              ×
            </Button>
          </div>
          
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-gray-500">Edit Sales Order Form will be implemented here</p>
            <p className="text-sm text-gray-400 mt-2">
              Order: {selectedOrder.order_number}
            </p>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button onClick={handleCloseEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const ReturnDialog = () => {
    if (!showReturn || !selectedOrderForReturn) return null;
    
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleBackFromReturn}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Sales Orders
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">Process Return</h1>
            <p className="text-muted-foreground">
              Order #{selectedOrderForReturn.order_number}
            </p>
          </div>
        </div>
        
        {/* Return form placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-mono">{formatCurrency(selectedOrderForReturn.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items Count:</span>
                  <span>{selectedOrderForReturn.items?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{selectedOrderForReturn.customer_name || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Date:</span>
                  <span>{formatDate(selectedOrderForReturn.order_date)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Return Form */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <h3 className="font-semibold mb-2">Return Processing Form</h3>
              <p className="text-gray-500 mb-4">
                Sales Return Generator Component will be implemented here
              </p>
              <div className="text-sm text-gray-400">
                <p>Features to implement:</p>
                <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                  <li>• Select items to return</li>
                  <li>• Specify return quantities</li>
                  <li>• Add return reason</li>
                  <li>• Calculate refund amount</li>
                  <li>• Process refund</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading order details...
            </div>
          </div>
        )}
      </div>
    );
  };

  return {
    // Actions and components
    tableActions,
    getActionsForOrder, // New: Get actions filtered by order status
    EditDialog,
    ReturnDialog,
    QuickInfoAction,
    
    // State
    showReturn,
    selectedOrderForReturn,
    isEditDialogOpen,
    selectedOrder,
    isLoading,
    
    // Handlers
    handleBackFromReturn,
    handleCloseEdit,
    handleView,
    handlePrintInvoice,
    handleGenerateReturn,
    handleEdit,
    
    // Utilities
    formatDate,
    formatCurrency,
  };
};