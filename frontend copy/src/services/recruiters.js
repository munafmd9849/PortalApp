/**
 * Recruiters Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

export function subscribeRecruiterDirectory(onChange, options = {}) {
  let intervalId = null;
  let socket = null;
  
  const loadRecruiters = async () => {
    try {
      const data = await api.getRecruiterDirectory();
      onChange(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      console.warn('Recruiter directory fetch failed:', error);
      onChange([]);
      return false;
    }
  };
  
  // Try to set up Socket.IO subscription
  try {
    // Dynamic import to avoid circular dependencies
    import('./socket.js').then((socketModule) => {
      const { initSocket } = socketModule;
      socket = initSocket();
      
      // Listen for new recruiter events
      socket.on('recruiter:new', (newRecruiter) => {
        console.log('📢 New recruiter registered:', newRecruiter);
        // Reload the directory to get updated list
        loadRecruiters();
      });
      
      // Listen for recruiter updates
      socket.on('recruiter:updated', () => {
        console.log('📢 Recruiter updated');
        loadRecruiters();
      });
    }).catch((error) => {
      console.warn('Socket.IO not available, using polling:', error);
    });
  } catch (error) {
    console.warn('Socket.IO not available, using polling:', error);
  }
  
  // Initial load
  (async () => {
    await loadRecruiters();
    
    // Set up polling as fallback (every 30 seconds)
    // This ensures updates even if Socket.IO fails
    intervalId = setInterval(() => {
      loadRecruiters();
    }, 30000);
  })();
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (socket) {
      socket.off('recruiter:new');
      socket.off('recruiter:updated');
    }
  };
}

export async function getRecruiter(recruiterId) {
  try {
    throw new Error('Recruiter detail endpoint not available.');
  } catch (error) {
    console.error('getRecruiter error:', error);
    throw error;
  }
}

export async function updateRecruiterStatus(recruiterId, status) {
  try {
    throw new Error('Recruiter status endpoint not available.');
  } catch (error) {
    console.error('updateRecruiterStatus error:', error);
    throw error;
  }
}

/**
 * Block or unblock a recruiter (admin only)
 */
export async function blockUnblockRecruiter(recruiterId, blockData, user = null) {
  try {
    const payload = {
      isUnblocking: !!blockData?.isUnblocking,
      blockType: blockData?.blockType,
      endDate: blockData?.endDate,
      endTime: blockData?.endTime,
      reason: blockData?.reason,
      notes: blockData?.notes,
    };

    return await api.blockUnblockRecruiter(recruiterId, payload);
  } catch (error) {
    console.error('blockUnblockRecruiter error:', error);
    throw error;
  }
}

/**
 * Get jobs posted by a recruiter
 */
export async function getRecruiterJobs(recruiterEmail) {
  try {
    // Call the real API endpoint
    const jobs = await api.getRecruiterJobs(recruiterEmail);
    return jobs;
  } catch (error) {
    console.error('getRecruiterJobs error:', error);
    // Return empty array on error instead of throwing
    return [];
  }
}

/**
 * Get recruiter history (audit log of actions)
 */
export async function getRecruiterHistory(recruiterId) {
  try {
    throw new Error('Recruiter history endpoint not available.');
  } catch (error) {
    console.error('getRecruiterHistory error:', error);
    throw error;
  }
}

/**
 * Send email to recruiter
 */
export async function sendEmailToRecruiter(recruiterId, emailData, user = null) {
  try {
    throw new Error('Send email endpoint not available.');
  } catch (error) {
    console.error('sendEmailToRecruiter error:', error);
    throw error;
  }
}

/**
 * Get recruiter summary (stats, job count, etc.)
 */
export async function getRecruiterSummary(recruiterId) {
  try {
    throw new Error('Recruiter summary endpoint not available.');
  } catch (error) {
    console.error('getRecruiterSummary error:', error);
    throw error;
  }
}

// Export all other functions as placeholders
export async function blockRecruiter(recruiterId, reason) {
  console.warn('blockRecruiter: Placeholder - use blockUnblockRecruiter instead');
  return blockUnblockRecruiter(recruiterId, { recruiter: { id: recruiterId }, isUnblocking: false, reason });
}
