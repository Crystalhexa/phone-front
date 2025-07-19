import { useAppDispatch, useAppSelector } from '@/state/redux';
import { setCredentials, logout, setLoading } from '@/state/slices/authSlice';
import { useLoginMutation, useRegisterMutation, useGetProfileQuery, useLogoutMutation } from '@/state/authApi';
import { useEffect } from 'react';
import { User, UserProfile } from '@/types/auth';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { token, user, permissions, isAuthenticated, isLoading } = useAppSelector(state => state.auth);

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [register, { isLoading: registerLoading }] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();
  const { data: profileData, isLoading: profileLoading } = useGetProfileQuery(undefined, {
  });

  useEffect(() => {
    if (profileData?.data?.user) {
      dispatch(setCredentials({
        user: profileData.data.user,
        permissions: profileData.data.permissions || []
      }));
    }
  }, [profileData, token, dispatch]);

  // Handle login
  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      dispatch(setLoading(true));
      
      // Clear previous user data before login
      dispatch(logout());
      
      const response = await login(credentials).unwrap();

      if (response.success) {
        dispatch(setCredentials({
          token: response.data.token,
          user: response.data.user,
          permissions: response.data.permissions
        }));


        return { success: true, data: response.data };
      }

      return { success: false, message: response.message };
    } catch (error: any) {
      return {
        success: false,
        message: error.data?.message || 'Login failed'
      };
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Handle registration
  const handleRegister = async (userData: { username: string; email: string; password: string }) => {
    try {
      dispatch(setLoading(true));
      
      // Clear previous user data before registration
      dispatch(logout());
      
      const response = await register(userData).unwrap();

      if (response.success) {
        dispatch(setCredentials({
          token: response.data.token,
          user: response.data.user,
          permissions: response.data.permissions
        }));


        return { success: true, data: response.data };
      }

      return { success: false, message: response.message };
    } catch (error: any) {
      return {
        success: false,
        message: error.data?.message || 'Registration failed'
      };
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(logout());
      localStorage.removeItem('token');
    }
  };

  // Initialize auth state on app start
  const initializeAuth = () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken && !token) {
      // Token exists but not in state, set token first
      // Profile data will be fetched automatically by the useGetProfileQuery hook
      dispatch(setCredentials({
        token: storedToken,
        user: {} as UserProfile, // Will be populated once profile query completes
        permissions: []
      }));
    }
  };

  // Check permissions
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  };
  

  return {
    // State
    token,
    user,
    permissions,
    isAuthenticated,
    isLoading: isLoading || loginLoading || registerLoading || profileLoading,

    // Actions
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    initializeAuth,

    // Permission checkers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};