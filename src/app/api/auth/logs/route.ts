// app/api/activity-logs/route.ts
import { query } from '@/lib/database/connection'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ========== Types ==========
interface ActivityLogWithDetails {
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

interface ActivityLogFilters {
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

// ========== Query Schemas ==========
const querySchema = z.object({
  // Filters
  branchId: z.string().cuid().optional(),
  employeeId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  
  // Pagination
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  
  // Sorting
  sortBy: z.enum(['createdAt', 'action', 'user', 'branch']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// ========== Helper Functions ==========
async function getActivityLogsWithDetails(
  filters: ActivityLogFilters
): Promise<{ activityLogs: ActivityLogWithDetails[], total: number }> {
  const offset = (filters.page - 1) * filters.limit
  
  // Build WHERE clause
  const whereConditions: string[] = ['1=1']
  const params: any[] = []
  let paramCount = 0

  // Branch filter
  if (filters.branchId) {
    whereConditions.push(`ual.branch_id = $${++paramCount}`)
    params.push(filters.branchId)
  }

  // Employee filter (through user relationship)
  if (filters.employeeId) {
    whereConditions.push(`e.id = $${++paramCount}`)
    params.push(filters.employeeId)
  }

  // User filter
  if (filters.userId) {
    whereConditions.push(`ual.user_id = $${++paramCount}`)
    params.push(filters.userId)
  }

  // Action filter
  if (filters.action) {
    whereConditions.push(`ual.action ILIKE $${++paramCount}`)
    params.push(`%${filters.action}%`)
  }

  // Entity filter
  if (filters.entity) {
    whereConditions.push(`ual.entity ILIKE $${++paramCount}`)
    params.push(`%${filters.entity}%`)
  }

  // Date range filters
  if (filters.startDate) {
    whereConditions.push(`ual.created_at >= $${++paramCount}`)
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    whereConditions.push(`ual.created_at <= $${++paramCount}`)
    params.push(filters.endDate)
  }

  // Search filter (searches across user, action, entity, and metadata)
  if (filters.search) {
    whereConditions.push(`(
      u.username ILIKE $${++paramCount} OR 
      u.email ILIKE $${paramCount} OR
      ual.action ILIKE $${paramCount} OR
      ual.entity ILIKE $${paramCount} OR
      ual.entity_id ILIKE $${paramCount} OR
      e.name ILIKE $${paramCount} OR
      e.employee_number ILIKE $${paramCount} OR
      b.name ILIKE $${paramCount} OR
      b.code ILIKE $${paramCount} OR
      ual.metadata::text ILIKE $${paramCount}
    )`)
    params.push(`%${filters.search}%`)
  }

  const whereClause = whereConditions.join(' AND ')

  // Sort configuration
  const sortColumn = {
    createdAt: 'ual.created_at',
    action: 'ual.action',
    user: 'u.username',
    branch: 'b.name'
  }[filters.sortBy]

  // Main query
  const activityLogsQuery = `
    SELECT 
      ual.id,
      ual.user_id,
      ual.action,
      ual.entity,
      ual.entity_id,
      ual.ip_address,
      ual.user_agent,
      ual.metadata,
      ual.branch_id,
      ual.created_at,
      
      -- User details
      u.username,
      u.email,
      u.is_active as user_is_active,
      
      -- Role details
      r.id as role_id,
      r.name as role_name,
      
      -- Branch details
      b.id as branch_id_detail,
      b.name as branch_name,
      b.code as branch_code,
      b.location as branch_location,
      
      -- Employee details
      e.id as employee_id,
      e.employee_number,
      e.name as employee_name,
      e.email as employee_email,
      e.position as employee_position,
      e.department as employee_department,
      
      -- Count for pagination
      COUNT(*) OVER() as total_count
      
    FROM user_activity_logs ual
    INNER JOIN users u ON u.id = ual.user_id
    LEFT JOIN roles r ON r.id = u.role_id
    LEFT JOIN branches b ON b.id = ual.branch_id
    LEFT JOIN employees e ON e.user_id = u.id
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${filters.sortOrder.toUpperCase()}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `

  params.push(filters.limit, offset)

  const result = await query<any>(activityLogsQuery, params)

  if (result.rows.length === 0) {
    return { activityLogs: [], total: 0 }
  }

  const total = parseInt(result.rows[0].total_count)

  // Map to response format
  const activityLogs: ActivityLogWithDetails[] = result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata || {},
    branchId: row.branch_id,
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      username: row.username,
      email: row.email,
      isActive: row.user_is_active,
      role: row.role_id ? {
        id: row.role_id,
        name: row.role_name
      } : null
    },
    branch: row.branch_id ? {
      id: row.branch_id_detail,
      name: row.branch_name,
      code: row.branch_code,
      location: row.branch_location
    } : null,
    employee: row.employee_id ? {
      id: row.employee_id,
      employeeNumber: row.employee_number,
      name: row.employee_name,
      email: row.employee_email,
      position: row.employee_position,
      department: row.employee_department
    } : null
  }))

