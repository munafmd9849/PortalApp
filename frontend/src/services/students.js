/**
 * Student Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * Get student profile (includes skills, education, projects, achievements)
 */
export const getStudentProfile = async (studentId) => {
  try {
    const profile = await api.getStudentProfile(studentId);
    return profile;
  } catch (error) {
    console.error('getStudentProfile error:', error);
    throw error;
  }
};

/**
 * Update student profile
 */
export const updateStudentProfile = async (studentId, data) => {
  try {
    const updated = await api.updateStudentProfile(data);
    return updated;
  } catch (error) {
    console.error('updateStudentProfile error:', error);
    throw error;
  }
};

/**
 * Create complete student profile (for new students)
 */
export const createCompleteStudentProfile = async (studentId, profileData, skills = []) => {
  try {
    // First create student record via registration, then update with full profile
    const updated = await api.updateStudentProfile(profileData);
    return updated;
  } catch (error) {
    console.error('createCompleteStudentProfile error:', error);
    throw error;
  }
};

/**
 * Update complete student profile
 */
export const updateCompleteStudentProfile = async (studentId, profileData, skills = []) => {
  try {
    const updated = await api.updateStudentProfile(profileData);
    return updated;
  } catch (error) {
    console.error('updateCompleteStudentProfile error:', error);
    throw error;
  }
};

/**
 * Get student skills
 */
export const getStudentSkills = async (studentId) => {
  try {
    const skills = await api.getStudentSkills(studentId);
    return skills;
  } catch (error) {
    console.error('getStudentSkills error:', error);
    throw error;
  }
};

/**
 * Get educational background
 */
export const getEducationalBackground = async (studentId) => {
  try {
    const profile = await api.getStudentProfile(studentId);
    return profile?.education || [];
  } catch (error) {
    console.error('getEducationalBackground error:', error);
    throw error;
  }
};

/**
 * Add or update skill
 */
export const addOrUpdateSkillArray = async (studentId, skill) => {
  try {
    const result = await api.addOrUpdateSkill(skill);
    return result;
  } catch (error) {
    console.error('addOrUpdateSkillArray error:', error);
    throw error;
  }
};

/**
 * Delete skill
 */
export const deleteSkillArray = async (studentId, skillId) => {
  try {
    await api.deleteSkill(skillId);
    return { success: true };
  } catch (error) {
    console.error('deleteSkillArray error:', error);
    throw error;
  }
};

/**
 * Add education entry
 */
export const addEducationArray = async (studentId, education) => {
  try {
    const result = await api.addEducation(education);
    return result;
  } catch (error) {
    console.error('addEducationArray error:', error);
    throw error;
  }
};

/**
 * Update education entry
 */
export const updateEducationArray = async (studentId, educationId, education) => {
  try {
    const result = await api.updateEducation(educationId, education);
    return result;
  } catch (error) {
    console.error('updateEducationArray error:', error);
    throw error;
  }
};

/**
 * Update educational background (alias for updateEducationArray)
 * Used by admin components
 */
export const updateEducationalBackground = async (educationId, education) => {
  try {
    const result = await api.updateEducation(educationId, education);
    return result;
  } catch (error) {
    console.error('updateEducationalBackground error:', error);
    throw error;
  }
};

/**
 * Delete education entry
 */
export const deleteEducationArray = async (studentId, educationId) => {
  try {
    await api.deleteEducation(educationId);
    return { success: true };
  } catch (error) {
    console.error('deleteEducationArray error:', error);
    throw error;
  }
};

/**
 * Add project
 */
export const addProjectArray = async (studentId, project) => {
  try {
    const result = await api.addProject(project);
    return result;
  } catch (error) {
    console.error('addProjectArray error:', error);
    throw error;
  }
};

/**
 * Update project
 */
export const updateProjectArray = async (studentId, projectId, project) => {
  try {
    const result = await api.updateProject(projectId, project);
    return result;
  } catch (error) {
    console.error('updateProjectArray error:', error);
    throw error;
  }
};

/**
 * Delete project
 */
export const deleteProjectArray = async (studentId, projectId) => {
  try {
    await api.deleteProject(projectId);
    return { success: true };
  } catch (error) {
    console.error('deleteProjectArray error:', error);
    throw error;
  }
};

/**
 * Generate AI project content (for Resume System)
 */
export const generateProjectContent = async (data) => {
  try {
    const result = await api.generateProjectContent(data);
    return result;
  } catch (error) {
    console.error('generateProjectContent error:', error);
    throw error;
  }
};

/**
 * Add achievement
 */
export const addAchievementArray = async (studentId, achievement) => {
  try {
    const result = await api.addAchievement(achievement);
    return result;
  } catch (error) {
    console.error('addAchievementArray error:', error);
    throw error;
  }
};

