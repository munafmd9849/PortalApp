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

  // Determine if user has access: matches allowRoles OR is a Super Admin
  const hasAccess = (allowRolesLower.length === 0) || 
                    allowRolesLower.includes(roleLower) || 
                    roleLower === 'super_admin';

  console.log('[AUTH DEBUG] ProtectedRoute check:', {
    path: window.location.pathname,
    role,
    roleLower,
    allowRoles,
    allowRolesLower,
    hasAccess
  });

  if (allowRoles && Array.isArray(allowRoles) && roleLower && !hasAccess) {
    console.error('🚫 UNAUTHORIZED ROUTE ACCESS - ProtectedRoute REDIRECTING TO:', redirectPath, {
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
                         userRoleUpper === 'SUPER_ADMIN' ? '/super-admin' :
                         '/';

    // DEBUG: Delay the redirect so we can read the console logs
    const [shouldRedirect, setShouldRedirect] = React.useState(false);
    React.useEffect(() => {
      const timer = setTimeout(() => {
        console.warn('[AUTH DEBUG] 5 seconds passed, executing redirect to:', redirectPath);
        setShouldRedirect(true);
      }, 5000);
      return () => clearTimeout(timer);
    }, [redirectPath]);

    if (!shouldRedirect) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8">
          <div className="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-8" />
          <h2 className="text-xl font-black mb-4 uppercase tracking-tighter">Diagnostic Hold</h2>
          <p className="text-slate-400 font-bold max-w-md text-center">
            ProtectedRoute is about to redirect you to <span className="text-rose-400">"{redirectPath}"</span> because it thinks you are unauthorized.
          </p>
          <div className="mt-8 p-4 bg-slate-800 rounded-xl font-mono text-xs text-slate-300 w-full max-w-lg">
             <p>Path: {window.location.pathname}</p>
             <p>Role: {role}</p>
             <p>Required: {allowRoles?.join(', ')}</p>
          </div>
          <p className="mt-8 text-[10px] font-bold text-slate-500 animate-pulse uppercase tracking-[0.2em]">Redirecting in 5 seconds...</p>
        </div>
      );
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}


