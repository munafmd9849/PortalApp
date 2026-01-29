/**
 * Announcements Controller
 * Admin creates announcements; students receive email (with optional school/batch/center targeting)
 */

import prisma from '../config/database.js';
import { sendAnnouncementEmail } from '../services/emailService.js';
import logger from '../config/logger.js';

function parseTargeting(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed === 'ALL' || trimmed.toUpperCase() === '["ALL"]') return ['ALL'];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed.includes(',') ? trimmed.split(',').map((s) => s.trim()).filter(Boolean) : [trimmed];
    }
  }
  return [];
}

/**
 * Create announcement and send to targeted students
 * POST /api/announcements - ADMIN only, multipart: title, description, link?, image?, targetSchools?, targetBatches?, targetCenters?
 */
export async function createAnnouncement(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure Prisma client has Announcement model (run: npx prisma generate)
    if (typeof prisma.announcement === 'undefined') {
      logger.error('Prisma client missing announcement model. Run: npx prisma generate');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Announcement model not available. Run: npx prisma generate, then restart the server.',
      });
    }

    const title = (req.body?.title || '').trim();
    const description = (req.body?.description || '').trim();
    const link = (req.body?.link || '').trim() || null;
    const targetSchools = parseTargeting(req.body?.targetSchools);
    const targetBatches = parseTargeting(req.body?.targetBatches);
    const targetCenters = parseTargeting(req.body?.targetCenters);

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    let imageUrl = null;
    let imagePublicId = null;
    if (req.file?.url || req.file?.secure_url) {
      imageUrl = req.file.url || req.file.secure_url;
      imagePublicId = req.file.public_id || null;
    }

    const targetSchoolsJson = targetSchools.length ? JSON.stringify(targetSchools) : null;
    const targetBatchesJson = targetBatches.length ? JSON.stringify(targetBatches) : null;
    const targetCentersJson = targetCenters.length ? JSON.stringify(targetCenters) : null;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        description,
        link,
        imageUrl,
        imagePublicId,
        targetSchools: targetSchoolsJson,
        targetBatches: targetBatchesJson,
        targetCenters: targetCentersJson,
        createdBy: userId,
      },
    });

    const studentWhere = { emailNotificationsDisabled: false };
    if (targetSchools.length > 0 && !targetSchools.includes('ALL')) {
      studentWhere.school = { in: targetSchools };
    }
    if (targetBatches.length > 0 && !targetBatches.includes('ALL')) {
      studentWhere.batch = { in: targetBatches };
    }
    if (targetCenters.length > 0 && !targetCenters.includes('ALL')) {
      studentWhere.center = { in: targetCenters };
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: { email: true },
    });

    const recipientEmails = students.map((s) => s.email).filter(Boolean);
    const attachments = imageUrl
      ? [{ filename: 'announcement.jpg', href: imageUrl }]
      : [];

    let sent = 0;
    let failed = 0;
    for (const email of recipientEmails) {
      try {
        await sendAnnouncementEmail(
          email,
          { title, description, link, imageUrl },
          attachments
        );
        sent++;
      } catch (err) {
        logger.warn(`Announcement email failed for ${email}:`, err.message);
        failed++;
      }
    }

    logger.info(`Announcement created: ${announcement.id}, emails sent: ${sent}, failed: ${failed}`);

    return res.status(201).json({
      success: true,
      announcement: {
        id: announcement.id,
        title: announcement.title,
        description: announcement.description,
        link: announcement.link,
        imageUrl: announcement.imageUrl,
        targetSchools: targetSchools.length ? targetSchools : null,
        targetBatches: targetBatches.length ? targetBatches : null,
        targetCenters: targetCenters.length ? targetCenters : null,
        createdAt: announcement.createdAt,
      },
      emailsSent: sent,
      emailsFailed: failed,
      totalRecipients: recipientEmails.length,
    });
  } catch (error) {
    logger.error('Create announcement error:', error);
    const message = error.message || 'Failed to create announcement';
    // Prisma client not regenerated after adding Announcement model
    if (message.includes("reading 'create'") || (error.code === undefined && message.includes('create'))) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Announcement model not available. Run: npx prisma generate, then restart the server.',
      });
    }
    if (error.code === 'P2021' || message.includes('does not exist')) {
      return res.status(500).json({
        error: 'Database table missing',
        message: 'Run: npx prisma migrate dev --name add_announcements (or npx prisma db push)',
      });
    }
    return res.status(500).json({
      error: 'Failed to create announcement',
      message,
    });
  }
}

/**
 * List announcements (newest first)
 * GET /api/announcements - ADMIN only
 */
export async function listAnnouncements(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        link: true,
        imageUrl: true,
        targetSchools: true,
        targetBatches: true,
        targetCenters: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      announcements,
    });
  } catch (error) {
    logger.error('List announcements error:', error);
    return res.status(500).json({
      error: 'Failed to list announcements',
      message: error.message,
    });
  }
}
