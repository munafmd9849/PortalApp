/**
 * Recruiters Controller
 * Replaces Firebase Firestore recruiter service calls
 */

import prisma from '../config/database.js';
import { createNotification } from './notifications.js';
import { getIO } from '../config/socket.js';

/**
 * Get recruiter directory (admin)
 * Replaces: subscribeRecruiterDirectory()
 */
export async function getRecruiterDirectory(req, res) {
  try {
    const recruiters = await prisma.recruiter.findMany({
      include: {
        user: {
          select: {
            email: true,
            status: true,
            blockInfo: true,
            createdAt: true,
          },
        },
        company: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format for frontend compatibility
    const formatted = recruiters.map(recruiter => {
      const jobs = recruiter.jobs || [];
      const lastJob = jobs[0];

      return {
        id: recruiter.id,
        companyName: recruiter.company?.name || recruiter.companyName || 'Unknown',
        recruiterName: recruiter.user?.displayName || recruiter.user?.email || 'Unknown',
        email: recruiter.user?.email || '',
        location: recruiter.location || lastJob?.companyLocation || 'Not specified',
        lastJobPostedAt: lastJob?.createdAt || recruiter.createdAt,
        totalJobPostings: jobs.length,
        status: recruiter.user?.status || 'ACTIVE',
        blockInfo: recruiter.user?.blockInfo,
        activityHistory: jobs.map(job => ({
          type: job.jobTitle || 'Job Posted',
          date: job.createdAt,
          location: job.companyLocation || 'Not specified',
          status: job.status,
        })),
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get recruiter directory error:', error);
    res.status(500).json({ error: 'Failed to get recruiter directory' });
  }
}

/**
 * Get recruiter jobs by email (admin)
 * Returns all jobs posted by a recruiter
 */
export async function getRecruiterJobs(req, res) {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Recruiter email is required' });
    }

    // Find recruiter by email
    const recruiter = await prisma.recruiter.findFirst({
      where: {
        user: {
          email: email,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
        company: true,
      },
    });

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    // Get all jobs for this recruiter
    const jobs = await prisma.job.findMany({
      where: {
        recruiterId: recruiter.id,
      },
      include: {
        company: true,
        recruiter: {
          include: {
            user: {
              select: {
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(jobs);
  } catch (error) {
    console.error('Get recruiter jobs error:', error);
    res.status(500).json({ error: 'Failed to get recruiter jobs' });
  }
}

/**
 * Block/unblock recruiter (admin)
 * Replaces: blockUnblockRecruiter()
 */
export async function blockUnblockRecruiter(req, res) {
  try {
    const { recruiterId } = req.params;
    const { isUnblocking, blockType, endDate, endTime, reason, notes } = req.body;
    const adminId = req.userId;

    const recruiter = await prisma.recruiter.findUnique({
      where: { id: recruiterId },
      include: { user: true },
    });

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    const updateData = {
      status: isUnblocking ? 'ACTIVE' : 'BLOCKED',
    };

    if (isUnblocking) {
      updateData.blockInfo = null;
    } else {
      updateData.blockInfo = {
        type: blockType,
        endDate: blockType === 'temporary' ? endDate : null,
        endTime: blockType === 'temporary' ? endTime : null,
        reason,
        notes,
        blockedAt: new Date(),
        blockedBy: adminId,
      };
    }

    await prisma.user.update({
      where: { id: recruiter.userId },
      data: updateData,
    });

    // Create notification
    await createNotification({
      userId: recruiter.userId,
      title: isUnblocking ? 'Account Unblocked' : 'Account Blocked',
      body: isUnblocking
        ? 'Your recruiter account has been unblocked.'
        : `Your recruiter account has been blocked. Reason: ${reason}`,
      data: {
        type: isUnblocking ? 'recruiter_unblocked' : 'recruiter_blocked',
        recruiterId,
        adminId,
        reason: isUnblocking ? null : reason,
      },
    });

    // Emit Socket.IO event to notify admins of recruiter status change
    const io = getIO();
    if (io) {
      io.to('admins').emit('recruiter:updated', {
        recruiterId,
        action: isUnblocking ? 'unblocked' : 'blocked',
        status: isUnblocking ? 'ACTIVE' : 'BLOCKED',
      });
    }

    res.json({
      success: true,
      action: isUnblocking ? 'unblocked' : 'blocked',
    });
  } catch (error) {
    console.error('Block/unblock recruiter error:', error);
    res.status(500).json({ error: 'Failed to update recruiter status' });
  }
}

/**
 * List MOU documents for the authenticated recruiter
 * GET /api/recruiters/mou
 */
export async function listMouDocuments(req, res) {
  try {
    const userId = req.userId;
    const recruiter = await prisma.recruiter.findFirst({
      where: { userId },
    });
    if (!recruiter) {
      return res.status(403).json({ error: 'Recruiter profile not found' });
    }
    const docs = await prisma.recruiterMouDocument.findMany({
      where: { recruiterId: recruiter.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fileUrl: true, fileName: true, createdAt: true },
    });
    res.json({ documents: docs });
  } catch (error) {
    console.error('List MOU documents error:', error);
    res.status(500).json({ error: 'Failed to load MOU documents' });
  }
}

/**
 * Upload MOU document (PDF to Cloudinary, store in DB)
 * POST /api/recruiters/mou - multipart with field 'mou'
 */
export async function uploadMouDocument(req, res) {
  try {
    const userId = req.userId;
    const recruiter = await prisma.recruiter.findFirst({
      where: { userId },
    });
    if (!recruiter) {
      return res.status(403).json({ error: 'Recruiter profile not found' });
    }
    if (!req.file?.url) {
      return res.status(400).json({ error: 'No file uploaded. Please select a PDF file.' });
    }
    const doc = await prisma.recruiterMouDocument.create({
      data: {
        recruiterId: recruiter.id,
        fileUrl: req.file.url,
        publicId: req.file.public_id || null,
        fileName: req.file.originalname || 'MOU.pdf',
      },
    });
    res.status(201).json({
      success: true,
      document: {
        id: doc.id,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload MOU document error:', error);
    res.status(500).json({ error: 'Failed to save MOU document' });
  }
}
