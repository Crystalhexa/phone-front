"use client"

import React, { useState, useEffect, ReactNode, ReactElement } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Plus,
  Search,
  Columns3,
  Edit,
  Trash2,
  Eye,
} from "lucide-react"

// Type definitions
interface Subcategory {
  subcategory_id: number;
  name: string;
  description: string;
}

interface Category {
  category_id: number;
  name: string;
  description: string;
  subcategories: Subcategory[];
}

interface CategoriesResponse {
  categories: Category[];
  total: number;
  limit: number;
  offset: number;
}

interface QueryParams {
  limit?: number;
  offset?: number;
  page?: number;
}

interface UseGetAllCategoriesQueryResult {
  data: CategoriesResponse | null;
  isLoading: boolean;
  error: string | null;
}

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'outline' | 'success';
  className?: string;
  children: ReactNode;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children: ReactNode;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

interface DropdownMenuProps {
  children: ReactNode;
}

interface DropdownMenuTriggerProps {
  children: ReactElement;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

interface DropdownMenuContentProps {
  children: ReactNode;
  isOpen?: boolean;
  align?: 'right' | 'left' | 'center';
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
}

interface DropdownMenuCheckboxItemProps {
  children: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

interface SelectProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps {
  children: ReactNode;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  selectedValue?: string;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  children?: ReactNode;
}

interface SelectContentProps {
  children: ReactNode;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  selectedValue?: string;
  setSelectedValue?: (value: string) => void;
  onValueChange?: (value: string) => void;
}

interface SelectItemProps {
  children: ReactNode;
  value: string;
  selectedValue?: string;
  setSelectedValue?: (value: string) => void;
  onValueChange?: (value: string) => void;
  setIsOpen?: (open: boolean) => void;
}

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  className?: string;
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string;
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

// Custom hook to fetch categories
const useGetAllCategoriesQuery = (params: QueryParams = {}): UseGetAllCategoriesQueryResult => {
  const [data, setData] = useState<CategoriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());
        if (params.page) queryParams.append('page', params.page.toString());

        // Replace this URL with your actual API endpoint
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/categories?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch categories');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        // Mock data for demo purposes
        setData({
          categories: [
            {
              category_id: 1,
              name: "Electronics",
              description: "Electronic devices and accessories",
              subcategories: [
                { subcategory_id: 1, name: "Smartphones", description: "Mobile phones" },
                { subcategory_id: 2, name: "Laptops", description: "Portable computers" },
                { subcategory_id: 3, name: "Tablets", description: "Tablet computers" }
              ]
            },
            {
              category_id: 2,
              name: "Clothing",
              description: "Apparel and fashion items",
              subcategories: [
                { subcategory_id: 4, name: "Men's Wear", description: "Clothing for men" },
                { subcategory_id: 5, name: "Women's Wear", description: "Clothing for women" },
                { subcategory_id: 6, name: "Kids Wear", description: "Children's clothing" }
              ]
            },
            {
              category_id: 3,
              name: "Books",
              description: "Educational and entertainment books",
              subcategories: [
                { subcategory_id: 7, name: "Fiction", description: "Fiction books" },
                { subcategory_id: 8, name: "Non-Fiction", description: "Non-fiction books" }
              ]
            },
            {
              category_id: 4,
              name: "Home & Garden",
              description: "Home improvement and garden supplies",
              subcategories: []
            },
            {
              category_id: 5,
              name: "Sports",
              description: "Sports equipment and accessories",
              subcategories: [
                { subcategory_id: 9, name: "Basketball", description: "Basketball equipment" },
                { subcategory_id: 10, name: "Football", description: "Football equipment" }
              ]
            }
          ],
          total: 5,
          limit: params.limit || 10,
          offset: params.offset || 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [params.limit, params.offset, params.page]);

  return { data, isLoading, error };
};

// Badge component
const Badge: React.FC<BadgeProps> = ({ variant = "default", className = "", children, ...props }) => {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  const variants = {
    default: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    secondary: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    outline: "border border-gray-600 text-gray-300 bg-gray-800/50",
    success: "bg-green-500/20 text-green-300 border border-green-500/30",
  };
  
  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

// Button component
const Button: React.FC<ButtonProps> = ({ variant = "default", size = "default", className = "", children, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-500",
    outline: "border border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white",
    ghost: "hover:bg-gray-800 hover:text-white text-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700 border border-red-500",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  };
  
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Input component
const Input: React.FC<InputProps> = ({ className = "", ...props }) => {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

// Dropdown Menu components
const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <div className="relative" onBlur={() => setIsOpen(false)}>
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child, { isOpen, setIsOpen }) : child
      )}
    </div>
  );
};

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ children, isOpen, setIsOpen }) => {
  return React.cloneElement(children, {
    onClick: () => setIsOpen?.(!isOpen)
  });
};

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ children, isOpen, align = "right" }) => {
  if (!isOpen) return null;
  
  const alignmentClasses = {
    right: "right-0",
    left: "left-0",
    center: "left-1/2 transform -translate-x-1/2"
  };
  
  return (
    <div className={`absolute ${alignmentClasses[align]} mt-2 w-48 rounded-md border border-gray-600 bg-gray-800 py-1 shadow-lg z-50`}>
      {children}
    </div>
  );
};

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ children, onClick, variant = "default" }) => {
  const variants = {
    default: "text-gray-300 hover:bg-gray-700 hover:text-white",
    destructive: "text-red-400 hover:bg-red-900/20 hover:text-red-300"
  };
  
  return (
    <button
      className={`block w-full px-4 py-2 text-left text-sm ${variants[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const DropdownMenuCheckboxItem: React.FC<DropdownMenuCheckboxItemProps> = ({ children, checked, onCheckedChange }) => {
  return (
    <button
      className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
      onClick={() => onCheckedChange(!checked)}
    >
      <div className="mr-2 flex h-4 w-4 items-center justify-center">
        {checked && <div className="h-2 w-2 bg-blue-400 rounded-sm" />}
      </div>
      {children}
    </button>
  );
};

// Select components
const Select: React.FC<SelectProps> = ({ children, value, onValueChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedValue, setSelectedValue] = useState<string>(value || '');
  
  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child, { isOpen, setIsOpen, selectedValue });
          }
          if (child.type === SelectContent) {
            return React.cloneElement(child, { 
              isOpen, 
              setIsOpen, 
              selectedValue, 
              setSelectedValue, 
              onValueChange 
            });
          }
        }
        return child;
      })}
    </div>
  );
};

const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, isOpen, setIsOpen, selectedValue, className = "" }) => {
  return (
    <button
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-300 ring-offset-background placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setIsOpen?.(!isOpen)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, children }) => {
  return <span>{children || placeholder}</span>;
};

const SelectContent: React.FC<SelectContentProps> = ({ children, isOpen, setIsOpen, selectedValue, setSelectedValue, onValueChange }) => {
  if (!isOpen) return null;
  
  return (
    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-600 bg-gray-800 py-1 shadow-lg">
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child, {
          selectedValue,
          setSelectedValue,
          onValueChange,
          setIsOpen
        }) : child
      )}
    </div>
  );
};

const SelectItem: React.FC<SelectItemProps> = ({ children, value, selectedValue, setSelectedValue, onValueChange, setIsOpen }) => {
  return (
    <button
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-gray-300 outline-none hover:bg-gray-700 focus:bg-gray-700 ${
        selectedValue === value ? 'bg-gray-700' : ''
      }`}
      onClick={() => {
        setSelectedValue?.(value);
        onValueChange?.(value);
        setIsOpen?.(false);
      }}
    >
      {children}
    </button>
  );
};

