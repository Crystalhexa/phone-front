// export interface Customer {
//   customer_id: number;
//   name: string;
//   email?: string | null;
//   nic?: string | null;
//   phone?: string | null;
//   address?: string | null;
//   created_at: Date;
//   updated_at: Date;
// }

export interface CreateCustomerData {
  name: string;
  email?: string;
  nic?: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  nic?: string;
  phone?: string;
  address?: string;
}

export interface CustomerQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerPaginationResult {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: any[] | null;
  timestamp: string;
}
// Interfaces
export interface Customer {
  id: string;
  customer_number: string;
  name: string;
  email?: string;
  nic?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  credit_limit?: number;
  outstanding_balance: number;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerFormData {
    name: string;
    email: string | null;
    nic: string | null;
    phone: string | null;
    address: string | null;
    date_of_birth: Date | null;
    credit_limit: number | null;
    outstanding_balance: number;
    loyalty_points: number;
    is_active: boolean;
}

export interface CustomerApiResponse {
  success: boolean;
  data: Customer;
  message?: string;
}

export interface CustomersListResponse {
  success: boolean;
  data: {
    customers: Customer[];
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

export interface GetCustomersParams {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  is_active?: boolean;
}

export interface DeleteCustomerResponse {
  success: boolean;
  message: string;
}