/**
 * Case-insensitive admin role check for cross-user student data access.
 */
export function isAdminViewer(user) {
  const role = String(user?.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}
