/**
 * Admin Requests Controller
 * Handles admin access requests and approvals
 */

import prisma from '../config/database.js';
import { createNotification } from './notifications.js';
import logger from '../config/logger.js';

/**
 * Create admin request
 * When a user requests admin access
 */
export async function createAdminRequest(req, res) {
  try {
    const userId = req.userId;
    const { reason } = req.body;

    // Check if user already has an active request
    const existingRequest = await prisma.adminRequest.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending admin request' });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create admin request
    const adminRequest = await prisma.adminRequest.create({
      data: {
        userId,
        email: user.email,
        reason: reason || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    // Notify all existing admins about the new request
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        const requesterName = user.displayName || user.email;
        
        await Promise.all(
          admins.map((admin) =>
            createNotification({
              userId: admin.id,
              title: `New Admin Access Request: ${requesterName}`,
              body: `${requesterName} (${user.email}) has requested admin access.${reason ? ` Reason: ${reason}` : ''}`,
              data: {
                type: 'admin_coordination',
                requestId: adminRequest.id,
                userId: userId,
                userEmail: user.email,
                userName: requesterName,
                reason: reason || null,
                requestedAt: adminRequest.requestedAt,
              },
            })
          )
        );
        logger.info(`Admin coordination notifications sent to ${admins.length} admins for request ${adminRequest.id}`);
      }
    } catch (notificationError) {
      // Don't fail request creation if notification fails
      logger.error(`Failed to send admin coordination notifications for request ${adminRequest.id}:`, notificationError);
    }

    res.status(201).json(adminRequest);
  } catch (error) {
    console.error('Create admin request error:', error);
    res.status(500).json({ error: 'Failed to create admin request' });
  }
}

/**
 * Get pending admin requests (admin only)
 */
export async function getPendingAdminRequests(req, res) {
  try {
    const requests = await prisma.adminRequest.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    res.json(requests);
  } catch (error) {
    console.error('Get pending admin requests error:', error);
    res.status(500).json({ error: 'Failed to fetch admin requests' });
  }
}

/**
 * Get all admin requests (admin only)
 */
export async function getAllAdminRequests(req, res) {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.adminRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          requestedAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.adminRequest.count({ where }),
    ]);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all admin requests error:', error);
    res.status(500).json({ error: 'Failed to fetch admin requests' });
  }
}

/**
 * Approve admin request
 */
export async function approveAdminRequest(req, res) {
  try {
    const { requestId } = req.params;
    const adminId = req.userId;

    const adminRequest = await prisma.adminRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!adminRequest) {
      return res.status(404).json({ error: 'Admin request not found' });
    }

    if (adminRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Update request status
    const updatedRequest = await prisma.adminRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    });

    // Update user role to ADMIN
    await prisma.user.update({
      where: { id: adminRequest.userId },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Create admin profile if it doesn't exist
    await prisma.admin.upsert({
      where: { userId: adminRequest.userId },
      update: {},
      create: {
        userId: adminRequest.userId,
      },
    });

    // Notify the requester
    try {
      await createNotification({
        userId: adminRequest.userId,
        title: 'Admin Access Approved',
        body: 'Your request for admin access has been approved. You can now access admin features.',
        data: {
          type: 'admin_coordination',
          requestId: updatedRequest.id,
          status: 'APPROVED',
          approvedAt: updatedRequest.approvedAt,
        },
      });
    } catch (notificationError) {
      logger.error(`Failed to send approval notification for request ${requestId}:`, notificationError);
    }

    res.json(updatedRequest);
  } catch (error) {
    console.error('Approve admin request error:', error);
    res.status(500).json({ error: 'Failed to approve admin request' });
  }
}

/**
 * Reject admin request
 */
export async function rejectAdminRequest(req, res) {
  try {
    const { requestId } = req.params;
    const adminId = req.userId;
    const { reason } = req.body;

    const adminRequest = await prisma.adminRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!adminRequest) {
      return res.status(404).json({ error: 'Admin request not found' });
    }

    if (adminRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Update request status
    const updatedRequest = await prisma.adminRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: adminId,
      },
    });

    // Notify the requester
    try {
      await createNotification({
        userId: adminRequest.userId,
        title: 'Admin Access Request Rejected',
        body: `Your request for admin access has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
        data: {
          type: 'admin_coordination',
          requestId: updatedRequest.id,
          status: 'REJECTED',
          rejectedAt: updatedRequest.rejectedAt,
          reason: reason || null,
        },
      });
    } catch (notificationError) {
      logger.error(`Failed to send rejection notification for request ${requestId}:`, notificationError);
    }

    res.json(updatedRequest);
  } catch (error) {
    console.error('Reject admin request error:', error);
    res.status(500).json({ error: 'Failed to reject admin request' });
  }
}

