/**
 * Centralized API Configuration
 * All API URLs should be imported from here
 * This ensures consistency across the application
 */

// Check if we're in production build
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Get API base URL from environment variable
// Development: Allows localhost defaults for local development
// Production: Requires environment variable (no localhost)
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  // In production, require env var
  if (isProduction) {
    console.error('❌ CRITICAL: VITE_API_URL environment variable is not set.');
    console.error('   Please set VITE_API_URL in your production environment (e.g., VITE_API_URL=https://api.yourdomain.com/api)');
    // Don't throw - return a placeholder that will fail gracefully
    return '/api';
  }
  
  // Development: Use localhost default
  console.warn('⚠️  VITE_API_URL not set, using development default: http://localhost:3000/api');
  return 'http://localhost:3000/api';
};

// Get Socket URL from environment variable
// Development: Allows localhost defaults for local development
// Production: Requires environment variable (no localhost)
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // In production, require env var
  if (isProduction) {
    console.error('❌ CRITICAL: VITE_SOCKET_URL environment variable is not set.');
    console.error('   Please set VITE_SOCKET_URL in your production environment (e.g., VITE_SOCKET_URL=https://api.yourdomain.com)');
    // Don't throw - return a placeholder that will fail gracefully
    return '';
  }
  
  // Development: Use localhost default
  console.warn('⚠️  VITE_SOCKET_URL not set, using development default: http://localhost:3000');
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

// Export getters for dynamic access (in case env changes)
export const getAPIBaseURL = () => getApiBaseUrl();
export const getSocketURL = () => getSocketUrl();

// Helper removed - no longer needed since we don't show localhost URLs in error messages

