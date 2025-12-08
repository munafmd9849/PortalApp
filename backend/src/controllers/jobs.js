/**
 * Jobs Controller
 * Replaces Firebase Firestore job service calls
 * Handles job CRUD, posting, targeting, and distribution
 */

import prisma from '../config/database.js';
import { addJobToQueue } from '../workers/queues.js';
import { sendJobPostedNotification, sendBulkJobNotifications } from '../services/emailService.js';
import { createNotification } from './notifications.js';
import logger from '../config/logger.js';

/**
 * Get all jobs with filters
 * Replaces: subscribeJobs(), fetchJobs()
 */
export async function getJobs(req, res) {
  try {
    const { status, recruiterId, isPosted, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (recruiterId) where.recruiterId = recruiterId;
    if (isPosted !== undefined) where.isPosted = isPosted === 'true';

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
}

/**
 * Get targeted jobs for student
 * Replaces: loadJobsData() with targeting logic
 */
export async function getTargetedJobs(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId },
      select: {
        school: true,
        center: true,
        batch: true,
      },
    });

    // If student doesn't have profile yet, return all posted jobs (no targeting)
    if (!student || !student.school || !student.center || !student.batch) {
      const jobs = await prisma.job.findMany({
        where: {
          status: 'POSTED',
          isPosted: true,
        },
        include: {
          company: true,
        },
        orderBy: { postedAt: 'desc' },
        take: 100,
      });
      return res.json(jobs);
    }

    // Get all posted jobs first (targeting is done in memory for SQLite compatibility)
    const allJobs = await prisma.job.findMany({
      where: {
        status: 'POSTED',
        isPosted: true,
      },
      include: {
        company: true,
      },
      orderBy: { postedAt: 'desc' },
      take: 200, // Get more to filter in memory
    });

    // Filter jobs based on targeting (handle JSON strings in SQLite)
    const targetedJobs = allJobs.filter(job => {
      // Parse targeting arrays (stored as JSON strings in SQLite)
      let targetSchools = [];
      let targetCenters = [];
      let targetBatches = [];

      try {
        if (job.targetSchools) {
          targetSchools = typeof job.targetSchools === 'string' 
            ? JSON.parse(job.targetSchools) 
            : job.targetSchools;
        }
        if (job.targetCenters) {
          targetCenters = typeof job.targetCenters === 'string'
            ? JSON.parse(job.targetCenters)
            : job.targetCenters;
        }
        if (job.targetBatches) {
          targetBatches = typeof job.targetBatches === 'string'
            ? JSON.parse(job.targetBatches)
            : job.targetBatches;
        }
      } catch (parseError) {
        console.warn('Failed to parse targeting arrays:', parseError);
        // If parsing fails, treat as empty (show to all)
        return true;
      }

      // Ensure arrays
      if (!Array.isArray(targetSchools)) targetSchools = [];
      if (!Array.isArray(targetCenters)) targetCenters = [];
      if (!Array.isArray(targetBatches)) targetBatches = [];

      // No targeting (empty arrays) - show to all
      if (targetSchools.length === 0 && targetCenters.length === 0 && targetBatches.length === 0) {
        return true;
      }

      // "ALL" in targeting - show to all
      if (targetSchools.includes('ALL') || targetCenters.includes('ALL') || targetBatches.includes('ALL')) {
        return true;
      }

      // Match student's attributes
      const schoolMatch = targetSchools.length === 0 || targetSchools.includes(student.school);
      const centerMatch = targetCenters.length === 0 || targetCenters.includes(student.center);
      const batchMatch = targetBatches.length === 0 || targetBatches.includes(student.batch);

      return schoolMatch && centerMatch && batchMatch;
    });

    // Limit to 100 results
    res.json(targetedJobs.slice(0, 100));
  } catch (error) {
    console.error('Get targeted jobs error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    res.status(500).json({ 
      error: 'Failed to get targeted jobs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get single job
 * Replaces: getJob(), getJobDetails()
 */
export async function getJob(req, res) {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
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
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
}

/**
 * Create job
 * Replaces: createJob(), submitJobForReview()
 */
export async function createJob(req, res) {
  try {
    const userId = req.userId;
    const userRole = req.user.role;
    const jobData = req.body;

    // Get recruiter profile (if recruiter) or use admin
    let recruiterId = null;
    if (userRole === 'RECRUITER') {
      const recruiter = await prisma.recruiter.findUnique({
        where: { userId },
      });

      if (!recruiter) {
        return res.status(403).json({ error: 'Recruiter profile not found' });
      }
      recruiterId = recruiter.id;
    }

    // Find or create company
    // Handle both 'company' and 'companyName' fields from frontend
    const companyName = jobData.companyName || jobData.company;
    let companyId = jobData.companyId;
    if (!companyId && companyName) {
      const company = await prisma.company.upsert({
        where: { name: companyName },
        update: {},
        create: {
          name: companyName,
          location: jobData.companyLocation,
        },
      });
      companyId = company.id;
    }

    // Map frontend fields to database schema
    // Frontend sends 'responsibilities' but DB expects 'description'
    // Frontend sends 'skills' but DB expects 'requiredSkills'
    const mappedData = {
      ...jobData,
      description: jobData.description || jobData.responsibilities || '',
      requiredSkills: jobData.requiredSkills || jobData.skills || [],
      companyName: companyName, // Store company name as fallback
    };

    // Extract interview rounds and convert to requirements string
    // interviewRounds is not in DB schema, so we'll store it as part of requirements or instructions
    let requirementsText = '';
    if (jobData.interviewRounds && Array.isArray(jobData.interviewRounds)) {
      requirementsText = jobData.interviewRounds
        .map(round => `${round.title || 'Round'}: ${round.detail || ''}`)
        .filter(r => r.trim().length > 0)
        .join('\n');
    }
    
    // If requirements field exists, combine with interview rounds
    const existingRequirements = jobData.requirements || '';
    const finalRequirements = existingRequirements 
      ? (requirementsText ? `${existingRequirements}\n\n${requirementsText}` : existingRequirements)
      : requirementsText || '[]';

    // Filter and clean spocs array - remove empty entries
    const cleanSpocs = Array.isArray(mappedData.spocs) 
      ? mappedData.spocs.filter(spoc => spoc && (spoc.fullName || spoc.email || spoc.phone))
      : [];

    // Convert array fields to JSON strings for database storage (SQLite compatibility)
    // Only include fields that exist in the schema
    const processedData = {
      // Required fields
      jobTitle: mappedData.jobTitle || '',
      description: mappedData.description || '',
      requirements: typeof finalRequirements === 'string' ? finalRequirements : '[]',
      requiredSkills: Array.isArray(mappedData.requiredSkills) ? JSON.stringify(mappedData.requiredSkills) : (mappedData.requiredSkills || '[]'),
      driveVenues: Array.isArray(mappedData.driveVenues) ? JSON.stringify(mappedData.driveVenues) : (mappedData.driveVenues || '[]'),
      targetSchools: Array.isArray(mappedData.targetSchools) ? JSON.stringify(mappedData.targetSchools) : (mappedData.targetSchools || '[]'),
      targetCenters: Array.isArray(mappedData.targetCenters) ? JSON.stringify(mappedData.targetCenters) : (mappedData.targetCenters || '[]'),
      targetBatches: Array.isArray(mappedData.targetBatches) ? JSON.stringify(mappedData.targetBatches) : (mappedData.targetBatches || '[]'),
      spocs: JSON.stringify(cleanSpocs),
      // Optional fields
      companyId: companyId || null,
      recruiterId: recruiterId || null,
      companyName: companyName || null,
      salary: mappedData.salary || null,
      ctc: mappedData.ctc || null,
      salaryRange: mappedData.salaryRange || null,
      location: mappedData.location || null,
      companyLocation: mappedData.companyLocation || null,
      driveDate: mappedData.driveDate || null,
      applicationDeadline: mappedData.applicationDeadline || null,
      jobType: mappedData.jobType || null,
      experienceLevel: mappedData.experienceLevel || null,
      // Status fields
      status: userRole === 'ADMIN' ? 'POSTED' : 'IN_REVIEW',
      isActive: false,
      isPosted: userRole === 'ADMIN',
      submittedAt: userRole !== 'ADMIN' ? new Date() : null,
      postedBy: userRole === 'ADMIN' ? userId : null,
      postedAt: userRole === 'ADMIN' ? new Date() : null,
    };

    // Create job
    const job = await prisma.job.create({
      data: processedData,
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
    });

    // Notify all admins when a recruiter submits a job for approval
    if (job.status === 'IN_REVIEW' && userRole === 'RECRUITER') {
      try {
        const admins = await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
            status: 'ACTIVE',
          },
          select: { id: true },
        });

        if (admins.length > 0) {
          const recruiterName = job.recruiter?.user?.displayName || 'A recruiter';
          const companyName = job.company?.name || 'Unknown Company';
          
          await Promise.all(
            admins.map((admin) =>
              createNotification({
                userId: admin.id,
                title: `New Job Pending Approval: ${job.jobTitle}`,
                body: `${recruiterName} submitted a job posting for ${companyName} that requires your approval.`,
                data: {
                  type: 'jd_approval',
                  jobId: job.id,
                  jobTitle: job.jobTitle,
                  companyName: companyName,
                  recruiterId: job.recruiterId,
                  recruiterName: recruiterName,
                  submittedAt: job.submittedAt || job.createdAt,
                },
              })
            )
          );
          logger.info(`JD approval notifications sent to ${admins.length} admins for job ${job.id}`);
        }
      } catch (notificationError) {
        // Don't fail job creation if notification fails
        logger.error(`Failed to send JD approval notifications for job ${job.id}:`, notificationError);
      }
    }

    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    console.error('Error stack:', error.stack);
    console.error('Job data that failed:', JSON.stringify(req.body, null, 2));
    
    // Provide more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || 'Failed to create job'
      : 'Failed to create job';
    
    res.status(500).json({ 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack 
      })
    });
  }
}

