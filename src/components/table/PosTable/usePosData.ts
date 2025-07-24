import { useState, useEffect, useRef } from 'react';
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

  const fetchProducts = async () => {
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
  };

  // Debounced search effect
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (filters.search) {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      fetchProducts();
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [filters.search]);

  // Fetch products when pagination or non-search filters change
  useEffect(() => {
    fetchProducts();
  }, [
    pagination.page,
    pagination.limit,
    filters.sort,
    filters.order,
    filters.category_id,
    filters.subcategory_id,
    filters.brand_id,
    filters.stock_status,
    filters.low_stock_only,
    filters.has_stock,
    filters.min_stock,
    filters.max_stock
  ]);

  const resetFilters = () => {
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
  };

  const handleRefresh = () => {
    fetchProducts();
    toast.success('Products refreshed');
  };

  return {
    products,
    loading,
    pagination,
    setPagination,
    filters,
    setFilters,
    resetFilters,
    handleRefresh,
    fetchProducts
  };
};