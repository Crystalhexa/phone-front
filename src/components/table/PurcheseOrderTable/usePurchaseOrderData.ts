import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Types
interface PurchaseOrder {
  id: string;
  order_number: string;
  invoice_number?: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  purchased_by?: string;
  purchaser_name?: string;
  branch_id?: string;
  branch_name?: string;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  status: 'PENDING' | 'COMPLETED' | 'RECEIVED' | 'CANCELLED';
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
  items?: any[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface DashboardStats {
  pending_count: number;
  completed_count: number;
  received_count: number;
  cancelled_count: number;
  total_orders: number;
  total_amount: string;
  pending_amount: string;
  received_amount: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    orders: PurchaseOrder[];
    pagination: PaginationMeta;
    stats?: DashboardStats;
  };
  message: string;
  timestamp: string;
}

interface Filters {
  search: string;
  sortBy: 'order_date' | 'order_number' | 'total_amount' | 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';
  status: 'PENDING' | 'COMPLETED' | 'RECEIVED' | 'CANCELLED' | '';
  supplier_id: string;
  branch_id: string;
  purchased_by: string;
  date_from: string;
  date_to: string;
  include_items: boolean;
  include_stats: boolean;
}

export const usePurchaseOrderData = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    status: '',
    supplier_id: '',
    branch_id: '',
    purchased_by: '',
    date_from: '',
    date_to: '',
    include_items: false,
    include_stats: false,
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch orders function
  const fetchOrders = async (isSearch = false) => {
    if (isSearch) {
      setSearchLoading(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        include_items: filters.include_items.toString(),
        include_stats: filters.include_stats.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
        ...(filters.branch_id && { branch_id: filters.branch_id }),
        ...(filters.purchased_by && { purchased_by: filters.purchased_by }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      });

      const response = await fetch(`/api/purchase-orders/list?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setOrders(data.data.orders);
        setTotal(data.data.pagination.total);
        setTotalPages(data.data.pagination.total_pages);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      } else {
        toast.error('Failed to fetch purchase orders');
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Error fetching purchase orders. Please try again.');
    } finally {
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (filters.search) {
        setCurrentPage(1);
      }
      fetchOrders(true);
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [filters.search]);

  // Fetch orders when pagination or non-search filters change
  useEffect(() => {
    fetchOrders();
  }, [
    currentPage,
    pageSize,
    filters.sortBy,
    filters.sortOrder,
    filters.status,
    filters.supplier_id,
    filters.branch_id,
    filters.purchased_by,
    filters.date_from,
    filters.date_to,
    filters.include_items,
  ]);

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const updateFilters = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sortBy: 'created_at',
      sortOrder: 'desc',
      status: '',
      supplier_id: '',
      branch_id: '',
      purchased_by: '',
      date_from: '',
      date_to: '',
      include_items: false,
      include_stats: false,
    });
    setSearchTerm('');
    setCurrentPage(1);
    toast.success('Filters reset');
  };

  const handleRefresh = () => {
    fetchOrders();
    toast.success('Purchase orders refreshed');
  };

  return {
    // Data
    data: { orders, stats },
    orders,
    stats,
    isLoading,
    searchLoading,
    error: null, // You can implement error handling as needed
    // Pagination state
    currentPage,
    pageSize,
    totalPages,
    total,
    searchTerm,
    filters,
    // Handlers
    handleSearch,
    setCurrentPage,
    handlePageSizeChange,
    updateFilters,
    resetFilters,
    handleRefresh,
    fetchOrders,
  };
};