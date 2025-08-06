import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface SalesOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  brand_name?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  line_total: number;
  line_cost?: number;
  line_profit?: number;
  warranty_expiry?: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  branch_id: string;
  branch_name: string;
  branch_code: string;
  sold_by?: string;
  employee_name?: string;
  employee_number?: string;
  order_date: string;
  status: string;
  payment_method?: string;
  payment_status: string;
  subtotal: number;
  total_amount: number;
  discount: number;
  total_cost?: number;
  profit_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: SalesOrderItem[];
}

export interface SalesOrderFilters {
  branch_id?: string;
  employee_id?: string;
  customer_id?: string;
  status?: string;
  payment_status?: string;
  order_date_from?: string;
  order_date_to?: string;
  sort_by?: 'order_date' | 'total_amount' | 'order_number' | 'customer_name';
  sort_order?: 'asc' | 'desc';
}

export interface SalesOrderStats {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  paid_orders: number;
  total_revenue: number;
  total_profit: number;
  average_order_value: number;
  unique_customers: number;
  branches_involved: number;
}

export const useSalesOrderData = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [stats, setStats] = useState<SalesOrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SalesOrderFilters>({
    sort_by: 'order_date',
    sort_order: 'desc',
  });

  // Fetch sales orders
  const fetchSalesOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>),
      });

      const response = await fetch(`/api/sales-orders/branch-wise?${params}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data.sales_orders);
        setTotal(result.data.pagination.total_count);
        setTotalPages(result.data.pagination.total_pages);
      } else {
        setError(result.message || 'Failed to fetch sales orders');
        toast.error(result.message || 'Failed to fetch sales orders');
      }
    } catch (err: any) {
      setError('An error occurred while fetching sales orders');
      toast.error('An error occurred while fetching sales orders');
      console.error('Error fetching sales orders:', err);
    } finally {
      setIsLoading(false);
      setSearchLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filters]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data.statistics);
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  }, [filters]);

  // Search handler
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    setSearchLoading(true);
  }, []);

  // Filter handlers
  const updateFilters = useCallback((newFilters: Partial<SalesOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      sort_by: 'order_date',
      sort_order: 'desc',
    });
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  // Page size change handler
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    fetchSalesOrders();
    fetchStats();
  }, [fetchSalesOrders, fetchStats]);

  // Effects
  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    orders,
    stats,
    isLoading,
    searchLoading,
    error,
    currentPage,
    pageSize,
    totalPages,
    total,
    searchTerm,
    filters,
    setCurrentPage,
    handlePageSizeChange,
    handleSearch,
    updateFilters,
    resetFilters,
    handleRefresh,
  };
};