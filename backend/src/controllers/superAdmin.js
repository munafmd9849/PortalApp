/**
 * Super Admin Controller
 * Create/disable admins, freeze interviews, stats by center/department/admin
 */

import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';
import { createNotification } from './notifications.js';
import logger from '../config/logger.js';

/**
 * List all admin users (Super Admin only)
 */
export async function listAdmins(req, res) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: {
        admin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const list = admins.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      adminId: u.admin?.id,
    }));

    res.json({ admins: list });
  } catch (error) {
    logger.error('List admins error:', error);
    res.status(500).json({ error: 'Failed to list admins' });
  }
}

/**
 * Create a new admin user (Super Admin only)
 */
export async function createAdmin(req, res) {
  try {
    const { email, password, displayName } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailTrim = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailTrim } });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const name = (displayName && typeof displayName === 'string' ? displayName.trim() : null) || emailTrim;

    const { user, admin } = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: emailTrim,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          displayName: name,
        },
      });
      const a = await tx.admin.create({
        data: { userId: u.id, name },
      });
      return { user: u, admin: a };
    });

    logger.info(`Super Admin created admin: ${user.email}`);

    res.status(201).json({
      admin: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        adminId: admin.id,
      },
    });
  } catch (error) {
    logger.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
}

/**
 * Disable an admin (set status BLOCKED) - Super Admin only
 */
export async function disableAdmin(req, res) {
  try {
    const { userId } = req.params;
    const superAdminId = req.userId;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Only admin users can be disabled' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'BLOCKED' },
    });

    try {
      await createNotification({
        userId: target.id,
        title: 'Admin account disabled',
        body: 'Your admin account has been disabled by a Super Admin.',
        data: { type: 'admin_disabled', disabledBy: superAdminId },
      });
    } catch (e) {
      logger.warn('Failed to notify disabled admin:', e);
    }

    logger.info(`Super Admin disabled admin: ${target.email}`);

    res.json({ message: 'Admin disabled successfully' });
  } catch (error) {
    logger.error('Disable admin error:', error);
    res.status(500).json({ error: 'Failed to disable admin' });
  }
}

/**
 * Enable an admin (set status ACTIVE) - Super Admin only
 */
export async function enableAdmin(req, res) {
  try {
    const { userId } = req.params;

    const target = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Only admin users can be enabled' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    logger.info(`Super Admin enabled admin: ${target.email}`);

    res.json({ message: 'Admin enabled successfully' });
  } catch (error) {
    logger.error('Enable admin error:', error);
    res.status(500).json({ error: 'Failed to enable admin' });
  }
}

/**
 * Get Super Admin stats: by center, department (school), and per-admin
 */
export async function getSuperAdminStats(req, res) {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        center: true,
        school: true,
        batch: true,
        userId: true,
      },
    });

    const users = await prisma.user.findMany({
      where: { id: { in: students.map((s) => s.userId) } },
      select: { id: true, status: true },
    });
    const userStatus = Object.fromEntries(users.map((u) => [u.id, u.status]));

    const byCenter = {};
    const bySchool = {};
    for (const s of students) {
      const center = s.center || 'Unknown';
      const school = s.school || 'Unknown';
      if (!byCenter[center]) byCenter[center] = { total: 0, active: 0 };
      if (!bySchool[school]) bySchool[school] = { total: 0, active: 0 };
      byCenter[center].total += 1;
      bySchool[school].total += 1;
      if (userStatus[s.userId] === 'ACTIVE') {
        byCenter[center].active += 1;
        bySchool[school].active += 1;
      }
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        admin: { select: { id: true } },
      },
    });

    const jobCount = await prisma.job.count();
    const appCount = await prisma.application.count();
    const placedCount = await prisma.application.count({
      where: { OR: [{ status: 'SELECTED' }, { interviewStatus: 'SELECTED' }] },
    });

    res.json({
      byCenter: Object.entries(byCenter).map(([name, v]) => ({ center: name, ...v })),
      bySchool: Object.entries(bySchool).map(([name, v]) => ({ school: name, ...v })),
      admins: admins.map((a) => ({
        id: a.id,
        email: a.email,
        displayName: a.displayName,
        status: a.status,
        lastLoginAt: a.lastLoginAt,
        createdAt: a.createdAt,
      })),
      summary: {
        totalStudents: students.length,
        totalJobs: jobCount,
        totalApplications: appCount,
        placedStudents: placedCount,
      },
    });
  } catch (error) {
    logger.error('Super Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
