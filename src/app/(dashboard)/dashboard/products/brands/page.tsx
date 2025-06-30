"use client"
import React from 'react'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { useBrandData } from '@/components/table/BrandTable/useBrandData'
import { createBrandColumns } from '@/components/table/BrandTable/BrandColumn'
import { useBrandActions } from '@/components/table/BrandTable/BrandActions'
import { Input } from '@/components/ui/input' // Adjust path as needed
import { ReusableDialogForm } from '@/components/form/ReusableDialogForm'
import { Plus } from 'lucide-react'

const BrandTable: React.FC = () => {
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
  } = useBrandData()

  const {
    tableActions,
    EditDialog,
  } = useBrandActions()

  // Create columns with actions
  const columns = createBrandColumns(tableActions)

  // Header actions component
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
         <ReusableDialogForm
                triggerLabel={
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Brand
                  </>
                }
                formType="brand"
                formProps={{
                  showExport: true,
                  isEdit: false,
                }}
              />
      {/* 🔍 Search input */}
      <Input
        type="text"
        placeholder="Search brands..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:w-64 w-full"
      />
    </div>
  )

  return (
    <>
      <DataTable
        data={data?.data?.brands || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        title="Brands"
        subtitle={`Total: ${data?.data?.total || 0} brands`}
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

export default BrandTable