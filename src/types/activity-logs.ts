
export interface ActivityLogWithDetails {
  id: string
  userId: string
  action: string
  entity: string | null
  entityId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: any
  branchId: string | null
  createdAt: string
  user: {
    id: string
    username: string
    email: string
    isActive: boolean
    role: {
      id: string
      name: string
    } | null
  }
  branch: {
    id: string
    name: string
    code: string
    location: string | null
  } | null
  employee: {
    id: string
    employeeNumber: string
    name: string | null
    email: string | null
    position: string | null
    department: string | null
  } | null
}

export interface ActivityLogFilters {
  branchId?: string
  employeeId?: string
  userId?: string
  action?: string
  entity?: string
  search?: string
  startDate?: string
  endDate?: string
  page: number
  limit: number
  sortBy: 'createdAt' | 'action' | 'user' | 'branch'
  sortOrder: 'asc' | 'desc'
}