export interface Props {
  userId?: string
  isEdit?: boolean
}
export interface Role  {
  id: number
  name: string
}

export interface RolesApiResponse {
  success: boolean
  message: string
  data: Role[]
}