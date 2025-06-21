import { useMemo } from 'react';
import { useGetCategoryByIdQuery } from '@/state/api';
import { Category } from '@/types/category';

export const useCategory = (categoryId?: string) => {
  const {
    data: category,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetCategoryByIdQuery(categoryId!, {
    skip: !categoryId,
  });

  const categoryData = useMemo(() => {
    if (!category) return null;
    return category as Category;
  }, [category]);

  return {
    category: categoryData,
    isLoading,
    isError,
    error,
    refetch,
  };
};