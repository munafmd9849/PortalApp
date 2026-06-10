/**
 * API Service Layer
 * Replaces Firebase SDK calls with HTTP requests
 * Centralized API client for all backend requests
 */

import { API_BASE_URL } from '../config/api.js';

// Lazy import toast utility to avoid circular dependency
let toastUtils = null;
async function getToastUtils() {
  if (!toastUtils) {
    toastUtils = await import('../utils/toast.js');
  }
  return toastUtils;
}

/**
 * Build query string from params, omitting undefined/null.
 * NOTE: URLSearchParams will stringify `undefined` as "undefined" if you pass it directly.
 */
function toQueryString(params = {}) {
  const sp = new URLSearchParams();
  if (!params || typeof params !== 'object') return '';

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    sp.append(key, String(value));
  }
  return sp.toString();
}

/**
 * Get auth token from storage
 */
function getAuthToken() {
  return localStorage.getItem('accessToken');
}

/**
 * Get refresh token from storage
 */
function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

/**
 * Set auth tokens in storage
 */
function setAuthTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
}

/**
 * Clear auth tokens
 */
function clearAuthTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * Refresh access token
 * Uses centralized API client for consistency
 * Internal function - bypasses normal API request flow to avoid circular dependency
 */
async function refreshAccessToken() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    // Use internal fetch for token refresh (bypasses apiRequest to avoid circular dependency)
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include credentials for CORS
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      let errorData;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : { error: `HTTP ${response.status}: ${response.statusText}` };
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || errorData.message || 'Token refresh failed');
    }

    const data = await response.json();
    if (!data.accessToken) {
      throw new Error('Invalid refresh response: missing accessToken');
    }

    setAuthTokens(data.accessToken, refreshToken);
    return data.accessToken;
  } catch (error) {
    // Clear tokens and redirect on refresh failure (replace so back button doesn't return to broken state)
    clearAuthTokens();
    window.location.replace('/');
    throw error;
  }
}

/**
 * API request wrapper with auth and error handling
 * Automatically shows toast notifications for errors and optional success messages
 * 
 * @param {string} endpoint - API endpoint
 * @param {object} options - Request options
 * @param {boolean} options.silent - If true, don't show toast notifications
 * @param {boolean} options.showSuccess - If true, show success toast if response has message
 * @returns {Promise} API response data
 */
