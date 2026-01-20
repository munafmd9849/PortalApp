/**
 * useRequireRole Hook
 * Hook version of RequireRole for programmatic access control
 * 
 * Usage:
 * const { hasAccess, redirect } = useRequireRole(['ADMIN', 'RECRUITER']);
 * if (!hasAccess) return redirect();
 */

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function useRequireRole(allowedRoles, redirectTo = null) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const hasAccess = useMemo(() => {
    if (loading || !user) return false;
    
    const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const allowedRolesUpper = (allowedRoles || []).map(r => r.toUpperCase());
    
    return allowedRolesUpper.includes(userRole);
  }, [user, role, loading, allowedRoles]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      console.error('🚫 useRequireRole: No authenticated user');
      navigate('/', { replace: true });
      return;
    }

    if (!hasAccess) {
      const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
      console.error('🚫 useRequireRole: Unauthorized access attempt:', {
        userRole,
        allowedRoles: (allowedRoles || []).map(r => r.toUpperCase()),
        userId: user?.id,
        email: user?.email,
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      });

      const redirectPath = redirectTo || (
        userRole === 'STUDENT' ? '/student' :
        userRole === 'RECRUITER' ? '/recruiter' :
        userRole === 'ADMIN' ? '/admin' :
        '/'
      );

      navigate(redirectPath, { replace: true });
    }
  }, [hasAccess, user, role, loading, allowedRoles, redirectTo, navigate]);

  const redirect = () => {
    const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const redirectPath = redirectTo || (
      userRole === 'STUDENT' ? '/student' :
      userRole === 'RECRUITER' ? '/recruiter' :
      userRole === 'ADMIN' ? '/admin' :
      '/'
    );
    navigate(redirectPath, { replace: true });
    return null;
  };

  return { hasAccess, redirect, loading };
}
