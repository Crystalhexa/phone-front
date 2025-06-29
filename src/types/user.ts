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