  return { activityLogs, total }
}

async function getActivityLogStats(filters: Omit<ActivityLogFilters, 'page' | 'limit' | 'sortBy' | 'sortOrder'>) {
  // Build WHERE clause (same logic as main query)
  const whereConditions: string[] = ['1=1']
  const params: any[] = []
  let paramCount = 0

  if (filters.branchId) {
    whereConditions.push(`ual.branch_id = $${++paramCount}`)
    params.push(filters.branchId)
  }

  if (filters.employeeId) {
    whereConditions.push(`e.id = $${++paramCount}`)
    params.push(filters.employeeId)
  }

  if (filters.userId) {
    whereConditions.push(`ual.user_id = $${++paramCount}`)
    params.push(filters.userId)
  }

  if (filters.action) {
    whereConditions.push(`ual.action ILIKE $${++paramCount}`)
    params.push(`%${filters.action}%`)
  }

  if (filters.entity) {
    whereConditions.push(`ual.entity ILIKE $${++paramCount}`)
    params.push(`%${filters.entity}%`)
  }

  if (filters.startDate) {
    whereConditions.push(`ual.created_at >= $${++paramCount}`)
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    whereConditions.push(`ual.created_at <= $${++paramCount}`)
    params.push(filters.endDate)
  }

  if (filters.search) {
    whereConditions.push(`(
      u.username ILIKE $${++paramCount} OR 
      u.email ILIKE $${paramCount} OR
      ual.action ILIKE $${paramCount} OR
      ual.entity ILIKE $${paramCount} OR
      ual.entity_id ILIKE $${paramCount} OR
      e.name ILIKE $${paramCount} OR
      e.employee_number ILIKE $${paramCount} OR
      b.name ILIKE $${paramCount} OR
      b.code ILIKE $${paramCount} OR
      ual.metadata::text ILIKE $${paramCount}
    )`)
    params.push(`%${filters.search}%`)
  }

  const whereClause = whereConditions.join(' AND ')

  const statsQuery = `
    SELECT 
      COUNT(*) as total_logs,
      COUNT(DISTINCT ual.user_id) as unique_users,
      COUNT(DISTINCT ual.branch_id) as unique_branches,
      COUNT(DISTINCT ual.action) as unique_actions,
      COUNT(DISTINCT ual.entity) as unique_entities,
      
      -- Top actions
      (
        SELECT json_agg(
          json_build_object(
            'action', action,
            'count', action_count
          ) ORDER BY action_count DESC
        )
        FROM (
          SELECT action, COUNT(*) as action_count
          FROM user_activity_logs ual2
          INNER JOIN users u2 ON u2.id = ual2.user_id
          LEFT JOIN employees e2 ON e2.user_id = u2.id
          LEFT JOIN branches b2 ON b2.id = ual2.branch_id
          WHERE ${whereClause}
          GROUP BY action
          ORDER BY COUNT(*) DESC
          LIMIT 5
        ) top_actions
      ) as top_actions,
      
      -- Activities by hour (last 24 hours)
      (
        SELECT json_agg(
          json_build_object(
            'hour', hour_bucket,
            'count', hour_count
          ) ORDER BY hour_bucket
        )
        FROM (
          SELECT 
            EXTRACT(HOUR FROM ual3.created_at) as hour_bucket,
            COUNT(*) as hour_count
          FROM user_activity_logs ual3
          INNER JOIN users u3 ON u3.id = ual3.user_id
          LEFT JOIN employees e3 ON e3.user_id = u3.id
          LEFT JOIN branches b3 ON b3.id = ual3.branch_id
          WHERE ${whereClause}
            AND ual3.created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY EXTRACT(HOUR FROM ual3.created_at)
          ORDER BY hour_bucket
        ) hourly_stats
      ) as hourly_activity
      
    FROM user_activity_logs ual
    INNER JOIN users u ON u.id = ual.user_id
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN branches b ON b.id = ual.branch_id
    WHERE ${whereClause}
  `

  const result = await query<any>(statsQuery, params)
  
  return {
    totalLogs: parseInt(result.rows[0].total_logs),
    uniqueUsers: parseInt(result.rows[0].unique_users),
    uniqueBranches: parseInt(result.rows[0].unique_branches),
    uniqueActions: parseInt(result.rows[0].unique_actions),
    uniqueEntities: parseInt(result.rows[0].unique_entities),
    topActions: result.rows[0].top_actions || [],
    hourlyActivity: result.rows[0].hourly_activity || []
  }
}

// ========== API Route Handler ==========
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const filters = querySchema.parse(searchParams)

    // Check if stats are requested
    const includeStats = searchParams.includeStats === 'true'

    // Get activity logs
    const { activityLogs, total } = await getActivityLogsWithDetails(filters)

    let stats = null
    if (includeStats) {
      stats = await getActivityLogStats(filters)
    }

    return NextResponse.json({
      success: true,
      data: {
        activityLogs,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit)
        },
        ...(stats && { stats })
      },
      message: 'Activity logs retrieved successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching activity logs:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Invalid request parameters',
        errors: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Failed to fetch activity logs',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}