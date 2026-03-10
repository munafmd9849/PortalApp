/**
 * RequireRole Component
 * Centralized role-based access control guard
 * 
 * Usage:
 * <RequireRole allowedRoles={['ADMIN', 'RECRUITER']}>
 *   <ProtectedComponent />
 * </RequireRole>
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RequireRole({ children, allowedRoles, redirectTo = null }) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // If no user, redirect to home
    if (!user) {
      console.error('🚫 RequireRole: No authenticated user');
      navigate('/', { replace: true });
      return;
    }

    // Normalize role comparison (backend returns uppercase)
    const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const allowedRolesUpper = (allowedRoles || []).map(r => r.toUpperCase());

    // Check if user role is allowed
    if (!allowedRolesUpper.includes(userRole)) {
      console.error('🚫 RequireRole: Unauthorized access attempt:', {
        userRole,
        allowedRoles: allowedRolesUpper,
        userId: user?.id,
        email: user?.email,
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
      });

      // Determine redirect target
      const redirectPath = redirectTo || (
        userRole === 'STUDENT' ? '/student' :
          userRole === 'RECRUITER' ? '/recruiter' :
            userRole === 'ADMIN' ? '/admin' :
              '/'
      );

      navigate(redirectPath, { replace: true });
    }
  }, [user, role, loading, allowedRoles, redirectTo, navigate]);

  // Show loading state while auth is loading
  if (loading) {
    return null; // Don't render anything while loading
  }

  // If no user, don't render children
  if (!user) {
    return null;
  }

  // Normalize role comparison
  const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
  const allowedRolesUpper = (allowedRoles || []).map(r => r.toUpperCase());

  // If role not allowed, don't render children
  if (!allowedRolesUpper.includes(userRole)) {
    return null;
  }

  // Role is allowed, render children
  return <>{children}</>;
}
