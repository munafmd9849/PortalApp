/**
 * Audit Context Utility
 * Standardizes ownership and tracking fields for Prisma operations
 */

/**
 * Applies ownership tracking fields to a Prisma data object
 * @param {Object} data - Existing Prisma data object
 * @param {string} userId - ID of the user performing the action
 * @param {string} actionType - 'CREATE', 'UPDATE', 'APPROVE', 'POST', 'REJECT', 'ARCHIVE'
 * @returns {Object} - Updated data object
 */
export function applyAuditContext(data, userId, actionType) {
  const result = { ...data };

  if (actionType === 'CREATE') {
    // Prefer relations over scalar ids so we don't depend on the scalar
    // field name (some Prisma clients may not expose createdBy/updatedBy).
    result.creator = { connect: { id: userId } };
    result.updater = { connect: { id: userId } };
  } else if (actionType === 'UPDATE') {
    result.updater = { connect: { id: userId } };
  } else if (actionType === 'APPROVE') {
    result.approvedBy = userId;
    result.approvedAt = new Date();
    result.updater = { connect: { id: userId } };
  } else if (actionType === 'POST') {
    result.postedBy = userId;
    result.postedAt = new Date();
    result.updater = { connect: { id: userId } };
  } else if (actionType === 'REJECT') {
    result.rejectedBy = userId;
    result.rejectedAt = new Date();
    result.updater = { connect: { id: userId } };
  } else if (actionType === 'ARCHIVE') {
    result.archivedBy = userId;
    result.archivedAt = new Date();
    result.updater = { connect: { id: userId } };
  }

  return result;
}
