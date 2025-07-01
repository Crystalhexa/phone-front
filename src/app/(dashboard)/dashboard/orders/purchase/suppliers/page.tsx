"use client"
import { EmployeesColumns } from '@/components/table/EmployeesColumns'
import { useSupplierActions } from '@/components/table/SupplierTable/SupplierAction'
import { createSupplierColumns } from '@/components/table/SupplierTable/SupplierColumn'
import { useSupplierData } from '@/components/table/SupplierTable/SupplierData'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { Input } from '@/components/ui/input'
import { Employee } from '@/types'
import { redirect } from 'next/navigation'
import React, { useEffect, useState } from 'react'

const page = () => {
  
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
  } = useSupplierData()

  const { tableActions} = useSupplierActions();

  const columns = createSupplierColumns(tableActions);
  const handleAddSupplier = ()=>{
    redirect('/dashboard/orders/purchase/suppliers/register')
  }
const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <Button onClick={handleAddSupplier} variant="outline" className="whitespace-nowrap">
            Add Supplier
          </Button>
      {/* 🔍 Search input */}
      <Input
        type="text"
        placeholder="Search customer..."
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
                     data={data?.data?.suppliers || []}
                     columns={columns}
                     isLoading={isLoading}
                     error={error}
                     title="Supplier"
                     subtitle={`Total: ${data?.data?.total || 0} supplier`}
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
