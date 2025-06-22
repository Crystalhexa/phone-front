'use client'
import React from 'react';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import { useCategoryActions } from './CategoryActions';
import { CategoryTableHeader } from './CategoryTableHeader';
import { useCategoryData } from './useCategoryData';
import { createCategoryColumns } from './CategoryColumn';

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
        onSearch={handleSearch}
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