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
    // Clear tokens and redirect on refresh failure
    clearAuthTokens();
    window.location.href = '/';
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
  const { silent = false, showSuccess = false, ...fetchOptions } = options;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`API Request: ${options.method || 'GET'} ${url}`);
  
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
    
    // CRITICAL: Log profile API responses for debugging
    if (endpoint.includes('/students/profile')) {
      console.log('📥 [API] Profile response received:', {
        endpoint,
        hasProjects: Array.isArray(data?.projects),
        projectsCount: data?.projects?.length || 0,
        hasAchievements: Array.isArray(data?.achievements),
        achievementsCount: data?.achievements?.length || 0,
        hasCertifications: Array.isArray(data?.certifications),
        certificationsCount: data?.certifications?.length || 0,
        fullResponse: data,
      });
    }
    
    // CRITICAL: Log applications API responses for debugging
    if (endpoint.includes('/applications/student')) {
      console.log('📥 [API] Applications response received:', {
        endpoint,
        isArray: Array.isArray(data),
        length: data?.length || 0,
        type: typeof data,
        firstItem: data?.[0] || null,
        fullResponse: data,
      });
    }

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
  getStudentProfile: () => apiRequest('/students/profile'),
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
  getStudentSkills: () => apiRequest('/students/skills'),
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
          resolve(JSON.parse(xhr.responseText));
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
  getResumes: () => apiRequest('/students/resumes'),
  getResume: (resumeId) => apiRequest(`/students/resume/${resumeId}`),
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
  generateResumePDF: (data) => apiRequest('/students/generate-resume-pdf', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Jobs
  getTargetedJobs: () => apiRequest('/jobs/targeted'),
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
  autoArchiveExpiredJobs: () => apiRequest('/jobs/auto-archive-expired', {
    method: 'POST',
  }),

  // Applications
  getAllApplications: (filters = {}) => {
    const query = toQueryString(filters);
    return apiRequest(`/applications${query ? `?${query}` : ''}`);
  },
  getStudentApplications: () => apiRequest('/applications/student'),
  
  getStudentInterviewHistory: () => apiRequest('/applications/student/interview-history'),
  applyToJob: (jobId, applicationData = {}) => apiRequest(`/applications/jobs/${jobId}`, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  }),
  updateApplicationStatus: (applicationId, status, interviewDate) => apiRequest(`/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, interviewDate }),
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
  
  // Interviewer endpoints (token-based, no auth required)
  getInterviewSessionByToken: (sessionId, token) => apiRequest(`/interview/session/${sessionId}?token=${encodeURIComponent(token)}`, { silent: true }),
  getActiveRound: (sessionId, token) => apiRequest(`/interview/session/${sessionId}/active-round?token=${encodeURIComponent(token)}`, { silent: true }),
  getRoundCandidates: (roundId, token) => apiRequest(`/interview/round/${roundId}/candidates?token=${encodeURIComponent(token)}`, { silent: true }),
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
  disableSuperAdminAdmin: (userId) => apiRequest(`/super-admin/admins/${userId}/disable`, { method: 'PATCH' }),
  enableSuperAdminAdmin: (userId) => apiRequest(`/super-admin/admins/${userId}/enable`, { method: 'PATCH' }),
  getSuperAdminStats: () => apiRequest('/super-admin/stats'),
  freezeInterviewSession: (sessionId) => apiRequest(`/admin/interview-scheduling/session/${sessionId}/freeze`, { method: 'PATCH' }),
  unfreezeInterviewSession: (sessionId) => apiRequest(`/admin/interview-scheduling/session/${sessionId}/unfreeze`, { method: 'PATCH' }),

  // Utility
  uploadFile,
  getAuthToken,
  setAuthTokens,
  clearAuthTokens,

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
