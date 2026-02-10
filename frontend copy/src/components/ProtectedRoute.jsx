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
    console.log('ProtectedRoute: Role mismatch, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}


