export interface UserActivityLog {
  id: string
  user_id: string
  action: string
  entity: string | null
  entity_id: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any>
  branch_id: string | null
  created_at: string
  // Joined fields
  username: string
  user_email: string
  user_role: string | null
  branch_name: string | null
  branch_code: string | null
  employee_name: string | null
  employee_number: string | null
}

export interface ActivityLogFilters {
  dateFrom?: string
  dateTo?: string
  branchId?: string
  userId?: string
  employeeId?: string
  action?: string
  entity?: string
  page?: number
  limit?: number
  sortBy?: 'created_at' | 'action' | 'username'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalRecords: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ActivityLogsResponse {
  data: UserActivityLog[]
  pagination: PaginationInfo
  filters: ActivityLogFilters
}

export interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message: string
  errors?: string[] | null
  timestamp: string
  metadata?: Record<string, any>
}