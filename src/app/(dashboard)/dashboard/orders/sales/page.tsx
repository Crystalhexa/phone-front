"use client";

import React from 'react';
import { DataTable } from '@/components/ui/DataTable/DataTable';
import { SalesOrderTableHeader } from '@/components/table/SalesOrderTable/SalesOrderTableHeader';
import { useSalesOrderData } from '@/components/table/SalesOrderTable/useSalesOrderData';
import { createSalesOrderColumns } from '@/components/table/SalesOrderTable/SalesOrderColumn';
import { StatsCards } from '@/components/table/SalesOrderTable/StatsCards';
import { SalesOrderFilters } from '@/components/table/SalesOrderTable/SalesOrderFilters';
import { useSalesOrderActions } from '@/components/table/SalesOrderTable/useSalesOrderActions';

const SalesOrdersTable: React.FC = () => {
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
  } = useSalesOrderData();

  const {
    tableActions,
    EditDialog,
    ReturnDialog,
    showReturn,
    selectedOrderForReturn,
  } = useSalesOrderActions();

  // Create columns with actions
  const columns = createSalesOrderColumns(tableActions);

  // If showing return, render it instead of the table
  if (showReturn && selectedOrderForReturn) {
    return (
      <div className="container mx-auto p-6">
        <ReturnDialog />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Header Section with Title, Buttons, and Search */}
      <SalesOrderTableHeader
        searchTerm={searchTerm}
        handleSearch={handleSearch}
        searchLoading={searchLoading}
        total={total}
      />

      {/* Filters Component */}
      <SalesOrderFilters
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
        title=""
        subtitle=""
        actions={null}
        searchable={false}
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
  );
};

export default SalesOrdersTable;