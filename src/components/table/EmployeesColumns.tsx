'use client'
import { ColumnDef } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { MoreHorizontal } from "lucide-react";
import { redirect } from "next/navigation";
import { Employee } from "@/types";


export const EmployeesColumns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'userName',
    header: 'User name',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.username}</p>
  },
  {
    accessorKey: 'fullName',
    header: 'Full Name',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.employee.name}</p>
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.employee.email}</p>
  },
  {
    accessorKey: 'phoneNumber',
    header: 'Phone Number',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.employee.phone}</p>
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.employee.is_active}</p>
  },
  {
    accessorKey: 'nic',
    header: 'NIC',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.employee.nic}</p>
  },
   {
    accessorKey: 'gender',
    header: 'Gender',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.employee.gender}</p>
  },
    {
    accessorKey: 'dob',
    header: 'Date Of Birth',
    cell: ({ row }) => <p className="text-14-medium px-4">{row.original.employee.dob}</p>
  },
  {
    id: "id",
    enableHiding: false,
    cell: ({ row }) => {
      const handleViewDistric = () => {
        const employeeId = row.original.user_id; // Assuming each patient has an "id" field
        redirect(`/dashboard/user/employees/update/${employeeId}`); // Navigate to patient details page
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost"  className="flex size-8 text-muted-foreground data-[state=open]:bg-muted">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleViewDistric}>
              Update
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
];