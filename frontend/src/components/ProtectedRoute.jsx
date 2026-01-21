import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ allowRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Normalize role to lowercase for comparison (backend returns uppercase)
  const roleLower = role ? role.toLowerCase() : null;
  const allowRolesLower = allowRoles ? allowRoles.map(r => r.toLowerCase()) : [];

  console.log('ProtectedRoute check:', {
    role,
    roleLower,
    allowRoles,
    allowRolesLower,
    hasAccess: allowRolesLower.includes(roleLower)
  });

  if (allowRoles && Array.isArray(allowRoles) && roleLower && !allowRolesLower.includes(roleLower)) {
    console.error('🚫 UNAUTHORIZED ROUTE ACCESS - ProtectedRoute:', {
      userRole: role,
      requiredRoles: allowRoles,
      userId: user?.id,
      email: user?.email,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    
    // Backend is source of truth - if user doesn't have required role, redirect to their dashboard
    // This handles both frontend route protection and backend 403 errors gracefully
    const userRoleUpper = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const redirectPath = userRoleUpper === 'STUDENT' ? '/student' :
                         userRoleUpper === 'RECRUITER' ? '/recruiter' :
                         userRoleUpper === 'ADMIN' ? '/admin' :
                         '/';
    
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}


