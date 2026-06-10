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
    const { isUnblocking, blockType, startDate, endDate, endTime, reason, notes } = req.body;
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
        startDate: blockType === 'temporary' ? startDate : null,
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

function isPostedJob(job) {
  return job.isPosted || String(job.status || '').toUpperCase() === 'POSTED';
}

function isManagerRecruiter(recruiter) {
  const relationship = String(recruiter.relationshipType || '').toLowerCase();
  const zone = String(recruiter.zone || '').toLowerCase();
  return relationship.includes('manager') || zone.includes('manager');
}

async function resolveRecruiterForUser(userId) {
  return prisma.recruiter.findFirst({
    where: { userId },
    include: {
      user: { select: { status: true, displayName: true, email: true } },
      company: { select: { id: true, name: true } },
    },
  });
}

async function aggregateApplicationStats(jobIds) {
  if (!jobIds.length) {
    return {
      total: 0,
      shortlisted: 0,
      selected: 0,
      rejected: 0,
      interviewing: 0,
    };
  }

  const hasInterviewSession = await prisma.interviewSession.findFirst({
    where: { jobId: { in: jobIds } },
    select: { id: true },
  });

  const [total, selected, rejected, shortlisted, interviewing] = await Promise.all([
    prisma.application.count({ where: { jobId: { in: jobIds } } }),
    prisma.application.count({
      where: { jobId: { in: jobIds }, OR: [{ interviewStatus: 'SELECTED' }, { status: 'SELECTED' }] },
    }),
    prisma.application.count({
      where: {
        jobId: { in: jobIds },
        OR: [
          { status: 'REJECTED' },
          { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
          { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
        ],
      },
    }),
    prisma.application.count({
      where: {
        jobId: { in: jobIds },
        screeningStatus: { in: ['RESUME_SELECTED', 'SCREENING_SELECTED'] },
        NOT: {
          OR: [
            { status: 'REJECTED' },
            { status: 'SELECTED' },
            { interviewStatus: 'SELECTED' },
            { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
            { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
          ],
        },
      },
    }),
    hasInterviewSession
      ? prisma.application.count({
        where: {
          jobId: { in: jobIds },
          screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] },
          roundEvaluations: { some: {} },
          NOT: {
            OR: [
              { interviewStatus: 'SELECTED' },
              { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
            ],
          },
        },
      })
      : Promise.resolve(0),
  ]);

  return { total, shortlisted, selected, rejected, interviewing };
}

/**
 * Recruiter dashboard aggregate stats (all posted jobs)
 * GET /api/recruiters/dashboard-stats
 */
export async function getRecruiterDashboardStats(req, res) {
  try {
    const recruiter = await resolveRecruiterForUser(req.userId);
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    const postedJobs = await prisma.job.findMany({
      where: {
        recruiterId: recruiter.id,
        OR: [{ status: 'POSTED' }, { isPosted: true }],
      },
      select: {
        id: true,
        jobTitle: true,
        postedAt: true,
        createdAt: true,
      },
    });

    const jobIds = postedJobs.map((j) => j.id);
    const stats = await aggregateApplicationStats(jobIds);
    const selectionRate = stats.total > 0 ? Math.round((stats.selected / stats.total) * 100) : null;

    const recentApplications = jobIds.length
      ? await prisma.application.findMany({
        where: { jobId: { in: jobIds } },
        orderBy: [{ appliedDate: 'desc' }, { createdAt: 'desc' }],
        take: 30,
        include: {
          student: {
            select: {
              fullName: true,
              email: true,
              school: true,
            },
          },
          job: {
            select: {
              id: true,
              jobTitle: true,
            },
          },
        },
      })
      : [];

    const schoolCounts = {};
    if (jobIds.length) {
      const allApps = await prisma.application.findMany({
        where: { jobId: { in: jobIds } },
        select: { student: { select: { school: true } } },
      });
      allApps.forEach((app) => {
        const school = app.student?.school || 'Other';
        schoolCounts[school] = (schoolCounts[school] || 0) + 1;
      });
    }

    res.json({
      jobsPosted: postedJobs.length,
      stats,
      selectionRate,
      schoolCounts,
      recentApplications: recentApplications.map((app) => ({
        id: app.id,
        appliedAt: app.appliedDate || app.createdAt,
        jobId: app.job?.id || app.jobId,
        jobTitle: app.job?.jobTitle || 'Job',
        student: app.student,
        status: app.status,
        screeningStatus: app.screeningStatus,
        interviewStatus: app.interviewStatus,
      })),
    });
  } catch (error) {
    console.error('Get recruiter dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to load recruiter dashboard stats' });
  }
}

/**
 * Company-level recruiter team analytics
 * GET /api/recruiters/company-analytics
 */
export async function getRecruiterCompanyAnalytics(req, res) {
  try {
    const recruiter = await resolveRecruiterForUser(req.userId);
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    const teamRecruiters = recruiter.companyId
      ? await prisma.recruiter.findMany({
        where: { companyId: recruiter.companyId },
        include: {
          user: { select: { status: true, displayName: true, email: true } },
        },
      })
      : [recruiter];

    const activeRecruiters = teamRecruiters.filter(
      (r) => (r.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
    );
    const managerRecruiters = teamRecruiters.filter(isManagerRecruiter);

    const hrByCenter = {};
    activeRecruiters.forEach((r) => {
      const center = r.location || 'Not specified';
      hrByCenter[center] = (hrByCenter[center] || 0) + 1;
    });

    const managerByCenter = {};
    managerRecruiters.forEach((r) => {
      const center = r.location || 'Not specified';
      managerByCenter[center] = (managerByCenter[center] || 0) + 1;
    });

    const teamRecruiterIds = teamRecruiters.map((r) => r.id);
    const companyJobs = await prisma.job.findMany({
      where: { recruiterId: { in: teamRecruiterIds } },
      select: {
        id: true,
        status: true,
        isPosted: true,
        postedAt: true,
        createdAt: true,
        targetSchools: true,
        companyLocation: true,
        location: true,
      },
    });

    const postedJobs = companyJobs.filter(isPostedJob);
    const totalDrives = postedJobs.length;
    const jobPostingFrequency = companyJobs.length;

    const driveByMonth = {};
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      last12Months.push(monthKey);
      driveByMonth[monthKey] = 0;
    }

    postedJobs.forEach((job) => {
      const jobDate = job.postedAt || job.createdAt;
      if (!jobDate) return;
      const monthKey = new Date(jobDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (Object.prototype.hasOwnProperty.call(driveByMonth, monthKey)) {
        driveByMonth[monthKey] += 1;
      }
    });

    const jobsBySchool = {};
    companyJobs.forEach((job) => {
      let schools = job.targetSchools || [];
      if (typeof schools === 'string') {
        try {
          schools = JSON.parse(schools);
        } catch {
          schools = [];
        }
      }
      if (Array.isArray(schools) && schools.length > 0) {
        schools.forEach((school) => {
          jobsBySchool[school] = (jobsBySchool[school] || 0) + 1;
        });
      }
    });

    res.json({
      companyName: recruiter.company?.name || recruiter.companyName || null,
      stats: {
        totalHRs: activeRecruiters.length,
        totalManagers: managerRecruiters.length,
        totalDrives,
        jobPostingFrequency,
      },
      charts: {
        hrDistribution: {
          labels: Object.keys(hrByCenter).length ? Object.keys(hrByCenter) : ['Not specified'],
          data: Object.keys(hrByCenter).length ? Object.values(hrByCenter) : [activeRecruiters.length || 0],
        },
        managerDistribution: {
          labels: Object.keys(managerByCenter),
          data: Object.values(managerByCenter),
        },
        driveParticipation: {
          labels: last12Months,
          data: last12Months.map((month) => driveByMonth[month] || 0),
        },
        jobPostingFrequency: {
          labels: Object.keys(jobsBySchool).length ? Object.keys(jobsBySchool) : ['All Schools'],
          data: Object.keys(jobsBySchool).length ? Object.values(jobsBySchool) : [jobPostingFrequency],
        },
      },
    });
  } catch (error) {
    console.error('Get recruiter company analytics error:', error);
    res.status(500).json({ error: 'Failed to load recruiter company analytics' });
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
