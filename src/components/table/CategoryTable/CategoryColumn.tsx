import { ColumnDef } from "@tanstack/react-table";
import { Badge } from '@/components/ui/badge';
import { ActionCell } from '../../ui/DataTable/ActionCell';
import { Category, Subcategory } from '@/state/api';

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}

export const createCategoryColumns = (actions: TableAction[]): ColumnDef<Category>[] => [
  {
    accessorKey: "category_id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-medium text-gray-300">#{row.getValue("category_id")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Category Name",
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
    accessorKey: "subcategories",
    header: "Subcategories",
    cell: ({ row }) => {
      const subcategories = row.getValue("subcategories") as Subcategory[];
      if (!subcategories || subcategories.length === 0) {
        return <span className="text-gray-500 text-sm">No subcategories</span>;
      }
      
      return (
        <div className="flex flex-wrap gap-1">
          {subcategories.slice(0, 3).map((sub) => (
            <Badge key={sub.subcategory_id} variant="secondary">
              {sub.name}
            </Badge>
          ))}
          {subcategories.length > 3 && (
            <Badge variant="outline">
              +{subcategories.length - 3} more
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "subcategories",
    header: "Count",
    id: "count",
    cell: ({ row }) => {
      const subcategories = row.getValue("subcategories") as Subcategory[];
      return (
        <div className="text-center">
          <Badge variant="outline">
            {subcategories ? subcategories.length : 0}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionCell actions={actions} row={row.original} />,
  },
];