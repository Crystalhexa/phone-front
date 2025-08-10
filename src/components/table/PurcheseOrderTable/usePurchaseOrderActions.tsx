import { useState } from 'react';
import { Eye, Info, Printer, ChevronLeft } from "lucide-react";
import { toast } from 'sonner';
import { TableAction } from "./PurchaseOrderColumn";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import GRNReceipt from './GRNReceipt'; // Import the GRN component

// Types
interface PurchaseOrder {
  id: string;
  order_number: string;
  invoice_number?: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  purchased_by?: string;
  purchaser_name?: string;
  branch_id?: string;
  branch_name?: string;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  status: 'PENDING' | 'COMPLETED' | 'RECEIVED' | 'CANCELLED';
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
  items?: any[];
}

export const usePurchaseOrderActions = () => {
  const router = useRouter();
  
  // Dialog state management
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedOrderForGRN, setSelectedOrderForGRN] = useState<PurchaseOrder | null>(null);
  const [showGRN, setShowGRN] = useState(false);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Action handlers
  const handleView = (order: PurchaseOrder) => {
    router.push(`/dashboard/orders/purchase/all/view/${order.id}`);
  };
  const fetchOrderWithItems = async (id: string) => {
    try {
      // Replace with your actual API call
      const response = await fetch(`/api/purchase-orders/${id}?include_items=true`);
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching order with items:', error);
      toast.error('Failed to fetch order details');
      return null;
    }
  };

  const handleGenerateGRN = async (order: PurchaseOrder) => {
    console.log(order)
    // Check if order already has items, if not fetch them
    if (!order.items || order.items.length === 0) {
      const orderWithItems = await fetchOrderWithItems(order.id);
      if (orderWithItems) {
        setSelectedOrderForGRN(orderWithItems);
      } else {
        return; // Failed to fetch items
      }
    } else {
      setSelectedOrderForGRN(order);
    }
    
    setShowGRN(true);
  };

  const handleBackFromGRN = () => {
    setShowGRN(false);
    setSelectedOrderForGRN(null);
  };

  // Custom action cell component for quick info
  const QuickInfoAction = ({ order }: { order: PurchaseOrder }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <Info className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-semibold">Quick Info</h4>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Created:</span> {formatDate(order.created_at)}</p>
            <p><span className="font-medium">Updated:</span> {formatDate(order.updated_at)}</p>
            <p><span className="font-medium">Items:</span> {order.items_count}</p>
            {order.notes && (
              <p><span className="font-medium">Notes:</span> {order.notes.substring(0, 100)}{order.notes.length > 100 ? '...' : ''}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Define table actions
  const tableActions: TableAction[] = [
    {
      label: "Quick Info",
      icon: Info,
      onClick: (order) => {}, // Handled by custom component
    },
    {
      label: "Generate GRN",
      icon: Printer,
      onClick: handleGenerateGRN,
    },
    {
      label: "View Details",
      icon: Eye,
      onClick: handleView,
    },
  ];

  const EditDialog = () => {
    // You can implement your edit dialog here
    // For now, returning null since no edit functionality is shown in original
    return null;
  };

  const GRNDialog = () => {
    if (!showGRN || !selectedOrderForGRN) return null;
    
    return (
      <div>
        {/* Back button */}
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={handleBackFromGRN}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Purchase Orders
          </Button>
        </div>
        {/* GRN Receipt Component */}
          <GRNReceipt 
            purchaseOrder={selectedOrderForGRN}
            receivedBy="Warehouse Manager" // You can make this dynamic
            receivedDate={format(new Date(), 'yyyy-MM-dd')}
          />
      </div>
    );
  };

  return {
    tableActions,
    EditDialog,
    GRNDialog,
    QuickInfoAction,
    showGRN,
    selectedOrderForGRN,
    handleBackFromGRN,
    isEditDialogOpen,
    selectedOrder,
  };
};