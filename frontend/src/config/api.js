/**
 * Centralized API Configuration
 * All API URLs should be imported from here
 * This ensures consistency across the application
 */

// Get API base URL from environment variable
// Default to port 3000 (backend default) if not specified
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  // Default fallback - use port 3000 (backend default)
  return 'http://localhost:3000/api';
};

// Get Socket URL from environment variable
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) {
    return envUrl;
  }
  // Default fallback - use port 3000 (backend default)
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

// Export getters for dynamic access (in case env changes)
export const getAPIBaseURL = () => getApiBaseUrl();
export const getSocketURL = () => getSocketUrl();

// Helper to get the port number for error messages
export const getBackendPort = () => {
  const apiUrl = getApiBaseUrl();
  const match = apiUrl.match(/:(\d+)/);
  return match ? match[1] : '3000';
};

