import { ColumnDef } from "@tanstack/react-table";
import { ActionCell } from '../../ui/DataTable/ActionCell';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  Package,
  XCircle,
  AlertCircle,
  Building2,
  User,
} from 'lucide-react';
import { formatCurrency } from "@/lib/utils/formatCurrency";

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

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}

// Status Badge Component with Icons
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
          icon: Clock,
          label: 'Pending'
        };
      case 'COMPLETED':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
          icon: CheckCircle,
          label: 'Completed'
        };
      case 'RECEIVED':
        return {
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
          icon: Package,
          label: 'Received'
        };
      case 'CANCELLED':
        return {
          variant: 'secondary' as const,
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
          icon: XCircle,
          label: 'Cancelled'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
          label: status
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

export const createPurchaseOrderColumns = (actions: TableAction[]): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: "order_details",
    header: "Order Details",
    size: 200,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium font-mono text-sm">{order.order_number}</div>
          {order.invoice_number && (
            <div className="text-xs text-muted-foreground">
              Invoice: {order.invoice_number}
            </div>
          )}
          {order.branch_name && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {order.branch_name}
            </div>
          )}
          {order.purchaser_name && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {order.purchaser_name}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    size: 180,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium">{order.supplier_name}</div>
          <div className="text-sm text-muted-foreground">{order.supplier_code}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "dates",
    header: "Dates",
    size: 150,
    cell: ({ row }) => {
      const order = row.original;
      const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'MMM dd, yyyy');
      };
      
      return (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">Order:</span> {formatDate(order.order_date)}
          </div>
          {order.expected_date && (
            <div className="text-xs text-muted-foreground">
              Expected: {formatDate(order.expected_date)}
            </div>
          )}
          {order.received_date && (
            <div className="text-xs text-green-600">
              Received: {formatDate(order.received_date)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 120,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "items_count",
    header: "Items",
    size: 80,
    cell: ({ row }) => (
      <div className="text-center">
        <div className="font-medium">{row.getValue("items_count")}</div>
        <div className="text-xs text-muted-foreground">items</div>
      </div>
    ),
  },
  {
    accessorKey: "total_amount",
    header: "Amount",
    size: 150,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="text-left space-y-1">
          <div className="font-medium text-lg">
            {formatCurrency(order.total_amount)}
          </div>
          <div className="text-xs text-muted-foreground">
            Subtotal: {formatCurrency(order.subtotal)}
          </div>
          {parseFloat(order.tax_amount) > 0 && (
            <div className="text-xs text-muted-foreground">
              Tax: {formatCurrency(order.tax_amount)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    size: 150,
    cell: ({ row }) => (
      <div className="w-[150px]">
        <ActionCell actions={actions} row={row.original} />
      </div>
    ),
  },
];