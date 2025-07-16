import { useState } from 'react';
import { useGetBranchWithPagination } from '@/state/brnach';

export const useBranchData = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Use RTK Query hook
  const { 
    data, 
    isLoading, 
    error, 
    totalPages,
    refetch 
  } = useGetBranchWithPagination(currentPage, pageSize, {
    search: searchTerm ,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Format error message
  const errorMessage = error ? 
    ('message' in error ? error.message : 'An error occurred') : 
    null;

  return {
    // Data
    data,
    isLoading,
    error: errorMessage,
    
    // Pagination state
    currentPage,
    pageSize,
    totalPages,
    searchTerm,
    
    // Handlers
    handleSearch,
    setCurrentPage,
    handlePageSizeChange,
    refetch,
  };
};