export interface ServiceContext {
  requestId: string;
}

export interface DatabaseConnection {
  query: (text: string, params?: any[]) => Promise<any>;
}