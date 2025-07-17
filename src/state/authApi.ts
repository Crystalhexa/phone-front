// state/api/authApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { User } from '@/types/auth';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
    permissions: string[];
  };
  message?: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/auth',
    prepareHeaders: (headers, { getState }: any) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Profile', 'Auth'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
      // Clear all cached data on successful login
      invalidatesTags: ['Profile', 'Auth'],
      // Optional: Clear cache on any login attempt
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Clear the entire cache to prevent stale data
          dispatch(authApi.util.resetApiState());
        } catch (error) {
          // Handle error if needed
        }
      },
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({
        url: '/register',
        method: 'POST',
        body,
      }),
      // Clear all cached data on successful registration
      invalidatesTags: ['Profile', 'Auth'],
      // Optional: Clear cache on any registration attempt
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Clear the entire cache to prevent stale data
          dispatch(authApi.util.resetApiState());
        } catch (error) {
          // Handle error if needed
        }
      },
    }),
    getProfile: builder.query<AuthResponse, void>({
      query: () => '/me',
      providesTags: ['Profile'],
      // Force refetch on mount and focus to ensure fresh data
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
      // Clear all cached data on logout
      invalidatesTags: ['Profile', 'Auth'],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          // Even if logout fails on server, clear local cache
        } finally {
          // Always clear the cache on logout
          dispatch(authApi.util.resetApiState());
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useLogoutMutation,
} = authApi;