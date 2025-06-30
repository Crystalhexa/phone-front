import { ColumnDef } from "@tanstack/react-table";
import { Badge } from '@/components/ui/badge';
import { ActionCell } from '../../ui/DataTable/ActionCell';
import { Attribute, AttributeValue } from "@/types/attribute";

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}

export const createAttributeColumns = (actions: TableAction[]): ColumnDef<Attribute>[] => [
  {
    accessorKey: "id",
    header: "ID",
    size: 80,
    cell: ({ row }) => (
      <div className="font-medium text-gray-300 w-[80px] truncate">
        #{row.getValue("id")}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: "Attribute Name",
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
    accessorKey: "values",
    header: "Values",
    size: 300,
    cell: ({ row }) => {
      const values = row.getValue("values") as AttributeValue[];
      if (!values || values.length === 0) {
        return <span className="text-gray-500 text-sm w-[300px] block">No values</span>;
      }
      
      return (
        <div className="flex flex-wrap gap-1 max-w-[300px]">
          {values.slice(0, 3).map((val) => (
            <Badge key={val.id} variant="secondary">
              {val.value}
            </Badge>
          ))}
          {values.length > 3 && (
            <Badge variant="outline">
              +{values.length - 3} more
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "values",
    header: "Count",
    id: "count",
    size: 100,
    cell: ({ row }) => {
      const values = row.getValue("values") as AttributeValue[];
      return (
        <div className="text-center w-[100px]">
          <Badge variant="outline">
            {values ? values.length : 0}
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
