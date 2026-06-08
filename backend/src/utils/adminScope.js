/**
 * Admin Scope Utility
 * Generates Prisma 'where' clauses based on Admin/Coordinator scopes
 */

/**
 * Build a scoping filter for Prisma queries
 * @param {Object} admin - The admin object from req.user.admin
 * @param {string} userRole - The role from req.user.role
 * @returns {Object} - Prisma where clause fragment
 */
export function getAdminScopeFilter(admin, userRole) {
  // Super Admins have global access
  if (userRole === 'SUPER_ADMIN') {
    return {};
  }

  if (!admin) {
    return { id: 'BLOCK_ALL' }; // Safety: if role is ADMIN but no admin profile, block data
  }

  const filter = {};

  // Parse JSON strings from DB
  const schools = safeParse(admin.allowedSchools);
  const centers = safeParse(admin.allowedCenters);
  const batches = safeParse(admin.allowedBatches);

  // Apply school scope if not wildcard
  if (schools.length > 0 && !schools.includes('*')) {
    filter.school = { in: schools };
  }

  // Apply center scope if not wildcard
  if (centers.length > 0 && !centers.includes('*')) {
    filter.center = { in: centers };
  }

  // Apply batch scope if not wildcard
  if (batches.length > 0 && !batches.includes('*')) {
    filter.batch = { in: batches };
  }

  return filter;
}

/**
 * Check if an admin has a specific permission
 * @param {Object} admin - The admin object
 * @param {string} userRole - The user role
 * @param {string} permission - The permission string to check
 */
export function hasPermission(admin, userRole, permission) {
  if (userRole === 'SUPER_ADMIN') return true;
  if (!admin) return false;

  const permissions = safeParse(admin.permissions);
  return permissions.includes(permission);
}

function safeParse(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
}
