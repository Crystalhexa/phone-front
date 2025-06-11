"use client"
import { ReusableDialogForm } from '@/components/form/ReusableDialogForm'
import { DataTable } from '@/components/table/DataTable'
import { EmployeesColumns } from '@/components/table/EmployeesColumns'
import { Employee } from '@/types'
import { PlusIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const page = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/users');
        if (!response) {
          throw new Error("Failed to fetch Employees");
        }
        const result = await response.json();
        setEmployees(result);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred while fetching user roles');
      }
    }
    fetchEmployee();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex justify-end px-4 pt-4 lg:px-6">
          <ReusableDialogForm
            triggerLabel={
              <span className="flex items-center gap-1">
                <PlusIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Add Employee</span>
              </span>
            }
            title="Add New Employee"
            formType="userRegistration"
          />
        </div>

        <div className="px-4 py-4 md:py-6 md:px-6">
          <DataTable
            columns={EmployeesColumns}
            type="employee"
            data={employees}
          />
        </div>
      </div>
    </div>
  )
}

export default page
