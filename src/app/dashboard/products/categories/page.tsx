"use client"
import { ReusableDialogForm } from '@/components/form/ReusableDialogForm'
import { DataTable } from '@/components/ui/DataTable/DataTable'

import { Category } from '@/types/category'
import { redirect } from 'next/navigation'
import React, { useState } from 'react'
import { CategoryTableHeader } from '@/components/table/CategoryTable/CategoryTableHeader';        // ← Import header
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';  
import { createCategoryColumns } from '@/components/table/CategoryTable/CategoryColumn'
import { useCategoryActions } from '@/components/table/CategoryTable/CategoryActions'
const page = () => {
  const [category, setCategory] = useState<Category[]>([]);
  const handleAddEmployee = ()=>{
    redirect('/dashboard/user/employees/register')
  }

  const {
    data, isLoading, error, currentPage, pageSize, totalPages,
    handleSearch, setCurrentPage, handlePageSizeChange,
  } = useCategoryData();

  // 2. Get action handlers
  const { tableActions, handleAddCategory } = useCategoryActions();

  // 3. Create columns with actions
  const columns = createCategoryColumns(tableActions);

  // 4. Create header component
  const headerActions = (
    <CategoryTableHeader onAddCategory={handleAddCategory} />
  );
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex justify-end px-4 pt-4 lg:px-6">
          <ReusableDialogForm
          triggerLabel="Add Category"
          formType='category'
          />
        </div>

        <div className="px-4 py-4 md:py-6 md:px-6">
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
        currentPage, pageSize, total: data?.data?.total || 0, totalPages,
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
