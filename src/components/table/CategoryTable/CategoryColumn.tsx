import { ColumnDef } from "@tanstack/react-table";
import { Badge } from '@/components/ui/badge';
import { ActionCell } from '../../ui/DataTable/ActionCell';
import { Category, Subcategory } from "@/types/category";

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
    size: 80,
    cell: ({ row }) => (
      <div className="font-medium text-gray-300 w-[80px] truncate">
        #{row.getValue("category_id")}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: "Category Name",
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
    accessorKey: "subcategories",
    header: "Subcategories",
    size: 300,
    cell: ({ row }) => {
      const subcategories = row.getValue("subcategories") as Subcategory[];
      if (!subcategories || subcategories.length === 0) {
        return <span className="text-gray-500 text-sm w-[300px] block">No subcategories</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[300px]">
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
    size: 100,
    cell: ({ row }) => {
      const subcategories = row.getValue("subcategories") as Subcategory[];
      return (
        <div className="text-center w-[100px]">
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
    size: 150,
    cell: ({ row }) => (
      <div className="w-[150px]">
        <ActionCell actions={actions} row={row.original} />
      </div>
    ),
  },
];
