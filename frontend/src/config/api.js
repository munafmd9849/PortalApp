/**
 * Centralized API Configuration
 * All API URLs should be imported from here
 * This ensures consistency across the application
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - VITE_API_URL: Base backend URL (e.g., http://localhost:3000/api)
 * - VITE_SOCKET_URL: Socket.IO URL (e.g., http://localhost:3000)
 * 
 * NO LOCALHOST FALLBACKS - App will fail if env vars not set (production-grade)
 */

// Check if we're in production build
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

/**
 * Get API base URL from environment variable
 * BACKEND IS SINGLE SOURCE OF TRUTH - No localhost fallbacks
 */
const getApiBaseUrl = () => {
  // Prefer VITE_API_BASE_URL, fallback to VITE_API_URL for backward compatibility
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    // Ensure URL ends with /api for consistency
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  // CRITICAL: No fallbacks - app must fail if backend URL not configured
  const errorMsg = '❌ CRITICAL: VITE_API_BASE_URL (or VITE_API_URL) environment variable is not set. ' +
    'Please set it in your environment (e.g., VITE_API_BASE_URL=http://localhost:3000/api)';
  
  console.error(errorMsg);
  
  // In production, throw error to prevent silent failures
  if (isProduction) {
    throw new Error(errorMsg);
  }
  
  // In development, still throw but with helpful message
  throw new Error(errorMsg + '\nApp cannot run without backend URL configured.');
};

/**
 * Get Socket.IO URL from environment variable
 * BACKEND IS SINGLE SOURCE OF TRUTH - No localhost fallbacks
 */
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // CRITICAL: No fallbacks - app must fail if socket URL not configured
  const errorMsg = '❌ CRITICAL: VITE_SOCKET_URL environment variable is not set. ' +
    'Please set it in your environment (e.g., VITE_SOCKET_URL=http://localhost:3000)';
  
  console.error(errorMsg);
  
  // In production, throw error to prevent silent failures
  if (isProduction) {
    throw new Error(errorMsg);
  }
  
  // In development, still throw but with helpful message
  throw new Error(errorMsg + '\nApp cannot run without Socket.IO URL configured.');
};

// Export constants - will throw if env vars not set (production-grade)
export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

// Export getters for dynamic access (if needed)
export const getAPIBaseURL = () => getApiBaseUrl();
export const getSocketURL = () => getSocketUrl();

