"use client"
import { useEmployeeActions } from '@/components/table/EmployeeTable/EmployeeActions'
import { createEmployeeColumns } from '@/components/table/EmployeeTable/EmployeeColumn'
import { useEmployeeData } from '@/components/table/EmployeeTable/useEmployeeData'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'
import React from 'react'

const page = () => {

  const {
    users,
    total,
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
  } = useEmployeeActions();

  const columns = createEmployeeColumns(tableActions);


  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      {/* You can keep other buttons in CategoryTableHeader */}
      <Button
        onClick={handleAddEmployee}
      >
        Add Employee
      </Button>
      {/* 🔍 Search input */}
      <Input
        type="text"
        placeholder="Search employee..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:w-64 w-full"
      />
    </div>
  )
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="px-4 py-4 md:py-6 md:px-6">
          <DataTable
            data={users || []}
            columns={columns}
            isLoading={isLoading}
            error={error}
            title="Employee"
            subtitle={`Total: ${total || 0} employees`}
            actions={headerActions}
            searchable={false} // Disable built-in search if using custom input
            pagination={{
              currentPage,
              pageSize,
              total: total || 0,
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
