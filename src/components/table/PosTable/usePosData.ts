import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ProductResponse, Filters } from '@/types/pos';

interface ApiResponse {
  success: boolean;
  data: {
    products: ProductResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      returned_count: number;
      total_count: number;
      filters_applied: any;
    };
  };
  message?: string;
  timestamp: string;
}

export const useProductsData = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sort: 'name',
    order: 'asc',
    category_id: '',
    subcategory_id: '',
    brand_id: '',
    stock_status: 'ALL',
    include_inactive: false,
    low_stock_only: false,
    has_stock: false,
    min_stock: '',
    max_stock: '',
    branch_id: ''
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Memoize fetchProducts to prevent unnecessary re-renders
  const fetchProducts = useCallback(async () => {
    if (!user?.branch_id) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sort,
        order: filters.order,
        include_inactive: filters.include_inactive.toString(),
        low_stock_only: filters.low_stock_only.toString(),
        branch_id: filters.branch_id,
        ...(filters.search && { search: filters.search }),
        ...(filters.category_id && { category_id: filters.category_id }),
        ...(filters.subcategory_id && { subcategory_id: filters.subcategory_id }),
        ...(filters.brand_id && { brand_id: filters.brand_id }),
        ...(filters.stock_status !== 'ALL' && { stock_status: filters.stock_status }),
        ...(filters.has_stock && { has_stock: 'true' }),
        ...(filters.min_stock && { min_stock: filters.min_stock }),
        ...(filters.max_stock && { max_stock: filters.max_stock }),
      });
      
      const response = await fetch(`/api/products/branch?${params}&branchId=${user?.branch_id}&includeBatches=true`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
          totalPages: data.data.pagination.totalPages
        }));
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error fetching products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    user?.branch_id,
    pagination.page,
    pagination.limit,
    filters.sort,
    filters.order,
    filters.search,
    filters.category_id,
    filters.subcategory_id,
    filters.brand_id,
    filters.stock_status,
    filters.include_inactive,
    filters.low_stock_only,
    filters.has_stock,
    filters.min_stock,
    filters.max_stock,
    filters.branch_id
  ]);

  // Single effect to handle all data fetching with debouncing for search
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // If it's a search change, debounce it and reset to page 1
    if (filters.search) {
      debounceTimeout.current = setTimeout(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchProducts();
      }, 500);
    } else {
      // For non-search filters, fetch immediately
      fetchProducts();
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [
    pagination.page,
    pagination.limit,
    filters.sort,
    filters.order,
    filters.search,
    filters.category_id,
    filters.subcategory_id,
    filters.brand_id,
    filters.stock_status,
    filters.low_stock_only,
    filters.has_stock,
    filters.min_stock,
    filters.max_stock,
    fetchProducts
  ]);

  // Memoize setFilters to prevent unnecessary re-renders
  const memoizedSetFilters = useCallback((updater: React.SetStateAction<Filters>) => {
    setFilters(updater);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      sort: 'name',
      order: 'asc',
      category_id: '',
      subcategory_id: '',
      brand_id: '',
      stock_status: 'ALL',
      include_inactive: false,
      low_stock_only: false,
      has_stock: false,
      min_stock: '',
      max_stock: '',
      branch_id: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    toast.success('Filters reset');
  }, []);

  const handleRefresh = useCallback(() => {
    fetchProducts();
    toast.success('Products refreshed');
  }, [fetchProducts]);

  return {
    products,
    loading,
    pagination,
    setPagination,
    filters,
    setFilters: memoizedSetFilters,
    resetFilters,
    handleRefresh,
    fetchProducts
  };
};