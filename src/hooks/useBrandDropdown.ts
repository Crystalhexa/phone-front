import { useState, useEffect, useCallback } from 'react';
import { useGetAllBrandsQuery } from '@/state/brand';

export const useBrandDropdown = () => {
  const [currentPage, setCurrentPage] = useState<number>(10);
  const [pageSize, setPageSize] = useState<number>(1000); // Increased for dropdown
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use RTK Query hook with debounced search term
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useGetAllBrandsQuery({
    page: currentPage,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    search: debouncedSearchTerm || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    is_active: true // Only get active brands for dropdown
  });

  // Calculate pagination info from response
  const totalPages = data?.data ? Math.ceil(data.data.total / pageSize) : 0;
  const hasNextPage = data?.data ? (currentPage * pageSize) < data.data.total : false;
  const hasPreviousPage = currentPage > 1;

  // Handle search with immediate state update for UI responsiveness
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Format error message
  const errorMessage = error ?
    ('message' in error ? error.message : 'An error occurred') :
    null;

  return {
    // Data
    data,
    isLoading: isLoading || isFetching,
    error: errorMessage,
    
    // Pagination state
    currentPage,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    
    // Search state
    searchTerm,
    isSearching: searchTerm !== debouncedSearchTerm || isFetching,
    
    // Handlers
    handleSearch,
    setCurrentPage,
    handlePageSizeChange,
    refetch,
  };
};