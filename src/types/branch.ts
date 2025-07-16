// Branch interfaces
export interface Branch {
  id: string;
  name: string;
  code: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  is_main_branch?: boolean;
  can_purchase?: boolean;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BranchApiResponse {
  success: boolean;
  data: Branch;
  message?: string;
}

export interface BranchesListResponse {
  success: boolean;
  data: {
    branches: Branch[];
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

export interface BranchFormData {
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  is_main_branch?: boolean;
  can_purchase?: boolean;
}

export interface GetBranchesParams {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  is_active?: boolean;
}

export interface DeleteBranchResponse {
  success: boolean;
  message: string;
}