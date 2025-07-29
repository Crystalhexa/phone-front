"use client"
import React from 'react'
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { PurchaseOrderTableHeader } from '@/components/table/PurcheseOrderTable/PurchaseOrderTableHeader'
import { usePurchaseOrderData } from '@/components/table/PurcheseOrderTable/usePurchaseOrderData'
import { createPurchaseOrderColumns } from '@/components/table/PurcheseOrderTable/PurchaseOrderColumn'
import { usePurchaseOrderActions } from '@/components/table/PurcheseOrderTable/usePurchaseOrderActions'
import { StatsCards } from '@/components/table/PurcheseOrderTable/StatsCards'
import { PurchaseOrderFilters } from '@/components/table/PurcheseOrderTable/PurchaseOrderFilters'

const PurchaseOrdersTable: React.FC = () => {
  // Custom hooks
  const {
    orders,
    stats,
    isLoading,
    searchLoading,
    handleSearch,
    searchTerm,
    error,
    currentPage,
    pageSize,
    totalPages,
    total,
    setCurrentPage,
    handlePageSizeChange,
    filters,
    updateFilters,
    resetFilters,
    handleRefresh,
  } = usePurchaseOrderData()

  const {
    tableActions,
    EditDialog,
    GRNDialog,
    showGRN,
    selectedOrderForGRN,
    handleBackFromGRN,
  } = usePurchaseOrderActions()

  // Create columns with actions
  const columns = createPurchaseOrderColumns(tableActions)

  // If showing GRN, render it instead of the table
  if (showGRN && selectedOrderForGRN) {
    return (
      <div className="container mx-auto p-6">
        <GRNDialog />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Header Section with Title, Buttons, and Search */}
      <PurchaseOrderTableHeader 
        searchTerm={searchTerm}
        handleSearch={handleSearch}
        searchLoading={searchLoading}
        total={total}
      />

      {/* Filters Component */}
      <PurchaseOrderFilters 
        filters={filters}
        updateFilters={updateFilters}
        resetFilters={resetFilters}
        handleRefresh={handleRefresh}
        total={total}
      />

      {/* Data Table */}
      <DataTable
        data={orders || []}
        columns={columns}
        isLoading={isLoading}
        error={error}
        title="" // Remove title since it's in header
        subtitle="" // Remove subtitle since it's in header
        actions={null} // Remove actions since they're in header
        searchable={false} // Disable built-in search since we're using custom input
          pagination={{
          currentPage,
          pageSize,
          total: total || 0,
          totalPages,
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Modals */}
      <EditDialog />
    </div>
  )
}

export default PurchaseOrdersTable