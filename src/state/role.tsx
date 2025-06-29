import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ApiResponse } from "@/types/customer";
import {
  RoleWithPermissions,
  CreateRoleRequest,
  UpdateRoleRequest,
  Permission,
} from "@/types/role";

export const rolesApi = createApi({
  reducerPath: "rolesApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Role", "Permission"],
  endpoints: (builder) => ({
    // GET /api/auth/roles
    getAllRoles: builder.query<ApiResponse<RoleWithPermissions[]>, void>({
      query: () => `/auth/roles`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "Role" as const, id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),

    // GET /api/permissions
    getAllPermissions: builder.query<ApiResponse<Permission[]>, void>({
      query: () => `/auth/roles/permissions`,
      providesTags: [{ type: "Permission", id: "LIST" }],
    }),

    // GET /api/auth/roles/[id]
    getRoleById: builder.query<ApiResponse<RoleWithPermissions>, string>({
      query: (id) => `/auth/roles/${id}`,
      providesTags: (result, error, id) => [{ type: "Role", id }],
    }),

    // POST /api/auth/roles
    createRole: builder.mutation<ApiResponse<RoleWithPermissions>, CreateRoleRequest>({
      query: (body) => ({
        url: `/auth/roles`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),

    // PUT /api/auth/roles/[id]
    updateRole: builder.mutation<
      ApiResponse<RoleWithPermissions>,
      { id: string; body: UpdateRoleRequest }
    >({
      query: ({ id, body }) => ({
        url: `/auth/roles/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),

    // DELETE /api/auth/roles/[id]
    deleteRole: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/auth/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAllRolesQuery,
  useGetAllPermissionsQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
