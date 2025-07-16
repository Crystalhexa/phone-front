"use client"
import React from 'react'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { Input } from '@/components/ui/input' 
import { useBranchData } from '@/components/table/BranchTable/useBranchData'
import { useBranchActions } from '@/components/table/BranchTable/BranchActions'
import { createBranchColumns } from '@/components/table/BranchTable/BranchColumn'
import { BranchTableHeader } from '@/components/table/BranchTable/BranchTableHeader'
const CategoriesTable: React.FC = () => {
  
  
  // Custom hooks
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
  } = useBranchData()

  const {
    tableActions,
    EditDialog,
  } = useBranchActions()

  // Create columns with actions
  const columns = createBranchColumns(tableActions)

  // Header actions component
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      {/* You can keep other buttons in CategoryTableHeader */}
      
      <BranchTableHeader />
      {/* 🔍 Search input */}
      <Input
        type="text"
        placeholder="Search branches..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:w-64 w-full"
      />
    </div>
  )

  return (
    <>
      <DataTable
        data={data?.data.branches || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        title="Branches"
        subtitle={`Total: ${data?.data?.total || 0} Branches`}
        actions={headerActions}
        searchable={false} 
        pagination={{
          currentPage,
          pageSize,
          total: data?.data.total || 0,
          totalPages,
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Modals */}
      <EditDialog />
    </>
  )
}

export default CategoriesTable
