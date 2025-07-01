export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  requestId: string;
  timestamp: string;
  errors?: any;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}