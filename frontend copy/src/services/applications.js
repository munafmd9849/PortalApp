/**
 * Applications Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * Get student applications
 */
export const getStudentApplications = async (studentId) => {
  try {
    console.log('📋 [getStudentApplications] Calling API for studentId:', studentId);
    console.log('📋 [getStudentApplications] API endpoint:', '/applications/student');
    
    // Use real API to fetch applications
    let applications;
    try {
      applications = await api.getStudentApplications();
      console.log('📋 [getStudentApplications] ✅ API call successful');
    } catch (apiError) {
      console.error('❌ [getStudentApplications] API call failed:', apiError);
      throw apiError; // Re-throw to be caught by outer catch
    }
    
    console.log('📋 [getStudentApplications] Raw API response:', {
      type: typeof applications,
      isArray: Array.isArray(applications),
      length: applications?.length,
      isNull: applications === null,
      isUndefined: applications === undefined,
      data: applications
    });
    
    // If API returns data, format it for frontend components
    if (applications && Array.isArray(applications) && applications.length > 0) {
      console.log('📋 [getStudentApplications] Processing', applications.length, 'applications');
      // Ensure data structure matches what components expect
      const formattedApplications = applications.map(app => {
        // Parse dates - backend returns ISO strings from Prisma DateTime
        const parseDate = (dateValue) => {
          if (!dateValue) return null;
          // If already a string (ISO format from backend), return as-is
          if (typeof dateValue === 'string') return dateValue;
          // Handle Firebase Timestamp (legacy)
          if (dateValue.toDate) return dateValue.toDate().toISOString();
          // Handle Date objects
          if (dateValue instanceof Date) return dateValue.toISOString();
          // Try to parse as date
          try {
            return new Date(dateValue).toISOString();
          } catch {
            return null;
          }
        };

        // Parse requiredSkills if it's a JSON string
        const parseSkills = (skills) => {
          if (!skills) return [];
          if (Array.isArray(skills)) return skills;
          if (typeof skills === 'string') {
            try {
              const parsed = JSON.parse(skills);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              // If not valid JSON, try splitting by comma
              return skills.split(',').map(s => s.trim()).filter(s => s);
            }
          }
          return [];
        };

        const formatted = {
          ...app,
          appliedDate: parseDate(app.appliedDate) || app.appliedDate,
          interviewDate: parseDate(app.interviewDate) || app.interviewDate || null,
          company: app.company || app.job?.company || null,
          // Ensure job object exists with jobTitle and parsed requiredSkills
          job: {
            ...app.job,
            jobTitle: app.job?.jobTitle || app.job?.title || '',
            id: app.job?.id || app.jobId,
            requiredSkills: parseSkills(app.job?.requiredSkills),
          },
        };
        
        console.log('📋 [getStudentApplications] Formatted application:', {
          id: formatted.id,
          jobId: formatted.jobId,
          jobTitle: formatted.job?.jobTitle,
          hasJob: !!formatted.job,
          hasCompany: !!formatted.company
        });
        
        return formatted;
      });
      
      console.log('✅ [getStudentApplications] Returning', formattedApplications.length, 'formatted applications');
      return formattedApplications;
    }
    
    // Return empty array if no applications
    console.warn('⚠️ [getStudentApplications] No applications found or empty response. Response was:', {
      applications,
      type: typeof applications,
      isArray: Array.isArray(applications),
      length: applications?.length,
      isNull: applications === null,
      isUndefined: applications === undefined,
      stringified: JSON.stringify(applications).substring(0, 200)
    });
    return [];
  } catch (error) {
    console.error('❌ [getStudentApplications] Error:', error);
    console.error('❌ [getStudentApplications] Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response,
      data: error.response?.data
    });
    // Return empty array on error
    return [];
  }
};

/**
 * Apply to job
 */
export const applyToJob = async (studentId, jobId, applicationData = {}) => {
  try {
    console.log('📝 [applyToJob] Calling API with:', { jobId, applicationData });
    // Include resumeId and companyId in the request body
    const response = await api.applyToJob(jobId, applicationData);
    // API returns the application directly (not wrapped)
    console.log('✅ [applyToJob] Application created:', response);
    return response;
  } catch (error) {
    // Don't log "Already applied" errors - they're handled gracefully
    const errorData = error.response?.data || {};
    if (errorData.error !== 'Already applied to this job') {
      console.error('❌ [applyToJob] Error:', error);
    }
    throw error;
  }
};

/**
 * Update application status (admin/recruiter only)
 */
export const updateApplicationStatus = async (applicationId, status, interviewDate) => {
  try {
    const application = await api.updateApplicationStatus(applicationId, status, interviewDate);
    return application;
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    throw error;
  }
};

/**
 * Get single application by ID
 */
export const getApplication = async (applicationId) => {
  try {
    // TODO: Backend needs GET /api/applications/:applicationId endpoint
    console.warn('getApplication: Backend endpoint needed');
    return null;
  } catch (error) {
    console.error('getApplication error:', error);
    throw error;
  }
};

/**
 * Subscribe to student applications (replaced with load-once pattern)
 * For real-time updates, use Socket.IO instead
 * This function now returns an empty unsubscribe for backward compatibility
 */
export const subscribeStudentApplications = (studentId, callback) => {
  // Load applications once instead of real-time subscription
  (async () => {
    try {
      const applications = await getStudentApplications(studentId);
      callback(applications);
    } catch (error) {
      console.error('subscribeStudentApplications error:', error);
      callback([]);
    }
  })();
  
  // Return empty unsubscribe function for backward compatibility
  return () => {};
};

/**
 * Subscribe to applications (alias)
 */
export const subscribeToApplications = subscribeStudentApplications;

/**
 * Get student interview history with rounds and evaluation details
 */
export const getStudentInterviewHistory = async (studentId) => {
  try {
    const history = await api.getStudentInterviewHistory();
    return history || [];
  } catch (error) {
    console.error('getStudentInterviewHistory error:', error);
    return [];
  }
};
