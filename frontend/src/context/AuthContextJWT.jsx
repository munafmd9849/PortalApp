/**
 * Auth Context - Migrated Version
 * Replaces Firebase Auth with JWT-based authentication
 * Maintains same API for seamless frontend migration
 */

import React, { createContext, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import api from '../services/api.js';
import { initSocket, disconnectSocket } from '../services/socket.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [userStatus, setUserStatus] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(true);

  // Track if user has been loaded to prevent repeated calls
  const userLoadedRef = useRef(false);
  const socketInitializedRef = useRef(false);

  // Load user function (reusable)
  const loadUser = useCallback(async (forceReload = false) => {
    if (!forceReload && userLoadedRef.current) return; // Prevent repeated calls

    async function fetchUser() {
      if (!forceReload && userLoadedRef.current) return; // Double check
      if (forceReload) {
        userLoadedRef.current = false; // Allow reload
      }
      userLoadedRef.current = true;

      try {
        const token = api.getAuthToken();
        if (!token) {
          setLoading(false);
          return;
        }

        // Call API directly - let it handle its own timeouts
        const data = await api.getCurrentUser();

        const userData = data.user;
        const completed =
          typeof data.profileCompleted === 'boolean'
            ? data.profileCompleted
            : (userData?.role === 'STUDENT'
              ? Boolean(userData?.student?.profileCompleted)
              : true);

        setUser(userData);
        setRole(userData.role);
        setEmailVerified(userData.emailVerified || false);
        setUserStatus(userData.status || 'ACTIVE');
        setProfileCompleted(completed);

        // Initialize Socket.IO connection (only once)
        if (userData && !socketInitializedRef.current) {
          socketInitializedRef.current = true;
          initSocket();
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        // Clear tokens and set loading to false even on error
        api.clearAuthTokens();
        setUser(null);
        setRole(null);
        setEmailVerified(false);
        setUserStatus(null);
        userLoadedRef.current = false; // Allow retry on error
      } finally {
        // Always set loading to false, even if there's an error
        setLoading(false);
      }
    }

    await fetchUser();
  }, []);

  // Load user on mount (replaces onAuthStateChanged)
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for profile update events to refresh user data
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      // Reload user data when profile is updated
      if (event.detail?.userId === user?.id) {
        loadUser(true);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id, loadUser]);

  // When another tab/window clears tokens (e.g. refresh failed), clear our state so we don't show dashboard with stale auth
  useEffect(() => {
    const handleStorage = (e) => {
      if ((e.key === 'accessToken' || e.key === 'refreshToken') && e.newValue == null) {
        setUser(null);
        setRole(null);
        userLoadedRef.current = false;
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Login (replaces signInWithEmailAndPassword)
  const login = async (email, password, selectedRole) => {
    try {
      // Convert role to uppercase to match backend expectations
      const roleUpper = selectedRole ? selectedRole.toUpperCase() : undefined;
      const data = await api.login({ email, password, selectedRole: roleUpper });

      const loginUser = data.user;
      const completed =
        typeof loginUser.profileCompleted === 'boolean'
          ? loginUser.profileCompleted
          : (loginUser?.role === 'STUDENT'
            ? Boolean(loginUser?.student?.profileCompleted)
            : true);

      setUser(loginUser);
      setRole(loginUser.role);
      setEmailVerified(loginUser.emailVerified || false);
      setUserStatus(loginUser.status || 'ACTIVE');
      setProfileCompleted(completed);

      // Initialize Socket.IO (only once)
      if (!socketInitializedRef.current) {
        socketInitializedRef.current = true;
        initSocket();
      }

      return { user: data.user, role: data.user.role, status: data.user.status };
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
        isNetworkError: error.isNetworkError
      });
      // Re-throw with a more user-friendly message if needed
      if (error.message) {
        throw error;
      }
      throw new Error(error.message || 'Login failed. Please check your credentials and try again.');
    }
  };

  // Logout (replaces signOut)
  const logout = async () => {
    // Clear tokens FIRST to prevent any API calls
    api.clearAuthTokens();

    // Clear user state IMMEDIATELY to prevent redirects
    setUser(null);
    setRole(null);
    setEmailVerified(false);
    setUserStatus(null);
    userLoadedRef.current = false; // Reset user loaded flag

    // Disconnect socket
    disconnectSocket();
    socketInitializedRef.current = false;

    // Then try to call logout API (but don't wait for it or fail if it errors)
    try {
      await api.logout();
    } catch (error) {
      console.warn('Logout API call failed, but tokens already cleared:', error);
      // Tokens are already cleared above, so we're good
    }
  };

  // Register (replaces createUserWithEmailAndPassword)
  const registerWithEmail = async ({ email, password, role, profile = {}, verificationToken }) => {
    try {
      // Convert role to uppercase to match backend expectations
      const roleUpper = role ? role.toUpperCase() : undefined;
      const data = await api.register({ email, password, role: roleUpper, profile, verificationToken });

      // Store tokens if provided
      if (data.accessToken && data.refreshToken) {
        api.setAuthTokens(data.accessToken, data.refreshToken);
      }

      setUser(data.user);
      setRole(data.user.role);
      setEmailVerified(false);
      setUserStatus(data.user.status);
      setProfileCompleted(
        data.user.role === 'STUDENT'
          ? Boolean(data.user.student?.profileCompleted)
          : true
      );

      // Initialize Socket.IO (only once)
      if (data.user && !socketInitializedRef.current) {
        socketInitializedRef.current = true;
        initSocket();
      }

      return data.user;
    } catch (error) {
      throw error;
    }
  };

  // Reset password (replaces sendPasswordResetEmail)
  const resetPassword = async (email) => {
    try {
      await api.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  // Google login - Redirects to Google OAuth flow
  const loginWithGoogle = async (role = 'STUDENT') => {
    try {
      // Get Google OAuth URL from backend
      const response = await api.getGoogleLoginUrl(role);

      if (!response.authUrl) {
        throw new Error('Failed to get Google login URL');
      }

      // Redirect the entire page to Google OAuth instead of using a popup
      window.location.href = response.authUrl;

      // Return an unresolved promise so that the caller's 'await' remains pending 
      // This prevents the UI from re-rendering/resetting while the browser navigates away
      return new Promise(() => { });

    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  // Email verification (if needed)
  const resendEmailVerification = async () => {
    // TODO: Implement email verification
    throw new Error('Email verification not yet implemented');
  };

  const checkEmailVerification = async () => {
    try {
      const data = await api.getCurrentUser();
      setEmailVerified(data.user.emailVerified || false);
      if (typeof data.profileCompleted === 'boolean') {
        setProfileCompleted(data.profileCompleted);
      }
      return data.user.emailVerified || false;
    } catch (error) {
      return false;
    }
  };

  // Admin request methods
  const getPendingAdminRequests = async () => {
    try {
      return await api.getPendingAdminRequests();
    } catch (error) {
      console.error('Failed to fetch pending admin requests:', error);
      throw error;
    }
  };

  const approveAdminRequest = async (requestId, requestUid) => {
    try {
      // requestUid is kept for backward compatibility but not used
      return await api.approveAdminRequest(requestId);
    } catch (error) {
      console.error('Failed to approve admin request:', error);
      throw error;
    }
  };

  const rejectAdminRequest = async (requestId, requestUid, reason) => {
    try {
      // requestUid is kept for backward compatibility but not used
      return await api.rejectAdminRequest(requestId, { reason });
    } catch (error) {
      console.error('Failed to reject admin request:', error);
      throw error;
    }
  };

  const value = useMemo(() => ({
    user,
    role,
    userStatus,
    loading,
    emailVerified,
    profileCompleted,
    login,
    logout,
    loginWithGoogle,
    registerWithEmail,
    resetPassword,
    resendEmailVerification,
    checkEmailVerification,
    getPendingAdminRequests,
    approveAdminRequest,
    rejectAdminRequest,
  }), [user, role, userStatus, loading, emailVerified, profileCompleted]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
