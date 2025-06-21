import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  }),
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    // Query for fetching a single category (for edit mode)
    getCategoryById: builder.query<CategoryApiResponse, string>({
      query: (id) => `categories/${id}`,
      providesTags: (result, error, id) => [{ type: 'Category', id }],
    }),
    // Mutation for adding a new category
    addCategory: builder.mutation<CategoryApiResponse, CategoryFormData>({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }], // Invalidate list after creation
    }),
    // Mutation for updating an existing category
    updateCategory: builder.mutation<CategoryApiResponse, { id: string; body: CategoryFormData }>({
      query: ({ id, body }) => ({
        url: `categories/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Category', id }, { type: 'Category', id: 'LIST' }], // Invalidate specific and list
    }),
  })
})
export const {
  useGetCategoryByIdQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
} = api;

// Types for RTK Query
interface CategoryApiResponse {
  id?: string;
  name: string;
  description?: string;
  subcategories: string[];
}

// Ensure CategoryFormData is imported from your form component schema or defined here
// (It's better to import from the form if the schema originates there)
export interface CategoryFormData {
  name: string;
  description?: string;
}

