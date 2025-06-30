import { useState } from 'react';
import { useGetUsersWithPagination } from '@/state/employee';

export const useEmployeeData = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch paginated user data
  const {
    data,
    isLoading,
    error,
    totalPages,
    refetch,
    hasNextPage,
    hasPreviousPage
  } = useGetUsersWithPagination(currentPage, pageSize, {
    search: searchTerm.trim() || undefined,
    sortBy: 'e.name',
    sortOrder: 'asc',
  });

  // Handle search (reset to page 1)
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle changing number of items per page
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Safely extract error message
  const errorMessage = typeof error === 'object' && error !== null && 'message' in error
    ? (error as any).message
    : null;

  return {
    // Data
    users: data?.data?.users ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    error: errorMessage,

    // Pagination
    currentPage,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    searchTerm,

    // Handlers
    setCurrentPage,
    handleSearch,
    handlePageSizeChange,
    refetch,
  };
};