async function apiRequest(endpoint, options = {}) {
  const { silent = false, showSuccess = false, noCache = false, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const token = getAuthToken();

  // --- START UNIVERSAL CACHING LAYER ---
  const CACHE_KEY_PREFIX = 'api_cache_';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const cacheKey = `${CACHE_KEY_PREFIX}${endpoint}`;

  // 1. Cache Invalidation for Mutations
  if (method !== 'GET') {
    // Clear related caches on any mutation (POST, PUT, DELETE, PATCH)
    // We clear anything that starts with the same base path (e.g., /jobs clears all /jobs?...)
    const basePath = endpoint.split('?')[0];
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        const cachedUrl = key.replace(CACHE_KEY_PREFIX, '');
        
        // Aggressive invalidation: If we mutate /jobs/123, we should clear /jobs (the list)
        // Check if both are job related
        const isJobMutation = endpoint.startsWith('/jobs');
        const isJobCache = cachedUrl.startsWith('/jobs');
        
        const isAssessmentMutation = endpoint.startsWith('/assessments');
        const isAssessmentCache = cachedUrl.startsWith('/assessments');

        const isMockMutation = endpoint.startsWith('/mock-interviews');
        const isMockCache = cachedUrl.startsWith('/mock-interviews');

        const isApplicationMutation = endpoint.startsWith('/applications');
        const isApplicationCache = cachedUrl.startsWith('/applications');

        const isRecruiterScreeningMutation = endpoint.startsWith('/recruiter/screening');
        const isRecruiterScreeningCache = cachedUrl.startsWith('/recruiter/screening');

        const isInterviewMutation = endpoint.startsWith('/interview');
        const isInterviewCache = cachedUrl.startsWith('/interview');

        const isStudentResumeMutation = endpoint.startsWith('/students/resume');
        const isStudentResumeCache = cachedUrl.includes('/students/resumes') || cachedUrl.includes('/students/resume');
        
        if (
          (isJobMutation && isJobCache) ||
          (isAssessmentMutation && isAssessmentCache) ||
          (isMockMutation && isMockCache) ||
          (isApplicationMutation && isApplicationCache) ||
          (isRecruiterScreeningMutation && isRecruiterScreeningCache) ||
          (isInterviewMutation && isInterviewCache) ||
          (isStudentResumeMutation && isStudentResumeCache)
        ) {
          localStorage.removeItem(key);
        } else if (cachedUrl.startsWith(basePath)) {
          localStorage.removeItem(key);
        }
      }
    });

    // Special case: mutations in students/profile should clear jobs/targeted too
    if (endpoint.includes('/students/profile')) {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('/jobs/targeted')) localStorage.removeItem(key);
      });
    }
  }

  // 2. Cache Lookup for GETs
  if (method === 'GET' && !fetchOptions.body && !noCache) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          return data;
        }
        localStorage.removeItem(cacheKey);
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
  }
  // --- END UNIVERSAL CACHING LAYER ---

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    let response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Include credentials for CORS (cookies, auth headers)
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    } catch (fetchError) {
      // Network error - server not reachable, CORS issue, or connection failed
      console.error('Network Error (Failed to Fetch):', {
        endpoint,
        url,
        error: fetchError.message,
        type: fetchError.name,
      });

      // Provide helpful error message (production-safe, no localhost references)
      let errorMessage = 'Failed to connect to server. ';
      if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.';
      } else if (fetchError.message.includes('CORS') || fetchError.message.includes('cors')) {
        errorMessage += 'Connection error. Please check your network connection and try again.';
      } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
        errorMessage += 'Cannot reach the server. Please check your network connection and ensure the service is available.';
      } else {
        errorMessage += fetchError.message || 'Unknown network error.';
      }

      const error = new Error(errorMessage);
      error.isNetworkError = true;
      error.originalError = fetchError;
      error.endpoint = endpoint;
      error.url = url;

      // Automatically show network error toast unless silent
      if (!silent) {
        getToastUtils().then(utils => {
          utils.handleApiError(error);
        }).catch(() => {
          // Toast not initialized yet, just log
          console.error('Network Error:', error.message);
        });
      }

      throw error;
    }

    // Handle 401 - try refresh token
    if (response.status === 401 && token) {
      try {
        const newToken = await refreshAccessToken();
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: 'include', // Include credentials for retry
        });
      } catch (error) {
        throw error;
      }
    }

    if (!response.ok) {
      let errorData;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : { error: `HTTP ${response.status}: ${response.statusText}` };
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      // Log full error details for debugging
      console.error(`API Error [${response.status}]:`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // Use exact backend error message (backend is source of truth)
      const errorMessage = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}: ${response.statusText}`;

      const error = new Error(errorMessage);
      error.response = {
        data: errorData,
        status: response.status,
        statusText: response.statusText,
      };
      error.status = response.status;

      // Handle 403 specifically - permission denied
      if (response.status === 403) {
        error.isPermissionError = true;
        // If no specific message, provide context-aware message
        if (!errorData.error && !errorData.message) {
          error.message = 'Access denied. You do not have permission to perform this action.';
        }
      }

      // Automatically show error toast unless silent
      if (!silent) {
        getToastUtils().then(utils => {
          utils.handleApiError(error);
        }).catch(() => {
          // Toast not initialized yet, just log
          console.error('API Error:', error.message);
        });
      }

      throw error;
    }

    const data = await response.json();

    // --- UNIVERSAL CACHE: SAVE ---
    if (method === 'GET' && !fetchOptions.body && !noCache) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('[API Cache] Write error:', e);
      }
    }
    // ----------------------------


    // Show success toast if requested and message exists
    if (!silent && showSuccess && data?.message) {
      getToastUtils().then(utils => {
        utils.showSuccess(data.message);
      }).catch(() => {
        // Toast not initialized, ignore
      });
    }

    return data;
  } catch (error) {
    // Re-throw if it's already our custom error
    if (error.isNetworkError || error.response || error.status) {
      throw error;
    }

    // Catch any other unexpected errors
    console.error('Unexpected API Error:', {
      endpoint,
      url,
      error: error.message,
      stack: error.stack,
    });

    throw new Error(`API request failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Upload file (for resume, profile photo)
 */
async function uploadFile(endpoint, file, fieldName = 'file', onProgress) {
  const token = getAuthToken();
  const formData = new FormData();
  // Use field name based on endpoint if not specified
  const fileFieldName = endpoint.includes('/resume') ? 'resume' : fieldName;
  formData.append(fileFieldName, file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        // Try to parse error response body
        let errorMessage = `Upload failed: ${xhr.statusText || 'Bad Request'}`;
        try {
          if (xhr.responseText) {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error) {
              errorMessage = errorResponse.error;
            } else if (errorResponse.message) {
              errorMessage = errorResponse.message;
            }
          }
        } catch (e) {
          // If parsing fails, try to get status text
          if (xhr.status === 400) {
            errorMessage = 'Bad Request: Please check the file format and size (max 2MB for images)';
          } else if (xhr.status === 401) {
            errorMessage = 'Unauthorized: Please log in again';
          } else if (xhr.status === 413) {
            errorMessage = 'File too large: Maximum size is 2MB';
          } else if (xhr.status >= 500) {
            errorMessage = 'Server error: Please try again later';
          }
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', `${API_BASE_URL}${endpoint}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Upload a proctoring screenshot (webcam frame) for an assessment session.
 * Uses multipart/form-data and uploads directly to backend → Cloudinary (no local storage).
 */
async function uploadProctoringScreenshot(sessionId, blob, { flags, faceCount, captureType, event, riskFlag, violationId } = {}) {
  const token = getAuthToken();
  const formData = new FormData();
  const file = blob instanceof File ? blob : new File([blob], `screenshot-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
  formData.append('screenshot', file);
  if (flags) formData.append('flags', JSON.stringify(flags));
  if (faceCount !== undefined && faceCount !== null) formData.append('faceCount', String(faceCount));
  if (captureType) formData.append('captureType', captureType);
  if (event) formData.append('event', event);
  if (riskFlag !== undefined && riskFlag !== null) formData.append('riskFlag', riskFlag ? 'true' : 'false');
  if (violationId) formData.append('violationId', violationId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        let errorMessage = `Upload failed: ${xhr.statusText || 'Bad Request'}`;
        try {
          if (xhr.responseText) {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error) errorMessage = errorResponse.error;
            else if (errorResponse.message) errorMessage = errorResponse.message;
          }
        } catch {
          // ignore
        }
        reject(new Error(errorMessage));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.open('POST', `${API_BASE_URL}/assessments/session/screenshot/${sessionId}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

function parseUploadError(xhr, fallback) {
  try {
    const body = JSON.parse(xhr.responseText);
    const err = new Error(body.error || body.details || fallback);
    err.code = body.code;
    err.expectedQuestionIndex = body.expectedQuestionIndex;
    err.expectedQuestionId = body.expectedQuestionId;
    return err;
  } catch {
    return new Error(fallback);
  }
}

async function uploadAiInterviewMultipart(url, formData) {
  const token = getAuthToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        reject(new Error(parseUploadError(xhr, `Upload failed (${xhr.status})`)));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.open('POST', `${API_BASE_URL}${url}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

// Export API functions
export const api = {
  // Auth
  sendOTP: (email) => apiRequest('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  verifyOTP: (email, otp) => apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  }),

  register: (data) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (data) => {
    const response = apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(data => {
      if (data.accessToken && data.refreshToken) {
        setAuthTokens(data.accessToken, data.refreshToken);
      }
      return data;
    });
    return response;
  },

  getGoogleLoginUrl: (role = 'STUDENT') => {
    return apiRequest(`/auth/google-login/url?role=${role}`, {
      method: 'GET',
      silent: true,
    });
  },

  logout: async () => {
    try {
      const refreshToken = getRefreshToken();
      // Try to call logout API, but don't fail if it errors
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (apiError) {
        console.warn('Logout API call failed, but clearing tokens anyway:', apiError);
      }
      // Always clear tokens, even if API call fails
      clearAuthTokens();

      // Clear all global API caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('api_cache_') || key.includes('admin_dashboard_cache')) {
          localStorage.removeItem(key);
        }
      });

      return { success: true };
    } catch (error) {
      // Even if everything fails, clear tokens
      clearAuthTokens();
      throw error;
    }
  },

  getCurrentUser: () => apiRequest('/auth/me'),

  resetPassword: (email) => apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  verifyResetOTP: (email, otp) => apiRequest('/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  }),

  updatePassword: (resetToken, password) => apiRequest('/auth/update-password', {
    method: 'POST',
    body: JSON.stringify({ resetToken, password }),
  }),

  // Students
  getStudentProfile: (studentId, options = {}) => apiRequest(
    studentId ? `/students/profile?studentId=${studentId}` : '/students/profile',
    { noCache: options.noCache },
  ),
  updateStudentProfile: (data) => apiRequest('/students/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  blockUnblockStudent: (studentId, data) => apiRequest(`/students/${studentId}/block`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Public Profile (NO AUTH - public access)
  getPublicProfile: (publicProfileId) => {
    // Public endpoint - use apiRequest but without auth token
    return apiRequest(`/public/profile/${publicProfileId}`, {
      method: 'GET',
      silent: true, // Don't show error toasts for public endpoints
    });
  },

  // Public Profile Management (AUTH REQUIRED - student only)
  generatePublicProfileId: () => apiRequest('/students/public-profile/generate', {
    method: 'POST',
  }),
  regeneratePublicProfileId: () => apiRequest('/students/public-profile/regenerate', {
    method: 'POST',
  }),
  getPublicProfileSettings: () => apiRequest('/students/public-profile/settings'),
  updatePublicProfileSettings: (settings) => apiRequest('/students/public-profile/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  }),
  getAllStudents: (params = {}) => {
    const query = toQueryString(params);
    return apiRequest(`/students?${query}`);
  },
  getStudentSkills: (studentId, options = {}) => apiRequest(
    studentId ? `/students/skills?studentId=${studentId}` : '/students/skills',
    { noCache: options.noCache },
  ),
  addOrUpdateSkill: (skill) => apiRequest('/students/skills', {
    method: 'POST',
    body: JSON.stringify(skill),
  }),
  deleteSkill: (skillId) => apiRequest(`/students/skills/${skillId}`, {
    method: 'DELETE',
  }),

  // Education (TODO: Backend needs to add these endpoints)
  addEducation: (education) => apiRequest('/students/education', {
    method: 'POST',
    body: JSON.stringify(education),
  }),
  updateEducation: (educationId, education) => apiRequest(`/students/education/${educationId}`, {
    method: 'PUT',
    body: JSON.stringify(education),
  }),
  deleteEducation: (educationId) => apiRequest(`/students/education/${educationId}`, {
    method: 'DELETE',
  }),

  // Experience (for Resume System)
  addExperience: (experience) => apiRequest('/students/experience', {
    method: 'POST',
    body: JSON.stringify(experience),
  }),
  updateExperience: (experienceId, experience) => apiRequest(`/students/experience/${experienceId}`, {
    method: 'PUT',
    body: JSON.stringify(experience),
  }),
  deleteExperience: (experienceId) => apiRequest(`/students/experience/${experienceId}`, {
    method: 'DELETE',
  }),

  // Projects (TODO: Backend needs to add these endpoints)
  addProject: (project) => apiRequest('/students/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  }),
  updateProject: (projectId, project) => apiRequest(`/students/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(project),
  }),
  deleteProject: (projectId) => apiRequest(`/students/projects/${projectId}`, {
    method: 'DELETE',
  }),
  generateProjectContent: (data) => apiRequest('/students/generate-project-content', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Achievements (TODO: Backend needs to add these endpoints)
  addAchievement: (achievement) => apiRequest('/students/achievements', {
    method: 'POST',
    body: JSON.stringify(achievement),
  }),
  updateAchievement: (achievementId, achievement) => apiRequest(`/students/achievements/${achievementId}`, {
    method: 'PUT',
    body: JSON.stringify(achievement),
  }),
  deleteAchievement: (achievementId) => apiRequest(`/students/achievements/${achievementId}`, {
    method: 'DELETE',
  }),

  // Cloudinary Uploads
  uploadProfileImage: (file, onProgress) => uploadFile('/students/profile-image', file, 'profileImage', onProgress),
  deleteProfileImage: () => apiRequest('/students/profile-image', {
    method: 'DELETE',
  }),
  uploadResume: (file, title, onProgress) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('resume', file);
    if (title) {
      formData.append('title', title);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('api_cache_') && key.includes('/students/resumes')) {
                localStorage.removeItem(key);
              }
            });
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          let errorMessage = `Upload failed: ${xhr.statusText}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error) {
              errorMessage = errorResponse.error;
            }
          } catch (e) {
            // If parsing fails, use default message
          }
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/students/resume`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },
  getResumes: (opts = {}) => apiRequest('/students/resumes', opts),
  getResume: (resumeId) => apiRequest(`/students/resume/${resumeId}`),
  getStudentResumeViewUrl: (resumeId) => apiRequest(`/students/resume/${resumeId}/view-url`),
  setDefaultResume: (resumeId) => apiRequest(`/students/resume/${resumeId}/default`, {
    method: 'PATCH',
  }),
  deleteResume: (resumeId) => apiRequest(`/students/resume/${resumeId}`, {
    method: 'DELETE',
  }),
  extractResumeText: (data) => apiRequest('/students/resume/extract-text', {
    method: 'POST',
    body: JSON.stringify(data),
    silent: true,
  }),
  analyzeResumeATS: (data) => apiRequest('/students/resume/ats-analysis', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  optimizeResume: (data) => apiRequest('/students/resume/optimize', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  generateResumePDF: (data) => apiRequest('/students/generate-resume-pdf', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Jobs
  getTargetedJobs: (studentId, options = {}) => apiRequest(
    studentId ? `/jobs/targeted?studentId=${studentId}` : '/jobs/targeted',
    options
  ),
  clearApiCache: (prefix) => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('api_cache_') && key.includes(prefix)) {
        localStorage.removeItem(key);
      }
    });
  },
  getJobs: (params = {}) => {
    const query = toQueryString(params);
    return apiRequest(`/jobs?${query}`);
  },
  getJob: (jobId) => apiRequest(`/jobs/${jobId}`),
  createJob: (data) => apiRequest('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateJob: (jobId, data) => apiRequest(`/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteJob: (jobId) => apiRequest(`/jobs/${jobId}`, {
    method: 'DELETE',
  }),
  postJob: (jobId, targeting) => apiRequest(`/jobs/${jobId}/post`, {
    method: 'POST',
    body: JSON.stringify(targeting),
  }),
  approveJob: (jobId, targeting = {}) => apiRequest(`/jobs/${jobId}/approve`, {
    method: 'POST',
    body: JSON.stringify(targeting),
  }),
  rejectJob: (jobId, data) => apiRequest(`/jobs/${jobId}/reject`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  analyzeCandidates: (jobId) => apiRequest(`/jobs/${jobId}/analyze`),
  autoArchiveExpiredJobs: () => apiRequest('/jobs/auto-archive-expired', {
    method: 'POST',
  }),

  // Announcements (Admin)
  getAnnouncements: (params = {}) => {
    const query = toQueryString(params);
    return apiRequest(`/announcements${query ? `?${query}` : ''}`);
  },
  createAnnouncement: (formData) => {
    const token = getAuthToken();
    if (!token) return Promise.reject(new Error('Not authenticated'));
    return fetch(`${API_BASE_URL}/announcements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      return data;
    });
  },

  // Recruiter dashboard & analytics
  getRecruiterDashboardStats: () => apiRequest('/recruiters/dashboard-stats'),
  getRecruiterCompanyAnalytics: () => apiRequest('/recruiters/company-analytics'),

  // Recruiter MOU (stored in Cloudinary)
  getMouDocuments: () => apiRequest('/recruiters/mou'),
  uploadMouDocument: (formData) => {
    const token = getAuthToken();
    if (!token) return Promise.reject(new Error('Not authenticated'));
    return fetch(`${API_BASE_URL}/recruiters/mou`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      return data;
    });
  },

  // Applications
  getAllApplications: (filters = {}) => {
    const query = toQueryString(filters);
    return apiRequest(`/applications${query ? `?${query}` : ''}`);
  },
  getStudentApplications: (studentId, options = {}) => apiRequest(
    studentId ? `/applications/student?studentId=${studentId}` : '/applications/student',
    options
  ),

  exportApplications: (filters = {}) => apiRequest('/applications/export', {
    method: 'POST',
    body: JSON.stringify({ filters }),
  }),
  getExportStatus: (jobId) => apiRequest(`/applications/export/${jobId}`),

  getStudentInterviewHistory: (opts = {}) => apiRequest('/applications/student/interview-history', opts),
  applyToJob: (jobId, applicationData = {}) => apiRequest(`/applications/jobs/${jobId}`, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  }),
  updateApplicationStatus: (applicationId, status, interviewDate) => apiRequest(`/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, interviewDate }),
  }),
  getApplicationResumeViewUrl: (applicationId) => apiRequest(`/applications/${applicationId}/resume-view-url`),
  revokeApplication: (applicationId, reason) => apiRequest(`/applications/${applicationId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  restoreApplication: (applicationId) => apiRequest(`/applications/${applicationId}/restore`, {
    method: 'POST',
  }),

  // Notifications
  getNotifications: (params = {}) => {
    const query = toQueryString(params);
    return apiRequest(`/notifications?${query}`);
  },
  markNotificationRead: (notificationId) => apiRequest(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  }),
  markAllNotificationsRead: () => apiRequest('/notifications/mark-all-read', {
    method: 'PATCH',
  }),

  // Queries
  submitStudentQuery: (data, proofDocument = null) => {
    // If proof document is provided, use FormData; otherwise use JSON
    if (proofDocument) {
      const token = getAuthToken();
      const formData = new FormData();

      // Append all query data fields to FormData
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });

      // Append proof document with the correct field name
      formData.append('proofDocument', proofDocument);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            let errorMessage = `Query submission failed: ${xhr.statusText}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              if (errorResponse.error) {
                errorMessage = errorResponse.error;
              }
            } catch (e) {
              // If parsing fails, use default message
            }
            const error = new Error(errorMessage);
            error.status = xhr.status;
            reject(error);
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });

        xhr.open('POST', `${API_BASE_URL}/queries`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        // Don't set Content-Type - browser will set it with boundary for FormData
        xhr.send(formData);
      });
    } else {
      // No file, use regular JSON API request
      return apiRequest('/queries', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  getStudentQueries: () => apiRequest('/queries'),
  getAdminQueries: () => apiRequest('/queries/admin'),
  respondToStudentQuery: (queryId, payload) => apiRequest(`/queries/${queryId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),

  // Endorsements (Magic Link System)
  requestEndorsement: (data) => apiRequest('/endorsements/request', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getStudentEndorsements: () => apiRequest('/endorsements/student'),
  deleteEndorsementRequest: (tokenId) => apiRequest(`/endorsements/request/${tokenId}`, {
    method: 'DELETE',
  }),
  getEndorsementByToken: (token) => apiRequest(`/endorsements/${token}`, { silent: true }),
  submitEndorsement: (token, data) => apiRequest(`/endorsements/submit/${token}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Admin Interview Management
  getInterviewSession: (interviewId) => apiRequest(`/admin/interview/${interviewId}`),
  getInterviewRound: (interviewId) => apiRequest(`/admin/interview/${interviewId}/round`),
  updateInterviewRound: (interviewId, data) => apiRequest(`/admin/interview/${interviewId}/round`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  startInterviewRound: (interviewId, roundName) => apiRequest(`/admin/interview/${interviewId}/round/${encodeURIComponent(roundName)}/start`, {
    method: 'POST',
  }),
  endInterviewSession: (interviewId) => apiRequest(`/admin/interview/${interviewId}/end`, {
    method: 'POST',
  }),
  getInterviewCandidates: (interviewId, roundName) => apiRequest(`/admin/interview/${interviewId}/round/${encodeURIComponent(roundName)}/candidates`),
  getInterviewActivities: (interviewId) => apiRequest(`/admin/interview/${interviewId}/activities`),
  evaluateCandidate: (interviewId, candidateId, data) => apiRequest(`/admin/interview/${interviewId}/candidate/${candidateId}/evaluate`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Interviewer endpoints (token-based, no auth required) — always bypass cache (live workflow state)
  getInterviewSessionByToken: (sessionId, token, opts = {}) => apiRequest(`/interview/session/${sessionId}?token=${encodeURIComponent(token)}`, { silent: true, noCache: true, ...opts }),
  getActiveRound: (sessionId, token, opts = {}) => apiRequest(`/interview/session/${sessionId}/active-round?token=${encodeURIComponent(token)}`, { silent: true, noCache: true, ...opts }),
  getRoundCandidates: (roundId, token, opts = {}) => apiRequest(`/interview/round/${roundId}/candidates?token=${encodeURIComponent(token)}`, { silent: true, noCache: true, ...opts }),
  evaluateRoundCandidate: (roundId, token, data) => apiRequest(`/interview/round/${roundId}/evaluate?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    body: JSON.stringify(data),
    silent: true,
  }),
  startRound: (roundId, token) => apiRequest(`/interview/round/${roundId}/start?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    silent: true,
  }),
  endRound: (roundId, token) => apiRequest(`/interview/round/${roundId}/end?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    silent: true,
  }),
  /** End interview session (token-based). Use when all rounds are ended and session is ONGOING/INCOMPLETE. */
  endInterviewSessionByToken: (sessionId, token) => apiRequest(`/interview/session/${sessionId}/end?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    silent: true,
  }),

  /**
   * Download interview session as CSV spreadsheet (after last round).
   * Fetches blob and triggers browser download; does not use apiRequest.
   */
  async exportInterviewSessionSpreadsheet(sessionId, token) {
    const { API_BASE_URL } = await import('../config/api.js');
    const url = `${API_BASE_URL}/interview/session/${sessionId}/export?token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.details || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    let filename = 'interview-session-export.csv';
    if (disposition) {
      const m = disposition.match(/filename="?([^";\n]+)"?/);
      if (m) filename = m[1].trim();
    }
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(u);
  },

  // Auth Profile (for admin/recruiter)
  getAuthProfile: () => apiRequest('/auth/profile'),

  // Admin Requests
  createAdminRequest: (data) => apiRequest('/admin-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getPendingAdminRequests: () => apiRequest('/admin-requests/pending'),
  getAllAdminRequests: (params = {}) => {
    const query = toQueryString(params);
    return apiRequest(`/admin-requests${query ? `?${query}` : ''}`);
  },
  approveAdminRequest: (requestId) => apiRequest(`/admin-requests/${requestId}/approve`, {
    method: 'PATCH',
  }),
  rejectAdminRequest: (requestId, data) => apiRequest(`/admin-requests/${requestId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  getPlacementGuidance: (topic) => apiRequest('/placement/ai', {
    method: 'POST',
    body: JSON.stringify({ topic }),
  }),

  // Recruiters (Admin)
  getRecruiterDirectory: () => apiRequest('/recruiters/directory'),
  getRecruiterJobs: (email) => apiRequest(`/recruiters/${encodeURIComponent(email)}/jobs`),
  blockUnblockRecruiter: (recruiterId, data) => apiRequest(`/recruiters/${recruiterId}/block`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Super Admin
  listSuperAdminAdmins: () => apiRequest('/super-admin/admins'),
  createSuperAdminAdmin: (data) => apiRequest('/super-admin/admins', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSuperAdminAdmin: (userId, data) => apiRequest(`/super-admin/admins/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  disableSuperAdminAdmin: (userId) => apiRequest(`/super-admin/admins/${userId}/disable`, { method: 'PATCH' }),
  enableSuperAdminAdmin: (userId) => apiRequest(`/super-admin/admins/${userId}/enable`, {
    method: 'PATCH',
  }),
  getAdminPerformance: (userId) => apiRequest(`/super-admin/admins/${userId}/performance`),
  getSuperAdminStats: () => apiRequest('/super-admin/stats'),
  getStatsSummary: () => apiRequest('/super-admin/stats/summary'),
  freezeInterviewSession: (sessionId) => apiRequest(`/admin/interview-scheduling/session/${sessionId}/freeze`, { method: 'PATCH' }),
  unfreezeInterviewSession: (sessionId) => apiRequest(`/admin/interview-scheduling/session/${sessionId}/unfreeze`, { method: 'PATCH' }),

  // Analytics (Control Tower)
  getAnalyticsOverview: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/overview${query ? `?${query}` : ''}`);
  },
  getAnalyticsFunnel: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/funnel${query ? `?${query}` : ''}`);
  },
  getAnalyticsBatchPerf: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/batch-performance${query ? `?${query}` : ''}`);
  },
  getAnalyticsSchoolPerf: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/school-performance${query ? `?${query}` : ''}`);
  },
  getAnalyticsCenterPerf: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/center-performance${query ? `?${query}` : ''}`);
  },
  getAnalyticsUnplaced: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/unplaced-students${query ? `?${query}` : ''}`);
  },
  getAnalyticsCompanyPerf: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/company-performance${query ? `?${query}` : ''}`);
  },
  getAnalyticsAdminPerf: (params) => {
    const query = toQueryString(params);
    return apiRequest(`/super-admin/analytics/admin-performance${query ? `?${query}` : ''}`);
  },

  // Academic Structure
  getSchools: (opts) =>
    apiRequest(`/academic/schools${opts?.includeInactive ? '?includeInactive=true' : ''}`),
  getCenters: (opts) =>
    apiRequest(`/academic/centers${opts?.includeInactive ? '?includeInactive=true' : ''}`),
  getBatches: (opts) =>
    apiRequest(`/academic/batches${opts?.includeInactive ? '?includeInactive=true' : ''}`),
  createSchool: (data) => apiRequest('/academic/schools', { method: 'POST', body: JSON.stringify(data) }),
  updateSchool: (id, data) => apiRequest(`/academic/schools/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSchool: (id) => apiRequest(`/academic/schools/${id}`, { method: 'DELETE' }),

  createCenter: (data) => apiRequest('/academic/centers', { method: 'POST', body: JSON.stringify(data) }),
  updateCenter: (id, data) => apiRequest(`/academic/centers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCenter: (id) => apiRequest(`/academic/centers/${id}`, { method: 'DELETE' }),

  createBatch: (data) => apiRequest('/academic/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id, data) => apiRequest(`/academic/batches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBatch: (id) => apiRequest(`/academic/batches/${id}`, { method: 'DELETE' }),

  // Utility
  uploadFile,
  getAuthToken,
  setAuthTokens,
  clearAuthTokens,

  // Assessment Engine
  createAssessment: (data) => apiRequest('/assessments/create', { method: 'POST', body: JSON.stringify(data) }),
  getAssessmentDashboard: (id) => apiRequest(`/assessments/dashboard/${id}`),
  getAssessmentCandidates: (assessmentId) => apiRequest(`/assessments/${assessmentId}/candidates`),
  updateAssessment: (id, data) => apiRequest(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publishAssessment: (id) => apiRequest(`/assessments/${id}/publish`, { method: 'POST' }),
  deleteAssessment: (id) => apiRequest(`/assessments/${id}`, { method: 'DELETE' }),
  getAssessments: () => apiRequest('/assessments/all', { noCache: true }),
  getAssessmentDetails: (id) => apiRequest(`/assessments/details/${id}`),
  getAssessmentResults: (sessionId) => apiRequest(`/assessments/results/${sessionId}`),
  getStudentAssessments: () =>
    apiRequest('/assessments/my-assignments', { noCache: true }),
  startAssessmentSession: (id, options = {}) =>
    apiRequest(`/assessments/session/start/${id}`, { method: 'POST', ...options }),
  logProctoringViolation: (sessionId, data) => apiRequest(`/assessments/session/violation/${sessionId}`, { method: 'POST', body: JSON.stringify(data) }),
  uploadProctoringMedia: (sessionId, data) => apiRequest(`/assessments/session/media/${sessionId}`, { method: 'POST', body: JSON.stringify(data) }),
  uploadProctoringScreenshot: (sessionId, blob, meta) => uploadProctoringScreenshot(sessionId, blob, meta),
  getProctoringSessionDetails: (sessionId) => apiRequest(`/assessments/session/proctoring/${sessionId}`),
  getProctoringScreenshotUrl: (screenshotId) => apiRequest(`/assessments/session/screenshot/${screenshotId}/url`),
  completeAssessment: (sessionId, data) => apiRequest(`/assessments/session/complete/${sessionId}`, { method: 'POST', body: JSON.stringify(data) }),
  runCode: (data) => apiRequest('/code/run', { method: 'POST', body: JSON.stringify(data) }),
  evaluateCode: (data) => apiRequest('/code/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  evaluateAssessmentCandidate: (assessmentId, studentId, data) => apiRequest(`/assessments/evaluate/${assessmentId}/${studentId}`, { method: 'POST', body: JSON.stringify(data) }),
  getAssessmentDashboard: (id) => apiRequest(`/assessments/dashboard/${id}`),
  getLiveAssessmentSessions: (id) => apiRequest(`/assessments/${id}/live-sessions`),
  getStudentSessionResults: (sessionId) => apiRequest(`/assessments/session/results/${sessionId}`),

  // Mock Interview System
  createMockInterviewDrive: (data) => apiRequest('/mock-interviews/create', { method: 'POST', body: JSON.stringify(data) }),
  publishMockInterviewDrive: (id) =>
    apiRequest(`/mock-interviews/drives/${id}/publish`, { method: 'POST' }),
  getMockInterviewDrives: (opts = {}) => apiRequest('/mock-interviews/all', { noCache: true, ...opts }),
  assignStudentToSlot: (data) => apiRequest('/mock-interviews/assign', { method: 'POST', body: JSON.stringify(data) }),
  updateMockSlotStatus: (data) => apiRequest('/mock-interviews/update-status', { method: 'POST', body: JSON.stringify(data) }),
  getStudentMockInterviews: () => apiRequest('/mock-interviews/my-sessions'),
  submitMockFeedback: (data) => apiRequest('/mock-interviews/feedback', { method: 'POST', body: JSON.stringify(data) }),
  updateMockInterviewDrive: (id, data) =>
    apiRequest(`/mock-interviews/drives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMockInterviewDrive: (id) => apiRequest(`/mock-interviews/drives/${id}`, { method: 'DELETE' }),
  getMockInterviewSlot: (slotId) => apiRequest(`/mock-interviews/slot/${slotId}`),
  getMockInterviewLiveCode: (slotId) => apiRequest(`/mock-interviews/slot/${slotId}/live-code`),
  patchMockInterviewLiveCode: (slotId, data) =>
    apiRequest(`/mock-interviews/slot/${slotId}/live-code`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getMockInterviewSlotResults: (slotId) => apiRequest(`/mock-interviews/results/slot/${slotId}`),
  getMockInterviewDriveResults: (driveId) => apiRequest(`/mock-interviews/results/drive/${driveId}`),
  updateMockInterviewSlot: (slotId, data) => apiRequest(`/mock-interviews/slot/${slotId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // AI Video Mock Interviews (one-way)
  createAiMockInterview: (data) =>
    apiRequest('/ai-mock-interviews', { method: 'POST', body: JSON.stringify(data) }),
  updateAiMockInterview: (id, data) =>
    apiRequest(`/ai-mock-interviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAiMockInterview: (id) =>
    apiRequest(`/ai-mock-interviews/${id}`, { method: 'DELETE' }),
  getAiMockInterviews: () => apiRequest('/ai-mock-interviews', { noCache: true }),
  getAiMockInterview: (id) => apiRequest(`/ai-mock-interviews/${id}`),
  getAiInterviewReview: (id) => apiRequest(`/ai-mock-interviews/${id}/review`),
  getAiEnrollmentDetail: (enrollmentId) => apiRequest(`/ai-mock-interviews/enrollment/${enrollmentId}/detail`),
  saveAiEnrollmentReview: (enrollmentId, data) =>
    apiRequest(`/ai-mock-interviews/enrollment/${enrollmentId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  regenerateAiInsights: (enrollmentId) =>
    apiRequest(`/ai-mock-interviews/enrollment/${enrollmentId}/regenerate-ai`, { method: 'POST' }),
  getStudentAiInterviews: () => apiRequest('/ai-mock-interviews/student/my-interviews'),
  getStudentAiInterviewSession: (interviewId) =>
    apiRequest(`/ai-mock-interviews/student/session/${interviewId}`),
  startAiInterviewSession: (enrollmentId) =>
    apiRequest(`/ai-mock-interviews/enrollment/${enrollmentId}/start`, { method: 'POST' }),
  updateAiInterviewProgress: (enrollmentId, data) =>
    apiRequest(`/ai-mock-interviews/enrollment/${enrollmentId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  submitAiInterviewAnswer: (enrollmentId, blob, { questionId, durationSeconds }) => {
    const formData = new FormData();
    const mime = blob.type || 'video/webm';
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const file =
      blob instanceof File
        ? blob
        : new File([blob], `answer-${Date.now()}.${ext}`, { type: mime });
    formData.append('recording', file);
    formData.append('questionId', questionId);
    if (durationSeconds != null) formData.append('durationSeconds', String(durationSeconds));
    return uploadAiInterviewMultipart(`/ai-mock-interviews/enrollment/${enrollmentId}/answer`, formData);
  },
  completeAiInterview: (enrollmentId) =>
    apiRequest(`/ai-mock-interviews/enrollment/${enrollmentId}/complete`, { method: 'POST' }),
  logAiInterviewViolation: (enrollmentId, data) =>
    apiRequest(`/ai-mock-interviews/enrollment/${enrollmentId}/violation`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadAiInterviewScreenshot: (enrollmentId, blob, meta = {}) => {
    const formData = new FormData();
    const file =
      blob instanceof File
        ? blob
        : new File([blob], `shot-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    formData.append('screenshot', file);
    if (meta.captureType) formData.append('captureType', meta.captureType);
    if (meta.event) formData.append('event', meta.event);
    if (meta.riskFlag != null) formData.append('riskFlag', meta.riskFlag ? 'true' : 'false');
    if (meta.faceCount != null) formData.append('faceCount', String(meta.faceCount));
    return uploadAiInterviewMultipart(`/ai-mock-interviews/enrollment/${enrollmentId}/screenshot`, formData);
  },

  // Conversational AI Interviews (dynamic follow-up)
  createConversationalInterview: (data) =>
    apiRequest('/ai-conversational-interviews', { method: 'POST', body: JSON.stringify(data) }),
  getConversationalInterviews: () => apiRequest('/ai-conversational-interviews', { noCache: true }),
  deleteConversationalInterview: (id) =>
    apiRequest(`/ai-conversational-interviews/${id}`, { method: 'DELETE' }),
  getStudentConversationalInterviews: () =>
    apiRequest('/ai-conversational-interviews/student/my-interviews'),
  getStudentConversationalSession: (interviewId) =>
    apiRequest(`/ai-conversational-interviews/student/session/${interviewId}`),
  startConversationalSession: (enrollmentId) =>
    apiRequest(`/ai-conversational-interviews/enrollment/${enrollmentId}/start`, { method: 'POST' }),
  submitConversationalAnswer: (enrollmentId, blob, { questionId, durationSeconds }) => {
    const formData = new FormData();
    const mime = blob.type || 'video/webm';
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const file =
      blob instanceof File
        ? blob
        : new File([blob], `answer-${Date.now()}.${ext}`, { type: mime });
    formData.append('recording', file);
    formData.append('questionId', questionId);
    if (durationSeconds != null) formData.append('durationSeconds', String(durationSeconds));
    return uploadAiInterviewMultipart(
      `/ai-conversational-interviews/enrollment/${enrollmentId}/answer`,
      formData
    );
  },
  completeConversationalInterview: (enrollmentId) =>
    apiRequest(`/ai-conversational-interviews/enrollment/${enrollmentId}/complete`, {
      method: 'POST',
    }),
  logConversationalViolation: (enrollmentId, data) =>
    apiRequest(`/ai-conversational-interviews/enrollment/${enrollmentId}/violation`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadConversationalScreenshot: (enrollmentId, blob, meta = {}) => {
    const formData = new FormData();
    const file =
      blob instanceof File
        ? blob
        : new File([blob], `shot-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    formData.append('screenshot', file);
    if (meta.captureType) formData.append('captureType', meta.captureType);
    if (meta.event) formData.append('event', meta.event);
    if (meta.riskFlag != null) formData.append('riskFlag', meta.riskFlag ? 'true' : 'false');
    if (meta.faceCount != null) formData.append('faceCount', String(meta.faceCount));
    return uploadAiInterviewMultipart(
      `/ai-conversational-interviews/enrollment/${enrollmentId}/screenshot`,
      formData
    );
  },

  // Generic HTTP methods for calendar and other services
  get: (endpoint, config = {}) => {
    const { silent, showSuccess, params, ...restConfig } = config;
    const query = toQueryString(params);
    const url = query ? `${endpoint}?${query}` : endpoint;
    return apiRequest(url, { silent, showSuccess, ...restConfig }).then(data => ({ data }));
  },
  post: (endpoint, data, config = {}) => {
    const { silent, showSuccess, ...restConfig } = config;
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      silent,
      showSuccess,
      ...restConfig,
    }).then(response => ({ data: response })).catch(error => {
      // Re-throw to preserve error structure
      throw error;
    });
  },
  put: (endpoint, data, config = {}) => {
    const { silent, showSuccess, ...restConfig } = config;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      silent,
      showSuccess,
      ...restConfig,
    }).then(response => ({ data: response }));
  },
  delete: (endpoint, config = {}) => {
    const { silent, showSuccess, ...restConfig } = config;
    return apiRequest(endpoint, {
      method: 'DELETE',
      silent,
      showSuccess,
      ...restConfig,
    }).then(response => ({ data: response }));
  },
  patch: (endpoint, data, config = {}) => {
    const { silent, showSuccess, ...restConfig } = config;
    return apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      silent,
      showSuccess,
      ...restConfig,
    }).then(response => ({ data: response }));
  },
};

export default api;