// Table components
const Table: React.FC<TableProps> = ({ className = "", ...props }) => (
  <div className="relative w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
  </div>
);

const TableHeader: React.FC<TableHeaderProps> = ({ className = "", ...props }) => (
  <thead className={`[&_tr]:border-b [&_tr]:border-gray-700 ${className}`} {...props} />
);

const TableBody: React.FC<TableBodyProps> = ({ className = "", ...props }) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
);

const TableRow: React.FC<TableRowProps> = ({ className = "", ...props }) => (
  <tr className={`border-b border-gray-700 transition-colors hover:bg-gray-800/50 data-[state=selected]:bg-gray-800/50 ${className}`} {...props} />
);

const TableHead: React.FC<TableHeadProps> = ({ className = "", ...props }) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-gray-400 [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);

const TableCell: React.FC<TableCellProps> = ({ className = "", ...props }) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-300 ${className}`} {...props} />
);

// Categories Table Component
const CategoriesTable: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState<string>("");
  
  const { data, isLoading, error } = useGetAllCategoriesQuery({
    page: currentPage,
    limit: pageSize
  });

  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: "category_id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-medium text-gray-300">#{row.getValue("category_id")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: "Category Name",
      cell: ({ row }) => (
        <div className="font-medium text-white">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-gray-400 max-w-xs truncate">
          {row.getValue("description") || "No description"}
        </div>
      ),
    },
    {
      accessorKey: "subcategories",
      header: "Subcategories",
      cell: ({ row }) => {
        const subcategories = row.getValue("subcategories") as Subcategory[];
        if (!subcategories || subcategories.length === 0) {
          return <span className="text-gray-500 text-sm">No subcategories</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {subcategories.slice(0, 3).map((sub) => (
              <Badge key={sub.subcategory_id} variant="secondary">
                {sub.name}
              </Badge>
            ))}
            {subcategories.length > 3 && (
              <Badge variant="outline">
                +{subcategories.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "subcategories",
      header: "Count",
      id: "count",
      cell: ({ row }) => {
        const subcategories = row.getValue("subcategories") as Subcategory[];
        return (
          <div className="text-center">
            <Badge variant="outline">
              {subcategories ? subcategories.length : 0}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit Category
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.categories || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-2 text-gray-300">Loading categories...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-md p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Categories</h2>
          <p className="text-gray-400">Total: {data?.total || 0} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Columns3 className="mr-2 h-4 w-4" />
            Columns
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search categories..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-gray-400">
          Showing {Math.min((currentPage - 1) * pageSize + 1, data?.total || 0)} to{" "}
          {Math.min(currentPage * pageSize, data?.total || 0)} of {data?.total || 0} entries
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-300">Rows per page</p>
            <Select value={pageSize.toString()} onValueChange={(value: string) => setPageSize(Number(value))}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue>{pageSize}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium text-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};



export default CategoriesTable;