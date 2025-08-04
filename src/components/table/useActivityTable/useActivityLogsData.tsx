import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Types
interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  branchId: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    isActive: boolean;
    role: {
      id: string;
      name: string;
    } | null;
  };
  branch: {
    id: string;
    name: string;
    code: string;
    location: string | null;
  } | null;
  employee: {
    id: string;
    employeeNumber: string;
    name: string | null;
    email: string | null;
    position: string | null;
    department: string | null;
  } | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ActivityLogStats {
  totalLogs: number;
  uniqueUsers: number;
  uniqueBranches: number;
  uniqueActions: number;
  uniqueEntities: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    count: number;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: {
    activityLogs: ActivityLog[];
    pagination: PaginationMeta;
    stats?: ActivityLogStats;
  };
  message: string;
  timestamp: string;
}

interface Filters {
  search: string;
  sortBy: 'createdAt' | 'action' | 'user' | 'branch';
  sortOrder: 'asc' | 'desc';
  branchId: string;
  employeeId: string;
  userId: string;
  action: string;
  entity: string;
  startDate: string;
  endDate: string;
  includeStats: boolean;
}

export const useActivityLogsData = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(7);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    branchId: '',
    employeeId: '',
    userId: '',
    action: '',
    entity: '',
    startDate: '',
    endDate: '',
    includeStats: false,
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch activity logs function
  const fetchActivityLogs = async (isSearch = false) => {
    if (isSearch) {
      setSearchLoading(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        includeStats: filters.includeStats.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.branchId && { branchId: filters.branchId }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/auth/logs?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setActivityLogs(data.data.activityLogs);
        setTotal(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      } else {
        toast.error('Failed to fetch activity logs');
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('Error fetching activity logs. Please try again.');
    } finally {
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (filters.search) {
        setCurrentPage(1);
      }
      fetchActivityLogs(true);
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [filters.search]);

  // Fetch activity logs when pagination or non-search filters change
  useEffect(() => {
    fetchActivityLogs();
  }, [
    currentPage,
    pageSize,
    filters.sortBy,
    filters.sortOrder,
    filters.branchId,
    filters.employeeId,
    filters.userId,
    filters.action,
    filters.entity,
    filters.startDate,
    filters.endDate,
    filters.includeStats,
  ]);

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const updateFilters = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      branchId: '',
      employeeId: '',
      userId: '',
      action: '',
      entity: '',
      startDate: '',
      endDate: '',
      includeStats: false,
    });
    setSearchTerm('');
    setCurrentPage(1);
    toast.success('Filters reset');
  };

  const handleRefresh = () => {
    fetchActivityLogs();
    toast.success('Activity logs refreshed');
  };

  // Filter by specific branch
  const filterByBranch = (branchId: string) => {
    updateFilters({ branchId });
    toast.success(`Filtered by branch: ${branchId}`);
  };

  // Filter by specific employee
  const filterByEmployee = (employeeId: string) => {
    updateFilters({ employeeId });
    toast.success(`Filtered by employee: ${employeeId}`);
  };

  // Filter by specific user
  const filterByUser = (userId: string) => {
    updateFilters({ userId });
    toast.success(`Filtered by user: ${userId}`);
  };

  // Filter by action type
  const filterByAction = (action: string) => {
    updateFilters({ action });
    toast.success(`Filtered by action: ${action}`);
  };

  // Filter by entity type
  const filterByEntity = (entity: string) => {
    updateFilters({ entity });
    toast.success(`Filtered by entity: ${entity}`);
  };

  // Set date range filter
  const setDateRange = (startDate: string, endDate: string) => {
    updateFilters({ startDate, endDate });
    toast.success('Date range filter applied');
  };

  // Clear date range filter
  const clearDateRange = () => {
    updateFilters({ startDate: '', endDate: '' });
    toast.success('Date range filter cleared');
  };

  // Toggle stats inclusion
  const toggleStats = () => {
    updateFilters({ includeStats: !filters.includeStats });
  };

  // Get unique values for filter dropdowns
  const getUniqueActions = () => {
    return [...new Set(activityLogs.map(log => log.action))].filter(Boolean);
  };

  const getUniqueEntities = () => {
    return [...new Set(activityLogs.map(log => log.entity))].filter(Boolean);
  };

  const getUniqueBranches = () => {
    return [...new Set(activityLogs
      .filter(log => log.branch)
      .map(log => ({ id: log.branch!.id, name: log.branch!.name, code: log.branch!.code }))
    )];
  };

  const getUniqueUsers = () => {
    return [...new Set(activityLogs.map(log => ({
      id: log.user.id,
      username: log.user.username,
      email: log.user.email
    })))];
  };

  const getUniqueEmployees = () => {
    return [...new Set(activityLogs
      .filter(log => log.employee)
      .map(log => ({
        id: log.employee!.id,
        name: log.employee!.name,
        employeeNumber: log.employee!.employeeNumber
      }))
    )];
  };

  // Export data functions
  const exportToCSV = () => {
    if (activityLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvHeaders = [
      'Date/Time',
      'User',
      'Employee',
      'Branch',
      'Action',
      'Entity',
      'Entity ID',
      'IP Address',
      'User Agent'
    ];

    const csvData = activityLogs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.user.username,
      log.employee?.name || '',
      log.branch?.name || '',
      log.action,
      log.entity || '',
      log.entityId || '',
      log.ipAddress || '',
      log.userAgent || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Activity logs exported to CSV');
  };

  return {
    // Data
    data: { activityLogs, stats },
    activityLogs,
    stats,
    isLoading,
    searchLoading,
    error: null, // You can implement error handling as needed
    
    // Pagination state
    currentPage,
    pageSize,
    totalPages,
    total,
    searchTerm,
    filters,
    
    // Basic handlers
    handleSearch,
    setCurrentPage,
    handlePageSizeChange,
    updateFilters,
    resetFilters,
    handleRefresh,
    fetchActivityLogs,
    
    // Specific filter handlers
    filterByBranch,
    filterByEmployee,
    filterByUser,
    filterByAction,
    filterByEntity,
    setDateRange,
    clearDateRange,
    toggleStats,
    
    // Helper functions
    getUniqueActions,
    getUniqueEntities,
    getUniqueBranches,
    getUniqueUsers,
    getUniqueEmployees,
    
    // Export functions
    exportToCSV,
  };
};