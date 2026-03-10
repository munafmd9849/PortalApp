/**
 * Backend Health Check Utility
 * Diagnostic tool to verify backend connectivity and endpoint health
 * Use this during development and deployment to ensure backend is accessible
 */

import { API_BASE_URL } from '../config/api.js';

/**
 * Check if backend is reachable
 */
export async function checkBackendHealth() {
  const healthUrl = API_BASE_URL.replace('/api', '/health');
  
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        healthy: true,
        status: response.status,
        message: data.message || 'Backend is healthy',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      healthy: false,
      status: response.status,
      message: `Backend returned status ${response.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      status: null,
      message: error.message || 'Failed to connect to backend',
      error: error.name,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check critical API endpoints
 */
export async function checkCriticalEndpoints() {
  const endpoints = [
    { name: 'Health', path: '/health' },
    { name: 'Auth', path: '/api/auth/me' },
    { name: 'Jobs', path: '/api/jobs' },
    { name: 'Students', path: '/api/students' },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const url = endpoint.path.startsWith('/api') 
        ? `${API_BASE_URL}${endpoint.path.replace('/api', '')}`
        : `${API_BASE_URL.replace('/api', '')}${endpoint.path}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });

      results.push({
        name: endpoint.name,
        path: endpoint.path,
        status: response.status,
        ok: response.ok,
        accessible: true,
      });
    } catch (error) {
      results.push({
        name: endpoint.name,
        path: endpoint.path,
        status: null,
        ok: false,
        accessible: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Comprehensive health check with logging
 */
export async function performHealthCheck() {
  console.group('🏥 Backend Health Check');
  console.log('Backend URL:', API_BASE_URL);
  console.log('Timestamp:', new Date().toISOString());

  // Check basic health
  const health = await checkBackendHealth();
  console.log('Health Status:', health);

  // Check critical endpoints
  const endpoints = await checkCriticalEndpoints();
  console.log('Critical Endpoints:', endpoints);

  const allHealthy = health.healthy && endpoints.every(e => e.accessible);
  
  if (allHealthy) {
    console.log('✅ All health checks passed');
  } else {
    console.error('❌ Some health checks failed');
    console.error('Health:', health);
    console.error('Endpoints:', endpoints);
  }

  console.groupEnd();

  return {
    healthy: allHealthy,
    health,
    endpoints,
  };
}

/**
 * Auto-run health check in development
 */
if (import.meta.env.DEV) {
  // Run health check on app load in development
  performHealthCheck().catch(err => {
    console.error('Health check failed:', err);
  });
}
