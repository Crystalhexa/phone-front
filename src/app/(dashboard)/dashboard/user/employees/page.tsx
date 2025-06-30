"use client"
import { ReusableDialogForm } from '@/components/form/ReusableDialogForm'
import { EmployeesColumns } from '@/components/table/EmployeesColumns'
import { useEmployeeActions } from '@/components/table/EmployeeTable/EmployeeActions'
import { createEmployeeColumns } from '@/components/table/EmployeeTable/EmployeeColumn'
import { useEmployeeData } from '@/components/table/EmployeeTable/useEmployeeData'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { Input } from '@/components/ui/input'
import { Employee } from '@/types'
import { PlusIcon } from 'lucide-react'
import { redirect } from 'next/navigation'
import React, { useEffect, useState } from 'react'

const page = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const {
    data,
    isLoading,
    handleSearch,
    searchTerm,
    error,
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    handlePageSizeChange,
  } = useEmployeeData()

  const handleAddEmployee = () => {
    redirect('/dashboard/user/employees/register')
  }
  const {
    tableActions,
    EditDialog,
  } = useEmployeeActions()
  const columns = createEmployeeColumns(tableActions);
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      {/* You can keep other buttons in CategoryTableHeader */}
      {/* <AttributeTableHeader /> */}

      {/* 🔍 Search input */}
      <Input
        type="text"
        placeholder="Search attributes..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:w-64 w-full"
      />
    </div>
  )
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex justify-end px-4 pt-4 lg:px-6">
          <Button
            onClick={handleAddEmployee}
          >
            Add Employee
          </Button>
        </div>

        <div className="px-4 py-4 md:py-6 md:px-6">
          <DataTable
            data={data?.data?.employee || []}
            columns={columns}
            isLoading={isLoading}
            error={error}
            title="Employee"
            subtitle={`Total: ${data?.data?.total || 0} employees`}
            actions={headerActions}
            searchable={false} // Disable built-in search if using custom input
            pagination={{
              currentPage,
              pageSize,
              total: data?.data?.total || 0,
              totalPages,
            }}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </div>
  )
}

export default page
