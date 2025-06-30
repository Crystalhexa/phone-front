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
// types/user.ts

// types/user.ts

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
  id:string;
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
  role_id: string
  employee: {
    id: string
    name: string
    employee_number: string
    email: string
    phone?: string
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
