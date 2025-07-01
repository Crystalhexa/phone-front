import { ColumnDef } from "@tanstack/react-table";
import { ActionCell } from "../../ui/DataTable/ActionCell";
import { Supplier } from "@/types/supplier";

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: "default" | "destructive";
}

export const createSupplierColumns = (
  actions: TableAction[]
): ColumnDef<Supplier>[] => [
  {
    accessorKey: "code",
    header: "Code",
    size: 120,
    cell: ({ row }) => (
      <div className="font-medium text-gray-300 truncate w-[120px]">
        {row.getValue("code")}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: "Supplier Name",
    size: 200,
    cell: ({ row }) => (
      <div className="font-medium text-white truncate w-[200px]">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "contact_name",
    header: "Contact Person",
    size: 180,
    cell: ({ row }) => (
      <div className="text-gray-400 truncate w-[180px]">
        {row.getValue("contact_name") || "—"}
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
    accessorKey: "sales_rep_name",
    header: "Sales Rep",
    size: 160,
    cell: ({ row }) => (
      <div className="text-gray-400 truncate w-[160px]">
        {row.getValue("sales_rep_name") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "sales_rep_phone",
    header: "Rep Phone",
    size: 150,
    cell: ({ row }) => (
      <div className="text-gray-400 truncate w-[150px]">
        {row.getValue("sales_rep_phone") || "—"}
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
