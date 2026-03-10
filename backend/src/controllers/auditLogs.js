/**
 * Audit Log Controller
 * Handles fetching audit logs for Super Admin.
 */

import prisma from '../config/database.js';
import { sendServerError } from '../utils/response.js';

/**
 * Get audit logs with filters and pagination.
 * GET /api/admin/audit-logs
 */
export async function getAuditLogs(req, res) {
    try {
        const {
            page = 1,
            limit = 50,
            role,
            actionType,
            search,
            startDate,
            endDate,
            sortBy = 'timestamp',
            order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build filter conditions
        const where = {};

        if (role) {
            where.actorRole = role;
        }

        if (actionType) {
            where.actionType = actionType;
        }

        if (search) {
            where.OR = [
                { actorName: { contains: search, mode: 'insensitive' } },
                { details: { contains: search, mode: 'insensitive' } },
                { targetType: { contains: search, mode: 'insensitive' } },
                { targetId: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = new Date(startDate);
            }
            if (endDate) {
                // Set end date to end of day
                const endDay = new Date(endDate);
                endDay.setHours(23, 59, 59, 999);
                where.timestamp.lte = endDay;
            }
        }

        // Fetch logs and total count
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: {
                    [sortBy]: order,
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        // Get unique action types for filter dropdown
        const actionTypes = await prisma.auditLog.groupBy({
            by: ['actionType'],
        });

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / take),
            },
            filters: {
                actionTypes: actionTypes.map(a => a.actionType),
            }
        });
    } catch (error) {
        console.error('Get Audit Logs Error:', error);
        sendServerError(res, error, 'Failed to fetch audit logs');
    }
}
