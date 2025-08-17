import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import {
    CreateUserRequest,
    CreateUserResponse,
    DeleteUserResponse,
    GetUserByIdResponse,
    GetUsersParams,
    UpdateUserRequest,
    UpdateUserResponse,
    UsersListResponse
} from '@/types/user'

export const employeeApi = createApi({
    reducerPath: 'employeeApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    tagTypes: ['User'],
    endpoints: (builder) => ({
        // ✅ Create User + Employee
        createUser: builder.mutation<CreateUserResponse, CreateUserRequest>({
            query: (body) => ({
                url: '/auth/employee',
                method: 'POST',
                body
            }),
            invalidatesTags: [{ type: 'User', id: 'LIST' }],
            transformResponse: (response: CreateUserResponse) => {
                if (response.success) return response
                throw new Error(response.message || 'User creation failed')
            },
            transformErrorResponse: (baseQueryReturnValue: any) => {
                return {
                    status: baseQueryReturnValue.status,
                    message: baseQueryReturnValue.data?.message ?? 'Error creating user'
                }
            }
        }),
        getUsers: builder.query<UsersListResponse, GetUsersParams | void>({
            query: (params:GetUsersParams = {}) => {
                const searchParams = new URLSearchParams()
                if (params.page) searchParams.set('page', String(params.page))
                if (params.limit) searchParams.set('limit', String(params.limit))
                if (params.search) searchParams.set('search', params.search)
                if (params.sortBy) searchParams.set('sortBy', params.sortBy)
                if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
                return `auth/employee?${searchParams.toString()}`
            },
            providesTags: (result) =>
                result?.data?.users
                    ? [
                        ...result.data.users.map((u) => ({ type: 'User' as const, id: u.id })),
                        { type: 'User', id: 'LIST' },
                    ]
                    : [{ type: 'User', id: 'LIST' }],
        }),

        // ✅ Get single user
        getUserById: builder.query<GetUserByIdResponse, string>({
            query: (id) => `auth/employee/${id}`,
            providesTags: (result, error, id) => [{ type: 'User', id }],
        }),

        // ✅ Update user
        updateUser: builder.mutation<UpdateUserResponse, { id: string; body: UpdateUserRequest }>({
            query: ({ id, body }) => ({
                url: `auth/employee/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'User', id },
                { type: 'User', id: 'LIST' },
            ],
        }),

        // ✅ Delete user
        deleteUser: builder.mutation<DeleteUserResponse, string>({
            query: (id) => ({
                url: `users/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [
                { type: 'User', id },
                { type: 'User', id: 'LIST' },
            ],
        }),
        // TODO: Add getUsers, updateUser, deleteUser here
    })
})

export const {
  useCreateUserMutation,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = employeeApi
export const useGetUsersWithPagination = (
  page: number = 1,
  pageSize: number = 10,
  filters?: Omit<GetUsersParams, 'page' | 'limit'>
) => {
  const query = useGetUsersQuery({
    page,
    limit: pageSize,
    ...filters,
  })

  return {
    ...query,
    totalPages: query.data?.data ? Math.ceil(query.data.data.total / pageSize) : 0,
    hasNextPage: query.data?.data ? page * pageSize < query.data.data.total : false,
    hasPreviousPage: page > 1,
  }
}
