"use client"
import { DataTable } from '@/components/ui/DataTable/DataTable'
import React, { useState } from 'react'
import { CategoryTableHeader } from '@/components/table/CategoryTable/CategoryTableHeader';        // ← Import header
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { createCategoryColumns } from '@/components/table/CategoryTable/CategoryColumn'
import { useCategoryActions } from '@/components/table/CategoryTable/CategoryActions'

const CategoriesTable: React.FC = () => {
  // Custom hooks
  const {
    data,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalPages,
    handleSearch,
    setCurrentPage,
    handlePageSizeChange,
  } = useCategoryData();

  const {
    tableActions,
    handleAddCategory,
    ViewDialog,
    EditDialog,
  } = useCategoryActions();

  // Create columns with actions
  const columns = createCategoryColumns(tableActions);

  // Header actions component
  const headerActions = (
    <CategoryTableHeader onAddCategory={handleAddCategory} />
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
      <ViewDialog />
      <EditDialog />
    </>
  );
};

export default CategoriesTable;