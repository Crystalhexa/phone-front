"use client"
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { useCustomerActions } from '@/components/table/CustomerTable/CustomerAction'
import { createCustomerColumns } from '@/components/table/CustomerTable/CustomerColumn'
import { useCustomerData } from '@/components/table/CustomerTable/CustomerData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'

const page = () => {
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
  } = useCustomerData()

  const {
    tableActions,
    // EditDialog,
  } = useCustomerActions();

  const columns = createCustomerColumns(tableActions);

  const handleAddCustomer = () => {
    redirect('/dashboard/customers/register')
  }
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <Button onClick={handleAddCustomer} variant="outline" className="whitespace-nowrap">
            Add Customer
          </Button>
      {/* 🔍 Search input */}
      <Input
        type="text"
        placeholder="Search customer..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:w-64 w-full"
      />
    </div>
  )


  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="px-4 py-4 md:py-6 md:px-6">
          <DataTable
            data={data?.data?.customers || []}
            columns={columns}
            isLoading={isLoading}
            error={error}
            title="Customers"
            subtitle={`Total: ${data?.data?.total || 0} customers`}
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

        </div>
      </div>
    </div>
  )
}

export default page