/**
 * Update achievement
 */
export const updateAchievementArray = async (studentId, achievementId, achievement) => {
  try {
    const result = await api.updateAchievement(achievementId, achievement);
    return result;
  } catch (error) {
    console.error('updateAchievementArray error:', error);
    throw error;
  }
};

/**
 * Delete achievement
 */
export const deleteAchievementArray = async (studentId, achievementId) => {
  try {
    await api.deleteAchievement(achievementId);
    return { success: true };
  } catch (error) {
    console.error('deleteAchievementArray error:', error);
    throw error;
  }
};

/**
 * Get all students (admin only)
 * With comprehensive error handling to prevent component crashes
 * 
 * @param {Object} filters - Query filters (school, center, batch, status, page, limit)
 * @param {Object} options - Additional options (retries, retryDelay)
 * @returns {Promise<Array|Object>} - Returns array of students or error object
 */
export const getAllStudents = async (filters = {}, options = {}) => {
  const { retries = 2, retryDelay = 1000 } = options;

  try {
    const response = await api.getAllStudents(filters);

    // Validate response structure
    if (!response) {
      throw new Error('Empty response from server');
    }

    // Backend returns { students, pagination }
    const students = response.students || response || [];
    const pagination = response.pagination;

    // Ensure it's an array
    if (!Array.isArray(students)) {
      console.warn('getAllStudents: Invalid response format, expected array:', response);
      return { students: [], total: 0 };
    }

    // If pagination exists and we haven't fetched all students, fetch remaining pages
    if (pagination && pagination.totalPages > 1) {
      const totalNeeded = pagination.totalPages;
      const requestedLimit = parseInt(filters.limit) || 50;
      const limitToUse = Math.min(requestedLimit, 1000); // Use requested limit or max 1000

      const allStudents = [...students];

      // Fetch remaining pages (starting from page 2) if needed
      for (let page = 2; page <= totalNeeded; page++) {
        try {
          const pageResponse = await api.getAllStudents({ ...filters, page, limit: limitToUse });
          const pageStudents = pageResponse.students || pageResponse || [];
          if (Array.isArray(pageStudents)) {
            allStudents.push(...pageStudents);
          }
          // Break if we've fetched all students
          if (allStudents.length >= pagination.total) {
            break;
          }
        } catch (pageError) {
          console.warn(`Failed to fetch page ${page}:`, pageError);
          // Continue with what we have
          break;
        }
      }

      // Always return array for consistency
      return allStudents;
    }

    // Return students array (backwards compatibility)
    return students;
  } catch (error) {
    // Handle specific error types
    const errorStatus = error?.status || error?.response?.status;
    const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load students';
    const errorDetails = {
      message: errorMessage,
      status: errorStatus,
      endpoint: '/api/students',
      timestamp: new Date().toISOString(),
    };

    console.error('getAllStudents error:', errorDetails);

    // Retry logic for transient errors (500, 502, 503, 504)
    if (retries > 0 && errorStatus >= 500 && errorStatus < 600) {
      console.log(`Retrying getAllStudents... (${retries} retries remaining)`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return getAllStudents(filters, { retries: retries - 1, retryDelay: retryDelay * 2 });
    }

    // For authentication/authorization errors, throw to be handled by auth system
    if (errorStatus === 401 || errorStatus === 403) {
      throw error;
    }

    // For other errors (500, network, etc.), return safe error object
    // This prevents component crashes while still allowing error handling
    return {
      error: true,
      message: errorMessage,
      status: errorStatus || 500,
      data: [], // Empty array as fallback
      timestamp: errorDetails.timestamp,
    };
  }
};

/**
 * Update student status (admin only - block/unblock, activate/deactivate)
 * Prefer blockUnblockStudent for block/unblock; this remains for compatibility.
 */
export const updateStudentStatus = async (studentId, newStatus, statusData = {}) => {
  try {
    const isUnblocking = newStatus === 'Active' || newStatus === 'ACTIVE';
    const payload = {
      isUnblocking,
      blockType: (statusData.blockType || 'Permanent').toString().toLowerCase().startsWith('temp') ? 'temporary' : 'permanent',
      endDate: statusData.endDate || null,
      endTime: statusData.endTime || null,
      reason: statusData.reason || '',
      notes: statusData.notes || '',
    };
    const result = await api.blockUnblockStudent(studentId, payload);
    return { success: true, ...result };
  } catch (error) {
    console.error('updateStudentStatus error:', error);
    throw error;
  }
};

/**
 * Block or unblock a student (admin / super admin only)
 */
export const blockUnblockStudent = async (studentId, payload) => {
  const res = await api.blockUnblockStudent(studentId, payload);
  return res;
};
