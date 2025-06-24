import { ColumnDef } from "@tanstack/react-table";
import { Badge } from '@/components/ui/badge';
import { ActionCell } from '../../ui/DataTable/ActionCell';
import { Category, AttributeValue } from '@/state/api';
import { Attribute,  } from "@/state/attribute";

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}

export const createAttributeColumns = (actions: TableAction[]): ColumnDef<Attribute>[] => [
  {
    accessorKey: "attribute_id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-medium text-gray-300">#{row.getValue("attribute_id")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Attribute Name",
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
    accessorKey: "values",
    header: "Values",
    cell: ({ row }) => {
      const values = row.getValue("values") as AttributeValue[];
      if (!values || values.length === 0) {
        return <span className="text-gray-500 text-sm">No values</span>;
      }
      
      return (
        <div className="flex flex-wrap gap-1">
          {values.slice(0, 3).map((sub) => (
            <Badge key={sub.attribute_values_id} variant="secondary">
              {sub.value}
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
    cell: ({ row }) => {
      const values = row.getValue("values") as AttributeValue[];
      return (
        <div className="text-center">
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
    cell: ({ row }) => <ActionCell actions={actions} row={row.original} />,
  },
];