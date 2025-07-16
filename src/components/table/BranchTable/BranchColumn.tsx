import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ActionCell } from "../../ui/DataTable/ActionCell";
import { Branch } from "@/types/branch";

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: "default" | "destructive";
}

export const createBranchColumns = (
  actions: TableAction[]
): ColumnDef<Branch>[] => [
  
  {
    accessorKey: "name",
    header: "Branch Name",
    size: 200,
    cell: ({ row }) => (
      <div className="font-medium text-white w-[200px] truncate">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    size: 100,
    cell: ({ row }) => (
      <div className="text-white w-[100px] truncate">
        {row.getValue("code")}
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    size: 150,
    cell: ({ row }) => (
      <div className="text-gray-400 w-[150px] truncate">
        {row.getValue("location") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    size: 250,
    cell: ({ row }) => (
      <div className="text-gray-400 max-w-[250px] truncate">
        {row.getValue("address") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    size: 150,
    cell: ({ row }) => (
      <div className="text-gray-400 w-[150px] truncate">
        {row.getValue("phone") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 200,
    cell: ({ row }) => (
      <div className="text-gray-400 w-[200px] truncate">
        {row.getValue("email") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "is_main_branch",
    header: "Main Branch",
    size: 120,
    cell: ({ row }) => {
      const isMain = row.getValue("is_main_branch");
      return (
        <Badge variant={isMain ? "default" : "secondary"}>
          {isMain ? "Yes" : "No"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "can_purchase",
    header: "Can Purchase",
    size: 120,
    cell: ({ row }) => {
      const canPurchase = row.getValue("can_purchase");
      return (
        <Badge variant={canPurchase ? "default" : "secondary"}>
          {canPurchase ? "Yes" : "No"}
        </Badge>
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
