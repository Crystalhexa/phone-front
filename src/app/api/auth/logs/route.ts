import { ActivityLogService } from '@/lib/services/activity-log.service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'


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

// ========== API Route Handler ==========
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const filters = querySchema.parse(searchParams)

    // Check if stats are requested
    const includeStats = searchParams.includeStats === 'true'

    // Get activity logs
    const { activityLogs, total } = await ActivityLogService.getActivityLogsWithDetails(filters)

    let stats = null
    if (includeStats) {
      stats = await ActivityLogService.getActivityLogStats(filters)
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