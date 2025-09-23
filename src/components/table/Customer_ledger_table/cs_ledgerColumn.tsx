import { CustomerLedger } from "@/types/customer";
import { TableAction } from "@/types/table";
import { ColumnDef } from "@tanstack/react-table";

export const createCustomerLedgerColumn = (
    action: TableAction[]
): ColumnDef<CustomerLedger>[] => [
        {
            accessorKey: 'transaction_number',
            header: 'Transaction No',
            size: 120,
            cell: ({ row }) => (
                <div>
                    {row.getValue('transaction_number')}
                </div>
            )
        },
        {
            accessorKey: 'transaction_type',
            header: 'Type',
            size: 120,
            cell: ({ row }) => (
                <div className="">
                    {row.getValue('transaction_type')}
                </div>
            )
        },
        {
            accessorKey: 'description',
            header: 'Description',
            size: 120,
            cell: ({ row }) => (
                <div className="">
                    {row.getValue('description')}
                </div>
            )
        },
        {
            accessorKey: 'debit',
            header: 'Debit',
            size: 120,
            cell: ({ row }) => (
                <div className="">
                    {row.getValue('debit')}
                </div>
            )
        },
        {
            accessorKey: 'credit',
            header: 'Credit',
            size: 120,
            cell: ({ row }) => (
                <div className="">
                    {row.getValue('credit')}
                </div>
            )
        },
        {
            accessorKey: 'balance',
            header: "Balance",
            size: 120,
            cell: ({ row }) => (
                <div className="">
                    {row.getValue('balance')}
                </div>
            )
        },
        {
            accessorKey: 'date',
            header: 'Date',
            size: 120,
            cell: ({ row }) => {
                const rawDate:Date = row.getValue('date');
                const date = new Date(rawDate)
                return (
                    <div className="" >
                        {date.toISOString().split("T")[0]}
                    </div >
                )
            }
        }
    ]