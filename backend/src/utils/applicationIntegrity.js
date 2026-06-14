/**
 * Application Integrity Utilities
 * Ensures consistent state transitions and data protection
 */

export const APPLICATION_STATUS = {
  APPLIED: 'APPLIED',
  SHORTLISTED: 'SHORTLISTED',
  REJECTED: 'REJECTED',
  SELECTED: 'SELECTED',
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  WITHDRAWN: 'WITHDRAWN',
  REVOKED_BY_ADMIN: 'REVOKED_BY_ADMIN'
};

/**
 * Validates if an application can move from currentStatus to nextStatus
 * @param {string} currentStatus - Current status in DB
 * @param {string} nextStatus - Requested new status
 * @returns {boolean} - True if valid, throws error otherwise
 */
export function validateApplicationStateTransition(currentStatus, nextStatus) {
  // 1. Protection for REVOKED applications
  if (currentStatus === APPLICATION_STATUS.REVOKED_BY_ADMIN) {
    // ONLY allowed transition from REVOKED is RESTORE (which would set status back to previousStatus)
    // This helper is used for normal status updates. 
    // Restoration should be handled by its own dedicated controller.
    throw new Error('Applications revoked by admin cannot be updated. Restore them first.');
  }

  if (currentStatus === APPLICATION_STATUS.WITHDRAWN) {
    throw new Error('Withdrawn applications cannot be updated through this endpoint.');
  }

  // 2. Prevent updating already final states (optional, but good for hardening)
  // If we want to allow admins to fix mistakes, we don't strictly block SELECTED -> REJECTED
  
  return true;
}
