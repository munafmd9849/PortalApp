/**
 * API Service Layer
 * Replaces Firebase SDK calls with HTTP requests
 * Centralized API client for all backend requests
 */

import { API_BASE_URL, getBackendPort } from '../config/api.js';

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
 */
async function refreshAccessToken() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    setAuthTokens(data.accessToken, refreshToken);
    return data.accessToken;
  } catch (error) {
    clearAuthTokens();
    window.location.href = '/';
    throw error;
  }
}

/**
 * API request wrapper with auth and error handling
 */
async function apiRequest(endpoint, options = {}) {
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
        ...options,
        headers,
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
      
      // Provide helpful error message
      let errorMessage = 'Failed to connect to server. ';
      if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
        errorMessage += 'Request timed out. The server may be slow or unresponsive.';
      } else if (fetchError.message.includes('CORS') || fetchError.message.includes('cors')) {
        errorMessage += 'CORS error. Check if the backend server is running and CORS is configured correctly.';
      } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
        const port = getBackendPort();
        errorMessage += `Cannot reach the server. Please check:\n1. Backend server is running on http://localhost:${port}\n2. No firewall blocking the connection\n3. Backend server is accessible`;
      } else {
        errorMessage += fetchError.message || 'Unknown network error.';
      }
      
      const error = new Error(errorMessage);
      error.isNetworkError = true;
      error.originalError = fetchError;
      error.endpoint = endpoint;
      error.url = url;
      throw error;
    }

    // Handle 401 - try refresh token
    if (response.status === 401 && token) {
      try {
        const newToken = await refreshAccessToken();
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
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
      
      const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      error.response = {
        data: errorData,
        status: response.status,
        statusText: response.statusText,
      };
      error.status = response.status;
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
        resolve(JSON.parse(xhr.responseText));
      } else {
        // Try to parse error response body
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
  getAllStudents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
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
  setDefaultResume: (resumeId) => apiRequest(`/students/resume/${resumeId}/default`, {
    method: 'PATCH',
  }),
  deleteResume: (resumeId) => apiRequest(`/students/resume/${resumeId}`, {
    method: 'DELETE',
  }),

  // Jobs
  getTargetedJobs: () => apiRequest('/jobs/targeted'),
  getJobs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
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
  approveJob: (jobId) => apiRequest(`/jobs/${jobId}/approve`, {
    method: 'POST',
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
    const query = new URLSearchParams(filters).toString();
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
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/notifications?${query}`);
  },
  markNotificationRead: (notificationId) => apiRequest(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  }),
  markAllNotificationsRead: () => apiRequest('/notifications/mark-all-read', {
    method: 'PATCH',
  }),

  // Queries
  submitStudentQuery: (data) => apiRequest('/queries', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
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
  getEndorsementByToken: (token) => apiRequest(`/endorsements/${token}`),
  submitEndorsement: (token, data) => apiRequest(`/endorsements/submit/${token}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Admin Requests
  createAdminRequest: (data) => apiRequest('/admin-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getPendingAdminRequests: () => apiRequest('/admin-requests/pending'),
  getAllAdminRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin-requests${query ? `?${query}` : ''}`);
  },
  approveAdminRequest: (requestId) => apiRequest(`/admin-requests/${requestId}/approve`, {
    method: 'PATCH',
  }),
  rejectAdminRequest: (requestId, data) => apiRequest(`/admin-requests/${requestId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  searchWeb: (query) => {
    const params = new URLSearchParams({ query });
    return apiRequest(`/search?${params.toString()}`);
  },

  summarizeSearchResults: (results) => apiRequest('/search/summarize', {
    method: 'POST',
    body: JSON.stringify({ results }),
  }),

  // Recruiters (Admin)
  getRecruiterDirectory: () => apiRequest('/recruiters/directory'),
  getRecruiterJobs: (email) => apiRequest(`/recruiters/${encodeURIComponent(email)}/jobs`),
  blockUnblockRecruiter: (recruiterId, data) => apiRequest(`/recruiters/${recruiterId}/block`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Utility
  uploadFile,
  getAuthToken,
  setAuthTokens,
  clearAuthTokens,

  // Generic HTTP methods for calendar and other services
  get: (endpoint, config = {}) => {
    const query = config.params ? new URLSearchParams(config.params).toString() : '';
    const url = query ? `${endpoint}?${query}` : endpoint;
    return apiRequest(url).then(data => ({ data }));
  },
  post: (endpoint, data, config = {}) => {
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    }).then(response => ({ data: response })).catch(error => {
      // Re-throw to preserve error structure
      throw error;
    });
  },
  put: (endpoint, data, config = {}) => {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...config,
    }).then(response => ({ data: response }));
  },
  delete: (endpoint, config = {}) => {
    return apiRequest(endpoint, {
      method: 'DELETE',
      ...config,
    }).then(response => ({ data: response }));
  },
  patch: (endpoint, data, config = {}) => {
    return apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...config,
    }).then(response => ({ data: response }));
  },
};

export default api;
