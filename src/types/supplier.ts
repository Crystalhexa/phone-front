// Supplier base interface
export interface Supplier {
  id: string;
  name: string;
  code: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  sales_rep_name: string;
  sales_rep_phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Form data interface (for creating/updating suppliers)
export interface SupplierFormData {
  name: string;
  code: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  sales_rep_name: string;
  sales_rep_phone?: string;
  is_active: boolean;
}

// Request body interface (what gets sent to API)
export interface SupplierRequestBody {
  name: string;
  code: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  sales_rep_name: string;
  sales_rep_phone?: string | null;
  is_active: boolean;
}

// API Response interfaces
export interface SupplierApiResponse {
  success: boolean;
  message: string;
  data: Supplier;
}

export interface SuppliersListResponse {
  success: boolean;
  message: string;
  data: {
    suppliers: Supplier[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DeleteSupplierResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
  };
}

// Query parameters interface
export interface GetSuppliersParams {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: 'name' | 'code' | 'sales_rep_name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  is_active?: boolean;
  sales_rep?: string; // Filter by sales rep name
}

// Bulk operations interfaces
export interface BulkDeleteSuppliersRequest {
  ids: string[];
}

export interface BulkDeleteSuppliersResponse {
  success: boolean;
  message: string;
  data: {
    deleted_count: number;
    failed_ids?: string[];
  };
}

export interface BulkUpdateSuppliersRequest {
  ids: string[];
  updates: Partial<SupplierRequestBody>;
}

export interface BulkUpdateSuppliersResponse {
  success: boolean;
  message: string;
  data: {
    updated_count: number;
    failed_ids?: string[];
  };
}

// Search and filtering types
export interface SupplierSearchFilters {
  name?: string;
  code?: string;
  contact_name?: string;
  sales_rep_name?: string;
  is_active?: boolean;
  created_after?: string;
  created_before?: string;
}

export interface SupplierStatsResponse {
  success: boolean;
  message: string;
  data: {
    total_suppliers: number;
    active_suppliers: number;
    inactive_suppliers: number;
    suppliers_with_contact: number;
    suppliers_by_sales_rep: {
      sales_rep_name: string;
      count: number;
    }[];
  };
}