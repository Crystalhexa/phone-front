import { 
  SupplierApiResponse, 
  SupplierRequestBody, 
  SuppliersListResponse, 
  DeleteSupplierResponse, 
  GetSuppliersParams,
  BulkDeleteSuppliersRequest,
  BulkDeleteSuppliersResponse,
  BulkUpdateSuppliersRequest,
  BulkUpdateSuppliersResponse,
  SupplierStatsResponse
} from "@/types/supplier";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const suppliersApi = createApi({
  reducerPath: "suppliersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Supplier", "SupplierStats"],
  endpoints: (builder) => ({
    getAllSuppliers: builder.query<SuppliersListResponse, GetSuppliersParams>({
      query: (params = {} as GetSuppliersParams) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.offset) searchParams.append("offset", params.offset.toString());
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.search) searchParams.append("search", params.search);
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);
        if (params.is_active !== undefined) searchParams.append("is_active", params.is_active.toString());
        if (params.sales_rep) searchParams.append("sales_rep", params.sales_rep);

        return `suppliers?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.suppliers
          ? [
              ...result.data.suppliers.map(({ id }) => ({ type: "Supplier" as const, id })),
              { type: "Supplier", id: "LIST" },
            ]
          : [{ type: "Supplier", id: "LIST" }],
    }),

    getSupplierById: builder.query<SupplierApiResponse, string>({
      query: (id) => `suppliers/${id}`,
      providesTags: (result, error, id) => [{ type: "Supplier", id }],
    }),

    addSupplier: builder.mutation<SupplierApiResponse, SupplierRequestBody>({
      query: (body) => ({
        url: `suppliers`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Supplier", id: "LIST" },
        { type: "SupplierStats", id: "STATS" }
      ],
    }),

    updateSupplier: builder.mutation<SupplierApiResponse, { id: string; body: SupplierRequestBody }>({
      query: ({ id, body }) => ({
        url: `suppliers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Supplier", id },
        { type: "Supplier", id: "LIST" },
        { type: "SupplierStats", id: "STATS" }
      ],
    }),

    deleteSupplier: builder.mutation<DeleteSupplierResponse, string>({
      query: (id) => ({
        url: `suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Supplier", id },
        { type: "Supplier", id: "LIST" },
        { type: "SupplierStats", id: "STATS" }
      ],
    }),

    // Bulk operations
    bulkDeleteSuppliers: builder.mutation<BulkDeleteSuppliersResponse, BulkDeleteSuppliersRequest>({
      query: (body) => ({
        url: `suppliers/bulk-delete`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: [
        { type: "Supplier", id: "LIST" },
        { type: "SupplierStats", id: "STATS" }
      ],
    }),

    bulkUpdateSuppliers: builder.mutation<BulkUpdateSuppliersResponse, BulkUpdateSuppliersRequest>({
      query: (body) => ({
        url: `suppliers/bulk-update`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "Supplier", id: "LIST" },
        { type: "SupplierStats", id: "STATS" }
      ],
    }),

    // Get supplier statistics
    getSupplierStats: builder.query<SupplierStatsResponse, void>({
      query: () => `suppliers/stats`,
      providesTags: [{ type: "SupplierStats", id: "STATS" }],
    }),

    // Search suppliers by code (for validation)
    checkSupplierCodeExists: builder.query<{ exists: boolean }, string>({
      query: (code) => `suppliers/check-code/${encodeURIComponent(code)}`,
    }),

    // Get suppliers by sales rep
    getSuppliersBySalesRep: builder.query<SuppliersListResponse, { salesRep: string; params?: Omit<GetSuppliersParams, 'sales_rep'> }>({
      query: ({ salesRep, params = {} }) => {
        const searchParams = new URLSearchParams();
        searchParams.append("sales_rep", salesRep);
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.offset) searchParams.append("offset", params.offset.toString());
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.search) searchParams.append("search", params.search);
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);
        if (params.is_active !== undefined) searchParams.append("is_active", params.is_active.toString());

        return `suppliers?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.suppliers
          ? [
              ...result.data.suppliers.map(({ id }) => ({ type: "Supplier" as const, id })),
              { type: "Supplier", id: "LIST" },
            ]
          : [{ type: "Supplier", id: "LIST" }],
    }),

    // Toggle supplier active status
    toggleSupplierStatus: builder.mutation<SupplierApiResponse, { id: string; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `suppliers/${id}/toggle-status`,
        method: "PATCH",
        body: { is_active },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Supplier", id },
        { type: "Supplier", id: "LIST" },
        { type: "SupplierStats", id: "STATS" }
      ],
    }),
  }),
});

export const {
  useGetAllSuppliersQuery,
  useGetSupplierByIdQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useBulkDeleteSuppliersMutation,
  useBulkUpdateSuppliersMutation,
  useGetSupplierStatsQuery,
  useCheckSupplierCodeExistsQuery,
  useGetSuppliersBySalesRepQuery,
  useToggleSupplierStatusMutation,
} = suppliersApi;

// Custom hook for pagination
export const useGetSuppliersWithPagination = (
  page: number = 1,
  pageSize: number = 10,
  additionalParams?: Omit<GetSuppliersParams, 'page' | 'limit' | 'offset'>
) => {
  const offset = (page - 1) * pageSize;

  const result = useGetAllSuppliersQuery({
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

// Custom hook for searching suppliers
export const useSearchSuppliers = (
  searchTerm: string,
  filters?: Omit<GetSuppliersParams, 'search'>,
  options?: { skip?: boolean; debounceMs?: number }
) => {
  const { skip = false, debounceMs = 300 } = options || {};
  
  return useGetAllSuppliersQuery(
    {
      search: searchTerm,
      ...filters,
    },
    {
      skip: skip || !searchTerm.trim(),
      // Note: You might want to implement debouncing in your component
    }
  );
};

// Custom hook for getting active suppliers only  
export const useGetActiveSuppliersQuery = (params?: Omit<GetSuppliersParams, 'is_active'>) => {
  return useGetAllSuppliersQuery({
    is_active: true,
    ...params,
  });
};

// Custom hook for supplier code validation
export const useSupplierCodeValidation = (code: string, skip?: boolean) => {
  return useCheckSupplierCodeExistsQuery(code, {
    skip: skip || !code.trim(),
  });
};