/**
 * Update job
 * Replaces: updateJob(), updateJobData()
 */
export async function updateJob(req, res) {
  try {
    const { jobId } = req.params;
    const updateData = req.body;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        company: true,
      },
    });

    res.json(job);
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
}

/**
 * Post job (admin only)
 * Replaces: postJob() - includes job distribution
 */
export async function postJob(req, res) {
  try {
    const { jobId } = req.params;
    const { selectedSchools, selectedCenters, selectedBatches } = req.body;
    const adminId = req.userId;

    // Parse targeting arrays (handle both array and JSON string formats from frontend)
    const parseTargeting = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }
      return [];
    };

    const targetSchools = parseTargeting(selectedSchools);
    const targetCenters = parseTargeting(selectedCenters);
    const targetBatches = parseTargeting(selectedBatches);

    // Convert arrays to JSON strings for database storage (schema expects String)
    const targetSchoolsJson = JSON.stringify(targetSchools);
    const targetCentersJson = JSON.stringify(targetCenters);
    const targetBatchesJson = JSON.stringify(targetBatches);

    // Update job status
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'POSTED',
        isPosted: true,
        postedAt: new Date(),
        postedBy: adminId,
        targetSchools: targetSchoolsJson,
        targetCenters: targetCentersJson,
        targetBatches: targetBatchesJson,
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
    });

    // Add job distribution to queue (async background processing)
    try {
      await addJobToQueue({
        jobId: job.id,
        jobData: job,
        targeting: {
          targetSchools: targetSchools,
          targetCenters: targetCenters,
          targetBatches: targetBatches,
        },
      });
      logger.info(`Job ${job.id} added to distribution queue`);
    } catch (queueError) {
      // Don't fail the request if queue fails - log and continue
      logger.error(`Failed to add job ${job.id} to distribution queue:`, queueError);
    }

    // Send email notification to recruiter about job being posted
    try {
      if (job.recruiter) {
        await sendJobPostedNotification(job, job.recruiter);
        logger.info(`Job posted notification sent to recruiter for job ${job.id}`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send job posted notification for job ${job.id}:`, emailError);
    }

    // Send email notifications to matching students about new job
    try {
      // Build query to find matching students based on job targeting
      const where = {
        // Only active students
        user: {
          status: 'ACTIVE',
        },
      };

      // Apply targeting filters if specified
      if (targetSchools.length > 0 && !targetSchools.includes('ALL')) {
        where.school = { in: targetSchools };
      }
      if (targetCenters.length > 0 && !targetCenters.includes('ALL')) {
        where.center = { in: targetCenters };
      }
      if (targetBatches.length > 0 && !targetBatches.includes('ALL')) {
        where.batch = { in: targetBatches };
      }

      // Find matching students
      const matchingStudents = await prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              displayName: true,
            },
          },
        },
        take: 500, // Limit to avoid too many emails (adjust as needed)
      });

      if (matchingStudents.length > 0) {
        // Send bulk email notifications to students
        const emailResults = await sendBulkJobNotifications(matchingStudents, job);
        logger.info(
          `New job notifications sent to ${emailResults.successful} students for job ${job.id} (${emailResults.failed} failed)`
        );
      } else {
        logger.info(`No matching students found for job ${job.id} targeting`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send new job notifications to students for job ${job.id}:`, emailError);
    }

    res.json({
      success: true,
      job,
      message: 'Job posted successfully. Students have been notified.',
    });
  } catch (error) {
    logger.error('Post job error:', {
      jobId: req.params.jobId,
      error: error.message,
      stack: error.stack,
    });
    console.error('Post job error details:', error);
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || 'Failed to post job'
      : 'Failed to post job. Please try again or contact support.';
    
    res.status(500).json({ 
      error: 'Failed to post job',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Approve job (admin)
 * Replaces: approveJob() from jobModeration.js
 */
export async function approveJob(req, res) {
  try {
    const { jobId } = req.params;
    const adminId = req.userId;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'ACCEPTED', // Set to ACCEPTED when approved (approved by admin, ready for posting)
        isPosted: false,     // Not posted to students yet, but approved by admin
        isActive: false,     // Not active yet
        approvedAt: new Date(),
        approvedBy: adminId,
      },
      include: {
        recruiter: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    // Send notification to recruiter
    if (job.recruiter?.user?.id) {
      try {
        await createNotification({
          userId: job.recruiter.user.id,
          title: 'Job Posting Approved',
          body: `Your job posting "${job.jobTitle}" has been approved by the admin. It is now ready to be posted to students.`,
          data: {
            type: 'job_approved',
            jobId: job.id,
            jobTitle: job.jobTitle,
          },
          sendEmail: true,
        });
        logger.info(`Notification sent to recruiter ${job.recruiter.user.id} for job ${jobId} approval`);
      } catch (notifError) {
        logger.error(`Failed to send notification for job approval:`, notifError);
        // Don't fail the approval if notification fails
      }
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error('Approve job error:', error);
    res.status(500).json({ error: 'Failed to approve job' });
  }
}

/**
 * Reject job (admin)
 * Replaces: rejectJob()
 */
export async function deleteJob(req, res) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Find job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        recruiter: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only admin or the job's recruiter can delete
    if (user.role !== 'ADMIN' && job.recruiter.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this job' });
    }

    // Delete associated applications first (optional: could archive instead)
    await prisma.application.deleteMany({
      where: { jobId },
    });

    // Delete job
    await prisma.job.delete({
      where: { id: jobId },
    });

    logger.info(`Job ${jobId} deleted by user ${userId}`);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    logger.error(`Failed to delete job ${req.params.jobId}:`, error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
}

export async function rejectJob(req, res) {
  try {
    const { jobId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.userId;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'REJECTED',
        isActive: false,
        isPosted: false,
        rejectedAt: new Date(),
        rejectedBy: adminId,
        rejectionReason: rejectionReason || 'No reason provided',
      },
      include: {
        recruiter: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    // Send notification to recruiter
    if (job.recruiter?.user?.id) {
      try {
        await createNotification({
          userId: job.recruiter.user.id,
          title: 'Job Posting Rejected',
          body: `Your job posting "${job.jobTitle}" has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
          data: {
            type: 'job_rejected',
            jobId: job.id,
            jobTitle: job.jobTitle,
            rejectionReason: rejectionReason || 'No reason provided',
          },
          sendEmail: true,
        });
        logger.info(`Notification sent to recruiter ${job.recruiter.user.id} for job ${jobId} rejection`);
      } catch (notifError) {
        logger.error(`Failed to send notification for job rejection:`, notifError);
        // Don't fail the rejection if notification fails
      }
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error('Reject job error:', error);
    res.status(500).json({ error: 'Failed to reject job' });
  }
}

/**
 * Auto-archive expired jobs (admin)
 * Archives all jobs where applicationDeadline has passed and status is POSTED or ACTIVE
 */
export async function autoArchiveExpiredJobs(req, res) {
  try {
    const now = new Date();
    
    // Find all jobs that are posted/active and have passed their application deadline
    const expiredJobs = await prisma.job.findMany({
      where: {
        status: {
          in: ['POSTED', 'ACTIVE'],
        },
        applicationDeadline: {
          lt: now, // Less than current date/time
        },
      },
      select: {
        id: true,
        jobTitle: true,
      },
    });

    if (expiredJobs.length === 0) {
      return res.json({
        success: true,
        successful: 0,
        archived: 0,
        message: 'No expired jobs to archive',
      });
    }

    // Archive all expired jobs
    const result = await prisma.job.updateMany({
      where: {
        id: {
          in: expiredJobs.map(job => job.id),
        },
      },
      data: {
        status: 'ARCHIVED',
        isActive: false,
        isPosted: false,
      },
    });

    logger.info(`Auto-archived ${result.count} expired jobs`);

    res.json({
      success: true,
      successful: result.count,
      archived: result.count,
      message: `Successfully archived ${result.count} expired job(s)`,
    });
  } catch (error) {
    logger.error('Auto-archive expired jobs error:', error);
    console.error('Auto-archive expired jobs error:', error);
    res.status(500).json({ 
      error: 'Failed to auto-archive expired jobs',
      message: error.message || 'An unexpected error occurred',
    });
  }
}
