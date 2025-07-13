import { ColumnDef } from "@tanstack/react-table";
import { ActionCell } from '../../ui/DataTable/ActionCell';
import {  Subcategory } from "@/types/category";

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}

export const createSubCategoryColumns = (actions: TableAction[]): ColumnDef<Subcategory>[] => [
  {
    accessorKey: "subcategory_id",
    header: "ID",
    size: 80,
    cell: ({ row }) => (
      <div className="font-medium text-gray-300 w-[80px] truncate">
        #{row.getValue("subcategory_id")}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: "Subcategory Name",
    size: 200,
    cell: ({ row }) => (
      <div className="font-medium text-white w-[200px] truncate">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    size: 300,
    cell: ({ row }) => (
      <div className="text-gray-400 max-w-[300px] truncate">
        {row.getValue("description") || "No description"}
      </div>
    ),
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
