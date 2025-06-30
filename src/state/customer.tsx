import { CustomerApiResponse, CustomerFormData, CustomersListResponse, DeleteCustomerResponse, GetCustomersParams } from '@/types/customer';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';



// API
export const customersApi = createApi({
  reducerPath: 'customersApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Customer'],
  endpoints: (builder) => ({
    getAllCustomers: builder.query<CustomersListResponse, GetCustomersParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        if (params.is_active !== undefined) searchParams.append('is_active', String(params.is_active));

        return `customer?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.customers
          ? [
              ...result.data.customers.map((customer) => ({ type: 'Customer' as const, id: customer.id })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
      transformResponse: (response: CustomersListResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to fetch customers');
      },
    }),

    getCustomerById: builder.query<CustomerApiResponse, string | number>({
      query: (id) => `customer/${id}`,
      providesTags: (result, error, id) => [{ type: 'Customer', id }],
      transformResponse: (response: CustomerApiResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to fetch customer');
      },
    }),

    addCustomer: builder.mutation<CustomerApiResponse, CustomerFormData>({
      query: (body) => ({
        url: 'customer',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),

    updateCustomer: builder.mutation<CustomerApiResponse, { id: string | number; body: CustomerFormData }>({
      query: ({ id, body }) => ({
        url: `customer/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
      transformResponse: (response: CustomerApiResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to update customer');
      },
    }),

    deleteCustomer: builder.mutation<DeleteCustomerResponse, string | number>({
      query: (id) => ({
        url: `customer/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
      transformResponse: (response: DeleteCustomerResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to delete customer');
      },
    }),
  }),
});

// Hooks
export const {
  useGetAllCustomersQuery,
  useGetCustomerByIdQuery,
  useAddCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = customersApi;

// Optional: pagination hook
export const useGetCustomerWithPagination = (
  page: number = 1,
  pageSize: number = 10,
  additionalParams?: Omit<GetCustomersParams, 'page' | 'limit' | 'offset'>
) => {
  const offset = (page - 1) * pageSize;

  const result = useGetAllCustomersQuery({
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
