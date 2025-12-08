import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * AuthRedirect Component
 * Handles automatic redirection based on user role
 * Only redirects AFTER user is loaded and only when necessary
 */
export default function AuthRedirect() {
  const { user, role, userStatus, loading, emailVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);
  const lastCheckedPathRef = useRef('');

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }

    const currentPath = location.pathname;

    // Reset redirect flag if user manually navigated to a new path
    if (currentPath !== lastCheckedPathRef.current) {
      // Only reset if we're going TO a different path (not coming FROM)
      // This allows manual navigation to work
      if (hasRedirectedRef.current && lastCheckedPathRef.current) {
        // User navigated manually - allow it
        hasRedirectedRef.current = false;
      }
      lastCheckedPathRef.current = currentPath;
    }

    // User is authenticated with a role
    if (user && role) {
      const roleLower = role.toLowerCase();
      
      // Determine target dashboard based on role
      const targetDashboard = roleLower === 'student' ? '/student' 
        : roleLower === 'recruiter' ? '/recruiter'
        : roleLower === 'admin' ? '/admin'
        : null;

      // Public paths that authenticated users can visit without redirect
      const publicPaths = ['/dev-team', '/test', '/unsubscribe'];

      // Only redirect if:
      // 1. We have a target dashboard
      // 2. We're NOT on a public path
      // 3. We're NOT already on the target dashboard
      // 4. We haven't already redirected in this session
      if (targetDashboard && !publicPaths.includes(currentPath) && currentPath !== targetDashboard && !hasRedirectedRef.current) {
        console.log(`AuthRedirect - Redirecting authenticated user from ${currentPath} to ${targetDashboard}`);
        hasRedirectedRef.current = true;
        navigate(targetDashboard, { replace: true });
      } else if (currentPath === targetDashboard) {
        // We're on the correct dashboard - allow navigation to stay
        hasRedirectedRef.current = false;
      }
    } else if (user && !role) {
      // User authenticated but no role - stay on home page
      if (currentPath !== '/' && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        navigate('/', { replace: true });
      }
    } else {
      // Not authenticated - reset flag
      hasRedirectedRef.current = false;
    }
    
    // Note: We intentionally do NOT include location.pathname in dependencies
    // to prevent re-running on every path change. We manually check it above.
  }, [user, role, loading, navigate]); // Removed location.pathname from deps

  return null; // This component doesn't render anything
}