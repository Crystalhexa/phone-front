"use client"
import CustomFormField, { FormFieldType } from '@/components/form/common/CustomFormField';
import { createCustomerLedgerColumn } from '@/components/table/Customer_ledger_table/cs_ledgerColumn';
import { useCustomerActions } from '@/components/table/CustomerTable/CustomerAction';
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { Customer, CustomerLedger } from '@/types/customer';
import { da } from 'date-fns/locale';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
const page = () => {
  const params = useParams();
  const id = params.customerId;
  const [ledger, setLedger] = useState<CustomerLedger[]>([]);
  const [customer, setCustomer] = useState<Customer>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  console.log(pagination)
  useEffect(() => {
    fetchData();
  }, [id, currentPage, pageSize,startDate, endDate]);


  const fetchData = async () => {
    try {
      setIsLoading(true);
      if (!id) return;
      const res = await fetch(`/api/customer/statement?customer_id=${id}&page=${currentPage}&limit=${pageSize}&start_date=${startDate?.toISOString() || ''}&end_date=${endDate?.toISOString() || ''}`);
      const data = await res.json();
      setPagination(data.pagination);
      setLedger(data.ledger);
      setCustomer(data.customer)
      setIsLoading(false);
    } catch (error) {
      setError(error as string);
      setIsLoading(false);
      console.error("Error fetching data:", error);
    }
  }
  const {
    tableActions,
  } = useCustomerActions();

  const headerActions = (
    <div>
      <DatePicker
        selected={startDate}
        onChange={(dates: [Date | null, Date | null]) => {
          const [start, end] = dates;
          setStartDate(start);
          setEndDate(end);
        }}
        startDate={startDate}
        endDate={endDate}
        selectsRange
        showMonthDropdown
        showYearDropdown
        className="border border-gray-300 rounded px-2 py-1"
      />

    </div>
  )
  const collumns = createCustomerLedgerColumn(tableActions);

  return (
    <div>
      <DataTable
        data={ledger || []}
        columns={collumns}
        isLoading={isLoading}
        error={error || null}
        title={`Customer Statement - ${customer?.name || 'No Name'}`}
        actions={headerActions}
        pagination={{
          currentPage,
          pageSize,
          total: pagination?.total_items,
          totalPages: pagination?.total_pages
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}

export default page