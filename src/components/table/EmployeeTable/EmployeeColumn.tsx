import { ColumnDef } from "@tanstack/react-table";
import { Badge } from '@/components/ui/badge';
import { ActionCell } from '../../ui/DataTable/ActionCell';
import { UserListItem } from "@/types/user";

interface Employee {
  id: string;
  employee_number: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  is_active: boolean;
}

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}
export const createEmployeeColumns = (actions: TableAction[]): ColumnDef<UserListItem>[] => [
  {
    accessorKey: "employee_number",
    header: "Employee No.",
    size: 140,
    cell: ({ row }) => (
      <div className="font-medium text-gray-200 w-[140px] truncate">
        {row.getValue("employee_number")}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 200,
    cell: ({ row }) => (
      <div className="font-medium text-white w-[200px] truncate">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 250,
    cell: ({ row }) => (
      <div className="text-gray-400 max-w-[250px] truncate">
        {row.getValue("email")}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    size: 150,
    cell: ({ row }) => {
      return (
        <div className="text-gray-300 w-[150px] truncate">
          {row.getValue("phone") || <span className="text-gray-500 italic">N/A</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "role_name",
    header: "Role",
    size: 180,
    cell: ({ row }) => (
      <div className="text-gray-300 w-[180px] truncate">
        {row.getValue("role_name") || <span className="text-gray-500 italic">—</span>}
      </div>
    ),
  },
  {
    accessorKey: "branch_name",
    header: "Branch",
    size: 180,
    cell: ({ row }) => (
      <div className="text-gray-300 w-[180px] truncate">
        {row.getValue("branch_name") || <span className="text-gray-500 italic">—</span>}
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    size: 100,
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      return (
        <Badge variant={isActive ? "secondary" : "outline"}>
          {isActive ? "Active" : "Inactive"}
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
