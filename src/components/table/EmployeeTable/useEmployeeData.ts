import { useState } from 'react';
import { useGetUsersWithPagination } from '@/state/employee';

export const useEmployeeData = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data,
    isLoading,
    error,
    totalPages,
    refetch,
    hasNextPage,
    hasPreviousPage,
  } = useGetUsersWithPagination(currentPage, pageSize, {
    search: searchTerm.trim() || undefined,
    sortBy: 'e.name',
    sortOrder: 'asc',
  });


  // ✅ Match real response shape
  const users = data?.data?.users ?? [];
  const total = data?.data?.total ?? 0;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const errorMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? (error as any).message
      : null;

  return {
    users,
    total,
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
