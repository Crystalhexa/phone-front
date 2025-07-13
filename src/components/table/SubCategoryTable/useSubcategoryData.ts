import { useState } from 'react';
import { useGetSubcategoriesWithPagination } from '@/state/api';

export const useSubcategoryData = (categoryId: string) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const {
    data,
    isLoading,
    error,
    totalPages,
    refetch,
  } = useGetSubcategoriesWithPagination(categoryId,currentPage, pageSize, {
    search: searchTerm || undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const errorMessage = error
    ? ('message' in error ? error.message : 'An error occurred')
    : null;

  return {
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
