import { BranchApiResponse, BranchesListResponse, DeleteBranchResponse, GetBranchesParams,BranchFormData } from '@/types/branch';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';



export const branchesApi = createApi({
  reducerPath: 'branchesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Branch'],
  endpoints: (builder) => ({
    getAllBranches: builder.query<BranchesListResponse, GetBranchesParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        if (params.is_active !== undefined) searchParams.append('is_active', String(params.is_active));

        return `/branches?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.branches
          ? [
              ...result.data.branches.map((branch) => ({ type: 'Branch' as const, id: branch.id })),
              { type: 'Branch', id: 'LIST' },
            ]
          : [{ type: 'Branch', id: 'LIST' }],
      transformResponse: (response: BranchesListResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to fetch branches');
      },
    }),

    getBranchById: builder.query<BranchApiResponse, string | number>({
      query: (id) => `/branches/${id}`,
      providesTags: (result, error, id) => [{ type: 'Branch', id }],
      transformResponse: (response: BranchApiResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to fetch branch');
      },
    }),

    addBranch: builder.mutation<BranchApiResponse, BranchFormData>({
      query: (body) => ({
        url: '/branches',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Branch', id: 'LIST' }],
    }),

    updateBranch: builder.mutation<BranchApiResponse, { id: string | number; body: BranchFormData }>({
      query: ({ id, body }) => ({
        url: `/branches/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Branch', id },
        { type: 'Branch', id: 'LIST' },
      ],
      transformResponse: (response: BranchApiResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to update branch');
      },
    }),

    deleteBranch: builder.mutation<DeleteBranchResponse, string | number>({
      query: (id) => ({
        url: `/branches/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Branch', id },
        { type: 'Branch', id: 'LIST' },
      ],
      transformResponse: (response: DeleteBranchResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to delete branch');
      },
    }),
  }),
});

// Hooks
export const {
  useGetAllBranchesQuery,
  useGetBranchByIdQuery,
  useAddBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} = branchesApi;

// Custom hook with pagination
export const useGetBranchWithPagination = (
  page: number = 1,
  pageSize: number = 10,
  additionalParams?: Omit<GetBranchesParams, 'page' | 'limit' | 'offset'>
) => {
  const offset = (page - 1) * pageSize;

  const result = useGetAllBranchesQuery({
    page,
    limit: pageSize,
    offset,
    ...additionalParams,
  });

  return {
    ...result,
    totalPages: result.data?.data ? Math.ceil(result.data.data.total / pageSize) : 0,
    hasNextPage: result.data?.data ? (page * pageSize) < result.data.data.total : false,
    hasPreviousPage: page > 1,
  };
};
