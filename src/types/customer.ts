export interface Customer {
  customer_id: number;
  name: string;
  email?: string | null;
  nic?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: Date;
  updated_at: Date;
}

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