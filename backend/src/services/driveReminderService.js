/**
 * Drive reminder email service
 * Sends reminders at 7 days, 3 days, and 24 hours before drive date.
 * - 7d & 3d: recruiter + admin only
 * - 24h: recruiter + admin + students who applied
 * Only runs for jobs with driveDate set (not TBD).
 */

import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { sendDriveReminderRecruiterAdmin, sendDriveReminder24h, sendDriveReminderStudent } from './emailService.js';
import logger from '../config/logger.js';

/** Date-only (YYYY-MM-DD) for comparison */
function toDateOnly(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

/** Days from today to drive date (date-only); can be negative if past */
function daysUntilDrive(driveDate) {
  const today = toDateOnly(new Date());
  const drive = toDateOnly(driveDate);
  return Math.floor((drive - today) / (24 * 60 * 60 * 1000));
}

/** Get recruiter emails from job (recruiterEmails JSON or recruiterEmail) */
function getRecruiterEmails(job) {
  const list = [];
  if (job.recruiterEmail) list.push(job.recruiterEmail);
  if (job.recruiterEmails) {
    try {
      const arr = typeof job.recruiterEmails === 'string' ? JSON.parse(job.recruiterEmails) : job.recruiterEmails;
      if (Array.isArray(arr)) arr.forEach((r) => { if (r?.email) list.push(r.email); });
    } catch (_) { }
  }
  return [...new Set(list)];
}

/** Get admin emails (active ADMIN and SUPER_ADMIN users) */
async function getAdminEmails() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
        email: { not: Prisma.DbNull }
      },
      select: { email: true }
    });
    return users.map((u) => u.email).filter(Boolean);
  } catch (err) {
    logger.error('[Drive Reminder] getAdminEmails failed:', err);
    return [];
  }
}

/**
 * Check jobs with drive date in 7d, 3d, or 1d and send reminders; update sent flags.
 */
export async function checkAndSendDriveReminders() {
  try {
    const now = new Date();
    const jobs = await prisma.job.findMany({
      where: {
        NOT: { driveDate: null },
        status: 'POSTED',
        isPosted: true
      },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        driveDate: true,
        driveVenues: true,
        reportingTime: true,
        driveReminder7dSent: true,
        driveReminder3dSent: true,
        driveReminder24hSent: true
      }
    });

    if (jobs.length === 0) {
      return { processed: 0, results: [] };
    }

    const adminEmails = await getAdminEmails();
    const results = [];

    for (const job of jobs) {
      const days = daysUntilDrive(job.driveDate);
      const recruiterEmails = getRecruiterEmails(job);
      const recruiterAdminEmails = [...new Set([...recruiterEmails, ...adminEmails])].filter(Boolean);

      if (recruiterAdminEmails.length === 0 && days <= 7) {
        logger.warn(`[Drive Reminder] Job ${job.id} has no recruiter/admin emails; skipping reminders`);
      }

      // Fetch student applicant emails if needed
      let applicantEmails = [];
      if (days === 7 || days === 3 || days === 1) {
        const applications = await prisma.application.findMany({
          where: { jobId: job.id },
          select: { student: { select: { email: true } } }
        });
        applicantEmails = applications.map((a) => a.student?.email).filter(Boolean);
      }

      // 7 days before
      if (days === 7 && !job.driveReminder7dSent) {
        try {
          await sendDriveReminderRecruiterAdmin(job, recruiterAdminEmails, 7);
          if (applicantEmails.length > 0) {
            await sendDriveReminderStudent(job, applicantEmails, 7);
          }
          await prisma.job.update({
            where: { id: job.id },
            data: { driveReminder7dSent: true }
          });
          results.push({ jobId: job.id, type: '7d', status: 'sent', applicantCount: applicantEmails.length });
        } catch (err) {
          logger.error(`[Drive Reminder] 7d send failed for job ${job.id}:`, err);
          results.push({ jobId: job.id, type: '7d', status: 'error', error: err.message });
        }
      }

      // 3 days before
      if (days === 3 && !job.driveReminder3dSent) {
        try {
          await sendDriveReminderRecruiterAdmin(job, recruiterAdminEmails, 3);
          if (applicantEmails.length > 0) {
            await sendDriveReminderStudent(job, applicantEmails, 3);
          }
          await prisma.job.update({
            where: { id: job.id },
            data: { driveReminder3dSent: true }
          });
          results.push({ jobId: job.id, type: '3d', status: 'sent', applicantCount: applicantEmails.length });
        } catch (err) {
          logger.error(`[Drive Reminder] 3d send failed for job ${job.id}:`, err);
          results.push({ jobId: job.id, type: '3d', status: 'error', error: err.message });
        }
      }

      // 24 hours (1 day) before
      if (days === 1 && !job.driveReminder24hSent) {
        try {
          await sendDriveReminder24h(job, recruiterAdminEmails, applicantEmails);
          await prisma.job.update({
            where: { id: job.id },
            data: { driveReminder24hSent: true }
          });
          results.push({ jobId: job.id, type: '24h', status: 'sent', applicantCount: applicantEmails.length });
        } catch (err) {
          logger.error(`[Drive Reminder] 24h send failed for job ${job.id}:`, err);
          results.push({ jobId: job.id, type: '24h', status: 'error', error: err.message });
        }
      }
    }

    return {
      processed: jobs.length,
      results,
      sent: results.filter((r) => r.status === 'sent').length
    };
  } catch (error) {
    logger.error('[Drive Reminder] checkAndSendDriveReminders failed:', error);
    throw error;
  }
}
