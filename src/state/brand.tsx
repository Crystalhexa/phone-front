// api/brands.ts - Brand-specific endpoints
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Brand interfaces
export interface Brand {
  brand_id: number;
  code: string; // Added code field
  name: string;
  description: string;
  logo_url?: string;
  website_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandApiResponse {
  success: boolean;
  data: Brand;
  message?: string;
}

export interface BrandsListResponse {
  success: boolean;
  data: {
    brands: Brand[];
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

export interface BrandFormData {
  name: string;
  code: string; // Added code field
  description?: string;
  logo_url?: string;
  website_url?: string;
  is_active?: boolean;
}

export interface GetBrandsParams {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  is_active?: boolean;
}

export interface DeleteBrandResponse {
  success: boolean;
  message: string;
}

export const brandsApi = createApi({
  reducerPath: 'brandsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Brand'],
  endpoints: (builder) => ({
    getAllBrands: builder.query<BrandsListResponse, GetBrandsParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.search) searchParams.append('search', params.search);
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        if (params.is_active !== undefined) searchParams.append('is_active', String(params.is_active));

        return `products/brands?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.brands
          ? [
              ...result.data.brands.map((brand) => ({ type: 'Brand' as const, id: brand.brand_id })),
              { type: 'Brand', id: 'LIST' },
            ]
          : [{ type: 'Brand', id: 'LIST' }],
      transformResponse: (response: BrandsListResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to fetch brands');
      },
    }),

    getBrandById: builder.query<BrandApiResponse, string | number>({
      query: (id) => `products/brands/${id}`,
      providesTags: (result, error, id) => [{ type: 'Brand', id }],
      transformResponse: (response: BrandApiResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to fetch brand');
      },
    }),

    addBrand: builder.mutation<BrandApiResponse, BrandFormData>({
      query: (body) => ({
        url: 'products/brands',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Brand', id: 'LIST' }],
    }),

    updateBrand: builder.mutation<BrandApiResponse, { id: string | number; body: BrandFormData }>({
      query: ({ id, body }) => ({
        url: `products/brands/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Brand', id },
        { type: 'Brand', id: 'LIST' },
      ],
      transformResponse: (response: BrandApiResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to update brand');
      },
    }),

    deleteBrand: builder.mutation<DeleteBrandResponse, string | number>({
      query: (id) => ({
        url: `products/brands/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Brand', id },
        { type: 'Brand', id: 'LIST' },
      ],
      transformResponse: (response: DeleteBrandResponse) => {
        if (response.success) return response;
        throw new Error(response.message || 'Failed to delete brand');
      },
    }),
  }),
});

// Hooks
export const {
  useGetAllBrandsQuery,
  useGetBrandByIdQuery,
  useAddBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} = brandsApi;

// Custom hook with pagination
export const useGetBrandWithPagination = (
  page: number = 1,
  pageSize: number = 10,
  additionalParams?: Omit<GetBrandsParams, 'page' | 'limit' | 'offset'>
) => {
  const offset = (page - 1) * pageSize;

  const result = useGetAllBrandsQuery({
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
