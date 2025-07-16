// components/auth/ConditionalRender.tsx
'use client';
import { useAuth } from '@/hooks/useAuth';

interface ConditionalRenderProps {
  children: React.ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export const ConditionalRender = ({ 
  children, 
  permissions = [], 
  requireAll = false,
  fallback = null 
}: ConditionalRenderProps) => {
  const { isAuthenticated, hasAnyPermission, hasAllPermissions } = useAuth();

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};
