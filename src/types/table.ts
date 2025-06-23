import { ColumnDef } from "@tanstack/react-table";

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TableAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  handleSearch?: (searchTerm: string) => void;
  isLoading?: boolean;
  error?: string | null;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}
