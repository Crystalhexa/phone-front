"use client"
import { createCustomerLedgerColumn } from '@/components/table/Customer_ledger_table/cs_ledgerColumn';
import { useCustomerActions } from '@/components/table/CustomerTable/CustomerAction';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable/DataTable'
import { useAuth } from '@/hooks/useAuth';
import { CustomerStatementPrinter, StatementData } from '@/lib/utils/customerLedgerPrint';
import { Customer, CustomerLedger } from '@/types/customer';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
const page = () => {

  const {user}  = useAuth();
  const params = useParams();
  const id = params.customerId;
  const [ledger, setLedger] = useState<CustomerLedger[]>([]);
  const [customer, setCustomer] = useState<Customer>({"name":"janath","address":"asa" } as Customer);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>();
  const [endDate, setEndDate] = useState<Date | null>(null);

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

  const generateStatement =()=>{
    const statementData = generateStatementData();
    CustomerStatementPrinter.previewStatement(statementData, user);
  }


  const generateStatementData = ():StatementData  =>{  
    return {
      customer: customer,
      transactions: ledger,
      statement_period: {
        from_date: startDate || new Date(),
        to_date: endDate || new Date(),
      },

    }
  }

  const {
    tableActions,
  } = useCustomerActions();

  const resetDates = ()=>{
    setStartDate(null);
    setEndDate(null);
  }

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
        className="border border-gray-600 rounded px-2 py-1"
      />
      <Button 
        onClick={resetDates}
        className='ml-2 px-3 py-1 rounded bg-gray-800 hover:bg-gray-600'
      >
        Reset
      </Button>
      <Button
       onClick={generateStatement}
       className='ml-2 px-3 py-1 rounded bg-blue-800 hover:bg-blue-600' 
      >
        Generate Statement
      </Button>
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
        searchable={false}
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