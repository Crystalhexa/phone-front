export interface Role {
  id: any;
  role_name: string;
}
export interface User {
  user_id: number;
  username: string;
  is_active: boolean;
  role_id: number;
}
export interface EmployeeFormData {
  employee_number: string
  name: string
  email: string
  phone?: string | null
  nic?: string | null
  gender?: string | null
  position?: string | null
  department?: string | null
  date_of_birth?: string | null
  hire_date?: string | null
  is_active: boolean
}

export interface CreateUserRequest {
  user_id?:string;
  username: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  role_id: string;
  employee: {
    employee_number: string;
    name: string;
    email: string;
    phone?: string;
    nic?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    position?: string;
    department?: string;
    date_of_birth?: Date;
    hire_date?: Date;
    is_active: boolean;
  };
}

export interface CreateUserResponse {
  success: boolean
  data: {
    user_id: string
    employee_id: string
  } | null
  message: string
  timestamp: string
}
export interface UserListItem {
  id: string
  username: string
  email: string
  is_active: boolean
  role_name: string
  employee: {
    branch_id: string;
    id: string
    name: string
    employee_number: string
    email: string
    phone?: string,
    nic?: string,
    gender?: "MALE"|"FEMALE"|"OTHER",
    position?: string,
    branch_name?:string,
    department?: string,
    date_of_birth?: Date;
    hire_date ?: Date;
    is_active: boolean;
  }
}

export interface GetUsersParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UsersListResponse {
  success: boolean
  data: {
    users: UserListItem[]
    total: number
  }
  message: string
  timestamp: string
}

export interface GetUserByIdResponse {
  success: boolean
  data: UserListItem
  message: string
  timestamp: string
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {}
export interface UpdateUserResponse extends CreateUserResponse {}

export interface DeleteUserResponse {
  success: boolean
  message: string
  timestamp: string
}


export interface UserWithDetailsStructured {
  id: string;
  username: string;
  email: string;
  role_id: string;
  is_active: boolean;
  
  employee?: {
    id: string;
    employee_number: string;
    name: string;
    position?: string;
    department?: string;
    branch_id?: string;
  };
  
  branch?: {
    id: string;
    name: string;
    code: string;
    location?: string;
    address?: string;
    phone?: string;
    email?: string;
    is_active: boolean;
    is_main_branch: boolean;
    can_purchase: boolean;
    timezone: string;
  };
  
  branch_permissions?: {
    can_view_other_inventory: boolean;
    can_request_transfers: boolean;
    can_approve_transfers: boolean;
    can_override_prices: boolean;
    can_view_cost_prices: boolean;
    max_transfer_value?: number;
  };
  
  permissions: string[];
}