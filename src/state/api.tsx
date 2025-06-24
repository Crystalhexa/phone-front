import { Role } from "@/types/user";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
interface Subcategory {
  subcategory_id: number;
  name: string;
  description: string;
}

interface Category {
  category_id: number;
  name: string;
  description: string;
  subcategories: Subcategory[];
}


interface CategoriesListResponse {
  success: boolean;
  data: {
    categories: Category[];
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

interface CategoryApiResponse {
  subcategories(subcategories: any, separator: string): string | undefined;
  description: string;
  name: string | undefined;
  success: boolean;
  data: Category;
  message?: string;
}

interface CategoryFormData {
  name: string;
  description?: string;
  subcategories?: string[];
}

interface GetCategoriesParams {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface DeleteCategoryResponse {
  success: boolean;
  message: string;
}
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl:'/api',
  }),
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    // Query for fetching all categories with pagination and filtering
    getAllCategories: builder.query<CategoriesListResponse, GetCategoriesParams>({
      query: (params = {} as GetCategoriesParams) => {
        const searchParams = new URLSearchParams();
        
        // Handle pagination
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
        if (params.page) searchParams.append('page', params.page.toString());
        
        // Handle search and sorting
        if (params.search) searchParams.append('search', params.search);
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        
        return `products/categories?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.categories
          ? [
              ...result.data.categories.map(({ category_id }) => ({ type: 'Category' as const, id: category_id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
      // Transform the response to match your component's expected format
      transformResponse: (response: CategoriesListResponse) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Failed to fetch categories');
      },
      // Handle errors
      transformErrorResponse: (
        baseQueryReturnValue: import('@reduxjs/toolkit/query').FetchBaseQueryError,
        meta,
        arg
      ) => {
        if ('data' in baseQueryReturnValue && baseQueryReturnValue.data) {
          // If the error has a data property (API error)
          return {
            status: baseQueryReturnValue.status,
            message:
              (typeof baseQueryReturnValue.data === 'object' && 'message' in baseQueryReturnValue.data
                ? (baseQueryReturnValue.data as any).message
                : undefined) ||
              'An error occurred while fetching categories',
          };
        } else if ('error' in baseQueryReturnValue) {
          // If the error is a FETCH_ERROR
          return {
            status: baseQueryReturnValue.status,
            message: baseQueryReturnValue.error || 'A network error occurred while fetching categories',
          };
        }
        return {
          status: baseQueryReturnValue.status,
          message: 'An unknown error occurred while fetching categories',
        };
      },
    }),

    // Query for fetching a single category (for edit mode)
    getCategoryById: builder.query<CategoryApiResponse, string | number>({
      query: (id) => `products/categories/${id}`,
      providesTags: (result, error, id) => [{ type: 'Category', id }],
      transformResponse: (response: CategoryApiResponse) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Failed to fetch category');
      },
    }),

   addCategory: builder.mutation<CategoryApiResponse, CategoryFormData>({
  query: (body) => ({
    url: 'products/categories',
    method: 'POST',
    body,
  }),
  invalidatesTags: [{ type: 'Category', id: 'LIST' }],
}),


    // Mutation for updating an existing category
    updateCategory: builder.mutation<CategoryApiResponse, { id: string | number; body: CategoryFormData }>({
      query: ({ id, body }) => ({
        url: `products/categories/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Category', id }, 
        { type: 'Category', id: 'LIST' }
      ],
      transformResponse: (response: CategoryApiResponse) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Failed to update category');
      },
    }),

    // Mutation for deleting a category
    deleteCategory: builder.mutation<DeleteCategoryResponse, string | number>({
      query: (id) => ({
        url: `categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Category', id }, 
        { type: 'Category', id: 'LIST' }
      ],
      transformResponse: (response: DeleteCategoryResponse) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Failed to delete category');
      },
    }),

    // Bulk operations
    bulkDeleteCategories: builder.mutation<DeleteCategoryResponse, (string | number)[]>({
      query: (ids) => ({
        url: 'categories/bulk-delete',
        method: 'DELETE',
        body: { ids },
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    getRoles: builder.query<Role[], void>({
      query: () => 'auth/roles',
    }),

  }),
  
});

// Export hooks for usage in components
export const {
  useGetAllCategoriesQuery,
  useGetCategoryByIdQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useBulkDeleteCategoriesMutation,
  useGetRolesQuery,
  
} = api;

// Export types for use in components
export type {
  Category,
  Subcategory,
  CategoriesListResponse,
  CategoryApiResponse,
  CategoryFormData,
  GetCategoriesParams,
  
};

// Custom hook for better pagination handling
export const useGetCategoriesWithPagination = (
  page: number = 1,
  pageSize: number = 10,
  additionalParams?: Omit<GetCategoriesParams, 'page' | 'limit' | 'offset'>
) => {
  const offset = (page - 1) * pageSize;
  
  const result = useGetAllCategoriesQuery({
    page,
    limit: pageSize,
    offset,
    ...additionalParams,
  });

  return {
    ...result,
    // Add computed properties for easier pagination handling
    totalPages: result.data?.data ? Math.ceil(result.data.data.total / pageSize) : 0,
    hasNextPage: result.data?.data ? (page * pageSize) < result.data.data.total : false,
    hasPreviousPage: page > 1,
  };
};

