import { AttributeApiResponse, AttributeFormData, AttributeRequestBody, AttributesListResponse, DeleteAttributeResponse, GetAttributesParams } from "@/types/attribute";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const attributesApi = createApi({
  reducerPath: "attributesApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Attribute"],
  endpoints: (builder) => ({
    getAllAttributes: builder.query<AttributesListResponse, GetAttributesParams>({
      query: (params = {} as GetAttributesParams) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.offset) searchParams.append("offset", params.offset.toString());
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.search) searchParams.append("search", params.search);
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

        return `products/attributes?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.attributes
          ? [
              ...result.data.attributes.map(({ id }) => ({ type: "Attribute" as const, id })),
              { type: "Attribute", id: "LIST" },
            ]
          : [{ type: "Attribute", id: "LIST" }],
    }),

    getAttributeById: builder.query<AttributeApiResponse, string>({
      query: (id) => `products/attributes/${id}`,
      providesTags: (result, error, id) => [{ type: "Attribute", id }],
    }),

    addAttribute: builder.mutation<AttributeApiResponse, AttributeRequestBody>({
      query: (body) => ({
        url: `products/attributes`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Attribute", id: "LIST" }],
    }),

    updateAttribute: builder.mutation<AttributeApiResponse, { id: string; body: AttributeRequestBody }>({
      query: ({ id, body }) => ({
        url: `products/attributes/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Attribute", id },
        { type: "Attribute", id: "LIST" },
      ],
    }),

    deleteAttribute: builder.mutation<DeleteAttributeResponse, string>({
      query: (id) => ({
        url: `products/attributes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Attribute", id },
        { type: "Attribute", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAllAttributesQuery,
  useGetAttributeByIdQuery,
  useAddAttributeMutation,
  useUpdateAttributeMutation,
  useDeleteAttributeMutation,
} = attributesApi;


export const useGetAttributesWithPagination = (
  page: number = 1,
  pageSize: number = 10,
  additionalParams?: Omit<GetAttributesParams, 'page' | 'limit' | 'offset'>
) => {
  const offset = (page - 1) * pageSize;

  const result = useGetAllAttributesQuery({
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
