"use client"

import React from 'react'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { CategoryTableHeader } from '@/components/table/CategoryTable/CategoryTableHeader'
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData'
import { createCategoryColumns } from '@/components/table/CategoryTable/CategoryColumn'
import { useCategoryActions } from '@/components/table/CategoryTable/CategoryActions'
import { Input } from '@/components/ui/input' // Adjust path as needed

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
  } = useCategoryData()

  const {
    tableActions,
    EditDialog,
  } = useCategoryActions()

  // Create columns with actions
  const columns = createCategoryColumns(tableActions)

  // Header actions component
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      {/* You can keep other buttons in CategoryTableHeader */}
      <CategoryTableHeader />
      {/* 🔍 Search input */}
      <Input
        type="text"
        placeholder="Search categories..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:w-64 w-full"
      />
    </div>
  )

  return (
    <>
      <DataTable
        data={data?.data?.categories || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        title="Categories"
        subtitle={`Total: ${data?.data?.total || 0} categories`}
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

      {/* Modals */}
      <EditDialog />
    </>
  )
}

export default CategoriesTable
