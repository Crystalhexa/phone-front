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
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { SalesOrder } from "./useSalesOrderData";
import { TableAction } from "@/types/table";
import { formatCurrency } from "@/lib/utils/formatCurrency";

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Pending'
        };
      case 'COMPLETED':
        return {
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Completed'
        };
      case 'SHIPPED':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Package,
          label: 'Shipped'
        };
      case 'CANCELLED':
        return {
          variant: 'secondary' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
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

// Payment Status Badge
const PaymentStatusBadge = ({ status }: { status: string }) => {
  const getPaymentConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return {
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Paid'
        };
      case 'PENDING':
        return {
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Pending'
        };
      case 'PARTIAL':
        return {
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: CreditCard,
          label: 'Partial'
        };
      case 'OVERDUE':
        return {
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertCircle,
          label: 'Overdue'
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800',
          icon: DollarSign,
          label: status
        };
    }
  };

  const config = getPaymentConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

export const createSalesOrderColumns = (actions?: TableAction[]): ColumnDef<SalesOrder>[] => [
  {
    accessorKey: "order_details",
    header: "Order Details",
    size: 200,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium font-mono text-sm">{order.order_number}</div>
          {order.branch_name && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {order.branch_name}
            </div>
          )}
          {order.employee_name && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {order.employee_name}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "customer",
    header: "Customer",
    size: 180,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium">{order.customer_name || 'Walk-in Customer'}</div>
          {order.customer_phone && (
            <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
          )}
          {order.customer_email && (
            <div className="text-xs text-muted-foreground">{order.customer_email}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "order_date",
    header: "Order Date",
    size: 120,
    cell: ({ row }) => {
      const date = row.getValue("order_date") as string;
      return (
        <div className="text-sm">
          {format(new Date(date), 'MMM dd, yyyy')}
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
    accessorKey: "payment_status",
    header: "Payment",
    size: 120,
    cell: ({ row }) => (
      <div className="space-y-1">
        <PaymentStatusBadge status={row.getValue("payment_status")} />
        {row.original.payment_method && (
          <div className="text-xs text-muted-foreground">
            {row.original.payment_method}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "items_count",
    header: "Items",
    size: 80,
    cell: ({ row }) => (
      <div className="text-center">
        <div className="font-medium">{row.original.items?.length || 0}</div>
        <div className="text-xs text-muted-foreground">items</div>
      </div>
    ),
  },
  {
    accessorKey: "financial",
    header: "Amount & Profit",
    size: 180,
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
          {order.discount > 0 && (
            <div className="text-xs text-red-600">
              Discount: -{formatCurrency(order.discount)}
            </div>
          )}
          {order.profit_amount !== undefined && (
            <div className="text-xs text-green-600">
              Profit: {formatCurrency(order.profit_amount)}
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
        {/* <ActionCell actions={actions} row={row.original} /> */}
      </div>
    ),
  },
];