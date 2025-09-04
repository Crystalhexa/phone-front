import { ColumnDef } from "@tanstack/react-table";
import { ActionCell } from "../../ui/DataTable/ActionCell";
import { Customer } from "@/types/customer";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: "default" | "destructive";
}

export const createCustomerColumns = (
  actions: TableAction[]
): ColumnDef<Customer>[] => [
  {
    accessorKey: "customer_number",
    header: "Customer No.",
    size: 120,
    cell: ({ row }) => (
      <div className="font-medium text-gray-300 truncate w-[120px]">
        #{row.getValue("customer_number")}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: "Full Name",
    size: 200,
    cell: ({ row }) => (
      <div className="font-medium text-white truncate w-[200px]">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 220,
    cell: ({ row }) => (
      <div className="text-gray-400 truncate w-[220px]">
        {row.getValue("email") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    size: 150,
    cell: ({ row }) => (
      <div className="text-gray-400 truncate w-[150px]">
        {row.getValue("phone") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "nic",
    header: "NIC",
    size: 150,
    cell: ({ row }) => (
      <div className="text-gray-400 truncate w-[150px]">
        {row.getValue("nic") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "running_balance",
    header: "Outstanding",
    size: 120,
    cell: ({ row }) => (
      <div className="text-red-400 font-semibold text-sm">
        Rs. {typeof row.getValue("running_balance") === "number"
          ? formatCurrency(row.getValue("running_balance"))
          : "0.00"}
      </div>
    ),
  },
  {
    accessorKey: "loyalty_points",
    header: "Loyalty Points",
    size: 100,
    cell: ({ row }) => (
      <div className="text-yellow-400 font-medium">
        {row.getValue("loyalty_points")}
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    size: 100,
    cell: ({ row }) => {
      const isActive = row.getValue("is_active");
      return (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
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
