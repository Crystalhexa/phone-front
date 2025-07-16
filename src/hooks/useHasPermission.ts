// hooks/useHasPermission.ts
import { useAppSelector } from '@/state/store';

export function useHasPermission(permission: string): boolean {
  const permissions = useAppSelector((state) => state.auth.permissions);
  return permissions.includes(permission);
}
