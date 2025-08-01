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
