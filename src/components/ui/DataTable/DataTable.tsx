import React, { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { TableHeader as DataTableHeader } from './TableHeader';
import { SearchBar } from './SearchBar';
import { TablePagination } from './TablePagination';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { DataTableProps } from '@/types/table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow  } from '../table';

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  error = null,
  pagination,
  onPageChange,
  onPageSizeChange,
  searchable = true,
  searchPlaceholder = "Search...",
  title,
  subtitle,
  actions,
  className = ""
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  if (isLoading) {
    return <LoadingState message={`Loading ${title?.toLowerCase() || 'data'}...`} />;
  }

  if (error && !data.length) {
    return <ErrorState error={error} />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <DataTableHeader 
        title={title}
        subtitle={subtitle}
        actions={actions}
      />

      {searchable && (
        <SearchBar
          value={globalFilter ?? ""}
          onChange={setGlobalFilter}
          placeholder={searchPlaceholder}
          className="flex-1"
        />
      )}

      <div className="rounded-md border border-gray-700 bg-gray-900 shadow-sm">
        <Table>
          <TableHeader className="bg-gray-800/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-400"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && onPageChange && onPageSizeChange && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
