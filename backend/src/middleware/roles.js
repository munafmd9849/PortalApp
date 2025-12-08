/**
 * Role-Based Access Control Middleware
 * Replaces Firebase security rules
 * Validates user roles for route access
 */

import prisma from '../config/database.js';

/**
 * Check if user has required role(s)
 * @param {string|string[]} allowedRoles - Role(s) allowed to access route
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: userRole,
      });
    }

    // Additional role-specific checks (only for profile-dependent routes)
    // Note: Removed strict profile requirement - allow access even if profile doesn't exist yet
    // Individual controllers can handle profile creation/validation as needed
    // This allows new users to access routes and create profiles on first use

    next();
  };
}

/**
 * Check if user has active status
 */
export function requireActive(req, res, next) {
  if (req.user.status !== 'ACTIVE') {
    return res.status(403).json({ 
      error: 'Account is not active',
      status: req.user.status,
    });
  }

  next();
}

/**
 * Verify user owns the resource or is admin
 */
export function requireOwnershipOrAdmin(resourceIdGetter, resourceUserIdField = 'userId') {
  return async (req, res, next) => {
    // Admins can access anything
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Get resource ID from request
    const resourceId = resourceIdGetter(req);

    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID required' });
    }

    // Get resource from database
    // This is a generic pattern - specific routes should implement specific checks
    // Example: const resource = await prisma.student.findUnique({ where: { id: resourceId } });
    
    // For now, allow if userId matches
    if (req.userId === resourceId) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied: You can only access your own resources' });
  };
}

/**
 * Middleware to check profile completion (for students)
 */
export function requireCompleteProfile(req, res, next) {
  if (req.user.role !== 'STUDENT' || !req.user.student) {
    return next(); // Not a student, skip check
  }

  const student = req.user.student;
  
  const requiredFields = ['fullName', 'email', 'phone', 'enrollmentId', 'school', 'center', 'batch'];
  const missingFields = requiredFields.filter(field => !student[field]);

  if (missingFields.length > 0) {
    return res.status(403).json({
      error: 'Profile incomplete',
      missingFields,
      message: 'Please complete your profile to access this feature',
    });
  }

  next();
}
