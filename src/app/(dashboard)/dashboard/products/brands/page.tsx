"use client"
import { DataTable } from '@/components/ui/DataTable/DataTable'
import React from 'react'
import { CategoryTableHeader } from '@/components/table/CategoryTable/CategoryTableHeader';        // ← Import header
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { useCategoryActions } from '@/components/table/CategoryTable/CategoryActions'
import { createBrandColumns } from '@/components/table/BrandTable/BrandColumn';

const BrandTable: React.FC = () => {
  // Custom hooks
  const {
    data,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    handlePageSizeChange,
  } = useCategoryData();

  const {
    tableActions,
    EditDialog,
  } = useCategoryActions();

  // Create columns with actions
  const columns = createBrandColumns(tableActions);

  // Header actions component
  const headerActions = (
    <CategoryTableHeader/>
  );

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
        searchPlaceholder="Search categories..."
        searchable={true}
        pagination={{
          currentPage,
          pageSize,
          total: data?.data?.total || 0,
          totalPages,
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />
      
      {/* Render dialogs */}
      <EditDialog />
    </>
  );
};

export default BrandTable;