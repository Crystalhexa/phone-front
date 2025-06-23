import { ColumnDef } from "@tanstack/react-table";
import { ActionCell } from '../../ui/DataTable/ActionCell';
import { Brand } from "@/lib/constants/brandConstants";

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}

export const createBrandColumns = (actions: TableAction[]): ColumnDef<Brand>[] => [
  {
    accessorKey: "brand_id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-medium text-gray-300">#{row.getValue("brand_id")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Brand Name",
    cell: ({ row }) => (
      <div className="font-medium text-white">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="text-gray-400 max-w-xs truncate">
        {row.getValue("description") || "No description"}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionCell actions={actions} row={row.original} />,
  },
];