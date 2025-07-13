"use client"

import React from 'react'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { Input } from '@/components/ui/input' // Adjust path as needed
import { useSubCategoryActions } from '@/components/table/SubCategoryTable/SubCategoryActions'
import { useSubcategoryData } from '@/components/table/SubCategoryTable/useSubcategoryData'
import { useParams } from 'next/navigation'
import { createSubCategoryColumns } from '@/components/table/SubCategoryTable/SubCategoryColumn'
import { SubCategoryTableHeader } from '@/components/table/SubCategoryTable/SubCategoryTableHeader'

const CategoriesTable: React.FC = () => {
  const params = useParams();
  const id = params.id as string;
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
  } = useSubcategoryData(id);

  const {
    tableActions,
    EditDialog,
  } = useSubCategoryActions()

  // Create columns with actions
  const columns = createSubCategoryColumns(tableActions)

  // Header actions component
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      {/* You can keep other buttons in CategoryTableHeader */}

      <SubCategoryTableHeader categoryId={id} />
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
        data={data?.data?.subcategories || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        title={data?.data.name}
        subtitle={`Total: ${data?.data?.total || 0} sub categories`}
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
