import { useState, useEffect, useCallback } from 'react';
import { ActivityLogsAPI } from '@/lib/api/activity-logs';
import type { ActivityLogFilters, UserActivityLog, PaginationInfo, ApiResponse, ActivityLogsResponse } from '@/types/activity-logs';

interface UseActivityLogsState {
  logs: UserActivityLog[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  filters: ActivityLogFilters;
}

interface UseActivityLogsReturn extends UseActivityLogsState {
  refetch: () => Promise<void>;
  setFilters: (filters: Partial<ActivityLogFilters>) => void;
  exportLogs: () => Promise<void>;
  resetFilters: () => void;
}

const defaultFilters: ActivityLogFilters = {
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'desc'
};

export function useActivityLogs(initialFilters: Partial<ActivityLogFilters> = {}): UseActivityLogsReturn {
  const [state, setState] = useState<UseActivityLogsState>({
    logs: [],
    pagination: null,
    loading: false,
    error: null,
    filters: { ...defaultFilters, ...initialFilters }
  });

  const fetchLogs = useCallback(async (filters: ActivityLogFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response: ApiResponse<ActivityLogsResponse> = await ActivityLogsAPI.getActivityLogs(filters);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          logs: response.data!.data,
          pagination: response.data!.pagination,
          loading: false
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch activity logs');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        logs: [],
        pagination: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, []);

  const setFilters = useCallback((newFilters: Partial<ActivityLogFilters>) => {
    setState(prev => {
      const updatedFilters = { ...prev.filters, ...newFilters };
      // Reset to page 1 when non-page filters change
      if (Object.keys(newFilters).some(key => key !== 'page')) {
        updatedFilters.page = 1;
      }
      return {
        ...prev,
        filters: updatedFilters
      };
    });
  }, []);

  const refetch = useCallback(() => {
    return fetchLogs(state.filters);
  }, [fetchLogs, state.filters]);

  const exportLogs = useCallback(async () => {
    try {
      const blob = await ActivityLogsAPI.exportActivityLogs(state.filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, [state.filters]);

  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: { ...defaultFilters }
    }));
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchLogs(state.filters);
  }, [fetchLogs, state.filters]);

  return {
    ...state,
    refetch,
    setFilters,
    exportLogs,
    resetFilters
  };
}

// utils/activity-logs.ts
export const ActivityLogUtils = {
  formatDate: (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  formatMetadata: (metadata: Record<string, any>): string => {
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return 'Invalid metadata';
    }
  },

  getActionColor: (action: string): string => {
    const actionColors: Record<string, string> = {
      'CREATE': 'bg-green-100 text-green-800',
      'UPDATE': 'bg-blue-100 text-blue-800',
      'DELETE': 'bg-red-100 text-red-800',
      'LOGIN': 'bg-purple-100 text-purple-800',
      'LOGOUT': 'bg-gray-100 text-gray-800',
      'VIEW': 'bg-yellow-100 text-yellow-800',
      'EXPORT': 'bg-indigo-100 text-indigo-800',
      'IMPORT': 'bg-orange-100 text-orange-800'
    };
    
    const upperAction = action.toUpperCase();
    return actionColors[upperAction] || 'bg-gray-100 text-gray-800';
  },

  truncateText: (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  buildDateRangeLabel: (dateFrom?: string, dateTo?: string): string => {
    if (!dateFrom && !dateTo) return 'All time';
    if (dateFrom && !dateTo) return `From ${new Date(dateFrom).toLocaleDateString()}`;
    if (!dateFrom && dateTo) return `Until ${new Date(dateTo).toLocaleDateString()}`;
    return `${new Date(dateFrom!).toLocaleDateString()} - ${new Date(dateTo!).toLocaleDateString()}`;
  }
};