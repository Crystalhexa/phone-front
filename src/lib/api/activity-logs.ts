import { ActivityLogFilters, ActivityLogsResponse, ApiResponse } from "@/types/activity-logs";

export class ActivityLogsAPI {
  private static baseUrl = '/api/auth/logs';

  static async getActivityLogs(filters: ActivityLogFilters = {}): Promise<ApiResponse<ActivityLogsResponse>> {
    const searchParams = new URLSearchParams();
    
    // Add filters to search params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control for production
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async exportActivityLogs(filters: ActivityLogFilters = {}): Promise<Blob> {
    // Use a different endpoint for export or add export parameter
    const exportUrl = `${this.baseUrl}/export`;
    
    const response = await fetch(exportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters)
    });

    if (!response.ok) {
      throw new Error(`Export failed! status: ${response.status}`);
    }

    return response.blob();
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
        cache: 'no-store'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}