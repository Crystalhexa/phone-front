"use client"
import React from 'react'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { CategoryTableHeader } from '@/components/table/CategoryTable/CategoryTableHeader'
import { Input } from '@/components/ui/input' // Adjust path as needed
import { useAttributeData } from '@/components/table/AttributeTable/useAttributeData'
import { useAttributeActions } from '@/components/table/AttributeTable/AttributeActions'
import { createAttributeColumns } from '@/components/table/AttributeTable/AttributeColumn'
import { AttributeTableHeader } from '@/components/table/AttributeTable/AttributeTableHeader'

const AttributeTable: React.FC = () => {
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
  } = useAttributeData()

  const {
    tableActions,
    EditDialog,
  } = useAttributeActions()

  // Create columns with actions
  const columns = createAttributeColumns(tableActions)

  // Header actions component
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      {/* You can keep other buttons in CategoryTableHeader */}
      <AttributeTableHeader/>
      
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
    <>
      <DataTable
        data={data?.data?.attributes || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        title="Attributes"
        subtitle={`Total: ${data?.data?.total || 0} attributes`}
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

export default AttributeTable
