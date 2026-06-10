/**
 * Recruiters Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

const DIRECTORY_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function getRoleFromAccessToken() {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    const payload = JSON.parse(atob(base64));
    return payload.role ? String(payload.role).toUpperCase() : null;
  } catch {
    return null;
  }
}

function canAccessRecruiterDirectory(options = {}) {
  if (options.enabled === false) return false;
  if (typeof options.canAccess === 'function') return options.canAccess();
  const role = options.role ? String(options.role).toUpperCase() : getRoleFromAccessToken();
  return DIRECTORY_ROLES.has(role);
}

export function subscribeRecruiterDirectory(onChange, options = {}) {
  let active = true;
  let intervalId = null;
  let socket = null;

  const loadRecruiters = async () => {
    if (!active) return false;

    if (!canAccessRecruiterDirectory(options)) {
      onChange([]);
      return false;
    }

    try {
      const data = await api.getRecruiterDirectory();
      if (!active) return false;
      onChange(Array.isArray(data) ? data : []);
      return true;
    } catch (error) {
      if (!active) return false;
      if (error?.status !== 403 && error?.message !== 'Forbidden') {
        console.warn('Recruiter directory fetch failed:', error);
      }
      onChange([]);
      return false;
    }
  };

  const bindSocket = async () => {
    if (!active || !canAccessRecruiterDirectory(options)) return;

    try {
      const { initSocket } = await import('./socket.js');
      if (!active) return;
      socket = initSocket();

      const refresh = () => {
        if (active) loadRecruiters();
      };

      socket.on('recruiter:new', refresh);
      socket.on('recruiter:updated', refresh);
    } catch {
      // Polling fallback only
    }
  };

  loadRecruiters().then(() => {
    if (!active) return;
    bindSocket();
    intervalId = setInterval(() => {
      if (active) loadRecruiters();
    }, 30000);
  });

  return () => {
    active = false;
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
      startDate: blockData?.startDate,
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
    const jobs = await api.getRecruiterJobs(recruiterEmail);
    return jobs;
  } catch (error) {
    console.error('getRecruiterJobs error:', error);
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

export async function blockRecruiter(recruiterId, reason) {
  console.warn('blockRecruiter: Placeholder - use blockUnblockRecruiter instead');
  return blockUnblockRecruiter(recruiterId, { recruiter: { id: recruiterId }, isUnblocking: false, reason });
}
