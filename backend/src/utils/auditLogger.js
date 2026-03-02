/**
 * Audit Logger Utility
 * Centralizes all audit logging across the application.
 */

import prisma from '../config/database.js';

/**
 * Log a significant action to the database.
 * 
 * @param {Object} req - Express request object (to extract user, IP, and user-agent)
 * @param {Object} options - Log details
 * @param {string} options.actionType - Type of action (e.g., "Login", "Create Job")
 * @param {string} options.targetType - Type of entity affected (e.g., "Auth", "Job", "Student")
 * @param {string} [options.targetId] - ID of the entity affected
 * @param {string} [options.details] - Additional description or context
 */
export async function logAction(req, { actionType, targetType, targetId, details }) {
    try {
        const user = req.user;
        const actorId = user?.id || null;
        const actorName = user?.displayName || user?.name || user?.email || 'System';
        const actorRole = user?.role || 'GUEST';

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        await prisma.auditLog.create({
            data: {
                actorName,
                actorRole,
                actorId,
                actionType,
                targetType,
                targetId,
                details,
                ipAddress: typeof ipAddress === 'string' ? ipAddress : JSON.stringify(ipAddress),
                userAgent,
            },
        });
    } catch (error) {
        // We don't want audit logging failures to break the main application flow,
        // but we should log the error for diagnostics.
        console.error('Audit Log Error:', error);
    }
}

/**
 * Log a system-voted action (no specific request context).
 */
export async function logSystemAction({ actionType, targetType, targetId, details }) {
    try {
        await prisma.auditLog.create({
            data: {
                actorName: 'System',
                actorRole: 'SYSTEM',
                actionType,
                targetType,
                targetId,
                details,
            },
        });
    } catch (error) {
        console.error('System Audit Log Error:', error);
    }
}
