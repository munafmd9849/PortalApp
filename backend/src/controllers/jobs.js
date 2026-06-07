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
import { sendServerError } from '../utils/response.js';
import { logAction } from '../utils/auditLogger.js';
//import { rankCandidatesForJob } from '../services/recommendationService.js';
import { getIO } from '../config/socket.js';
import { getAdminScopeFilter } from '../utils/adminScope.js';
import { applyAuditContext } from '../utils/auditContext.js';

const isSqliteDb = () => (process.env.DATABASE_URL || '').toLowerCase().startsWith('file:');

async function findCompanyByNameCaseInsensitive(companyName) {
  const name = String(companyName || '').trim();
  if (!name) return null;

  // Prisma "mode: insensitive" is not supported on SQLite.
  if (!isSqliteDb()) {
    return prisma.company.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
  }

  // SQLite-safe fallback: raw query using lower(name).
  try {
    const rows = await prisma.$queryRaw`SELECT id FROM companies WHERE lower(name) = lower(${name}) LIMIT 1;`;
    const id = Array.isArray(rows) && rows[0] && rows[0].id ? rows[0].id : null;
    if (!id) return null;
    return prisma.company.findUnique({ where: { id } });
  } catch (e) {
    // Final fallback: case-sensitive match
    return prisma.company.findFirst({ where: { name: { equals: name } } });
  }
}


/**
 * Get all jobs with filters
 * Replaces: subscribeJobs(), fetchJobs()
 */
export async function getJobs(req, res) {
  try {
    const {
      status,
      recruiterId,
      companyId,
      isPosted,
      search, // Search by job title or company name
      driveDateFilter, // 'upcoming', 'today', 'past'
      postedDateStart, // Filter by posted date range
      postedDateEnd,
      createdAtStart, // Filter by created date range
      createdAtEnd,
      school, // Targeted school
      center, // Targeted center
      batch,  // Targeted batch
      createdBy,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (recruiterId) where.recruiterId = recruiterId;
    if (companyId) where.companyId = companyId;
    if (createdBy && createdBy !== 'ALL') where.creator = { is: { id: createdBy } };
    if (isPosted !== undefined) {
      // Handle both string 'true'/'false' and boolean
      const isPostedValue = isPosted === 'true' || isPosted === true;
      where.isPosted = isPostedValue;
    }

    // Targeted School filter
    if (school) {
      const schools = school.split(',').map(s => s.trim());
      where.AND = [
        ...(where.AND || []),
        { OR: schools.map(s => ({ targetSchools: { contains: s } })) }
      ];
    }

    // Targeted Center filter
    if (center) {
      const centers = center.split(',').map(c => c.trim());
      where.AND = [
        ...(where.AND || []),
        { OR: centers.map(c => ({ targetCenters: { contains: c } })) }
      ];
    }

    // Targeted Batch filter
    if (batch) {
      const batches = batch.split(',').map(b => b.trim());
      where.AND = [
        ...(where.AND || []),
        { OR: batches.map(b => ({ targetBatches: { contains: b } })) }
      ];
    }

    // Search filter (job title or company name)
    // Build search conditions separately to combine with other filters using AND
    const searchConditions = [];
    if (search) {
      const searchTerm = search.trim();
      searchConditions.push({
        OR: [
          { jobTitle: { contains: searchTerm } },
          { companyName: { contains: searchTerm } },
          { company: { name: { contains: searchTerm } } },
        ],
      });
    }

    // Combine all conditions with AND logic
    if (searchConditions.length > 0) {
      where.AND = [...(where.AND || []), ...searchConditions];
    }

    // Drive date filter
    if (driveDateFilter && driveDateFilter !== 'all') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (driveDateFilter === 'upcoming') {
        where.driveDate = { gte: now };
      } else if (driveDateFilter === 'today') {
        const todayStart = new Date(now);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        where.driveDate = { gte: todayStart, lte: todayEnd };
      } else if (driveDateFilter === 'past') {
        where.driveDate = { lt: now };
      }
    }

    // Posted date range filter
    if (postedDateStart || postedDateEnd) {
      where.postedAt = {};
      if (postedDateStart) {
        const startDate = new Date(postedDateStart);
        startDate.setHours(0, 0, 0, 0);
        where.postedAt.gte = startDate;
      }
      if (postedDateEnd) {
        const endDate = new Date(postedDateEnd);
        endDate.setHours(23, 59, 59, 999);
        where.postedAt.lte = endDate;
      }
    }

    // Admin Scoping logic
    if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);
      
      // Merge scoping with existing filters
      // For jobs, we check if the job targets the schools/centers the admin is allowed to see
      // OR if the admin created the job themselves
      const scopeConditions = [];
      
      if (req.user.role === 'ADMIN') {
        const adminId = req.userId;
        const baseScope = [];
        
        // Allowed schools scoping
        if (adminScope.school) {
          baseScope.push({ OR: [
            ...adminScope.school.in.map(s => ({ targetSchools: { contains: s } }))
          ]});
        }
        
        // Allowed centers scoping
        if (adminScope.center) {
          baseScope.push({ OR: adminScope.center.in.map(c => ({ targetCenters: { contains: c } })) });
        }

        // Allowed batches scoping
        if (adminScope.batch) {
          baseScope.push({ OR: adminScope.batch.in.map(b => ({ targetBatches: { contains: b } })) });
        }

        // Only apply restrictions if there's a defined scope or a block signal
        const isBlocked = adminScope.id === 'BLOCK_ALL';
        const hasScope = baseScope.length > 0;

        if (isBlocked) {
          scopeConditions.push({ id: 'BLOCK_ALL' });
        } else if (hasScope) {
          // Ownership bypass: Show jobs in scope OR jobs created by this admin
          scopeConditions.push({
            OR: [
              { AND: baseScope },
              { creator: { is: { id: adminId } } }
            ]
          });
        }
        // If not blocked and no specific scope, admin has global access (don't add scopeConditions)
      }

      if (scopeConditions.length > 0) {
        where.AND = [...(where.AND || []), ...scopeConditions];
      }
    }

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
          interviewSession: {
            select: {
              status: true,
            },
          },
          jobTargets: {
            select: {
              studentId: true,
              score: true,
              sourceMode: true,
            }
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    // Add applicationCount to each job
    const jobsWithCounts = jobs.map(job => ({
      ...job,
      applicationCount: job._count?.applications || 0,
      totalApplications: job._count?.applications || 0,
    }));

    res.json({
      success: true,
      jobs: jobsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get jobs error:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.userId,
    });
    sendServerError(res, 'Failed to load jobs. Please try again.');
  }
}

/**
 * Get targeted jobs for student
 * Replaces: loadJobsData() with targeting logic
 */
export async function getTargetedJobs(req, res) {
  try {
    const userId = req.userId;
    let studentId;
    if (req.query.studentId && ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)) {
      studentId = req.query.studentId;
    } else {
      const student = await prisma.student.findUnique({
        where: { userId: req.userId },
        select: { id: true, school: true, center: true, batch: true, schoolId: true, centerId: true, batchId: true },
      });
      if (student) {
        studentId = student.id;
        // Make the school, center, batch available for targeting evaluation
        req.student = student;
      }
    }

    if (!studentId) {
      console.log('No student profile found for user');
      return res.json([]);
    }

    let studentProfile = req.student;
    if (req.query.studentId && ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)) {
      studentProfile = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, school: true, center: true, batch: true, schoolId: true, centerId: true, batchId: true },
      });
    }

    if (!studentProfile) {
      return res.json([]);
    }

    const { school, center, batch, schoolId, centerId, batchId } = studentProfile;

    // If student doesn't have profile yet, return all posted jobs (no targeting)
    // Only POSTED jobs are visible to students (visibility = status = POSTED AND isPosted = true)
    if (!studentProfile || !studentProfile.school || !studentProfile.center || !studentProfile.batch) {
      const jobs = await prisma.job.findMany({
        where: {
          status: 'POSTED',
          isPosted: true, // Enforce visibility rule
        },
        include: {
          company: true,
        },
        orderBy: { postedAt: 'desc' },
        take: 100,
      });
      return res.json(jobs);
    }

    // Get all posted jobs first (targeting is done in memory)
    // Only POSTED jobs are visible to students (visibility = status = POSTED AND isPosted = true)
    const allJobs = await prisma.job.findMany({
      where: {
        status: 'POSTED',
        isPosted: true, // Enforce visibility rule
      },
      include: {
        company: true,
        jobTargets: {
          where: { studentId: studentId }
        }
      },
      orderBy: { postedAt: 'desc' },
      take: 200, // Get more to filter in memory
    });

    // Filter jobs based on targeting (handle JSON-string fields)
    const targetedJobs = allJobs.filter(job => {
      // Parse targeting arrays (stored as JSON strings)
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

      // PRIORITY BYPASS: If student is explicitly targeted (Cherry Picked), they always see the job
      const isExplicitlyTargeted = job.jobTargets.length > 0;
      if (isExplicitlyTargeted) return true;

      // INVITE ONLY: If not explicitly targeted, they can't see it
      if (job.visibilityMode === 'INVITE_ONLY' || job.visibilityMode === 'invite_only') {
        return false;
      }

      // Match student's attributes (OPEN or PRIORITY modes)
      // PRIORITY 1: Match by ID (New System)
      let targetSchoolIds = [];
      let targetCenterIds = [];
      let targetBatchIds = [];
      try {
        if (job.targetSchoolIds) targetSchoolIds = typeof job.targetSchoolIds === 'string' ? JSON.parse(job.targetSchoolIds) : job.targetSchoolIds;
        if (job.targetCenterIds) targetCenterIds = typeof job.targetCenterIds === 'string' ? JSON.parse(job.targetCenterIds) : job.targetCenterIds;
        if (job.targetBatchIds) targetBatchIds = typeof job.targetBatchIds === 'string' ? JSON.parse(job.targetBatchIds) : job.targetBatchIds;
      } catch (e) { console.warn('Parse ID targeting error:', e); }

      // If ID targeting is present, use it
      const hasIdTargeting = targetSchoolIds.length > 0 || targetCenterIds.length > 0 || targetBatchIds.length > 0;
      if (hasIdTargeting) {
        const schoolMatch = targetSchoolIds.length === 0 || targetSchoolIds.includes(schoolId);
        const centerMatch = targetCenterIds.length === 0 || targetCenterIds.includes(centerId);
        const batchMatch = targetBatchIds.length === 0 || targetBatchIds.includes(batchId);
        if (schoolMatch && centerMatch && batchMatch) return true;
        // If IDs are present but don't match, we still check names for backward compatibility
      }

      // PRIORITY 2: Match by Name (Legacy System)
      const schoolMatchName = targetSchools.length === 0 || targetSchools.includes(school);
      const centerMatchName = targetCenters.length === 0 || targetCenters.includes(center);
      const batchMatchName = targetBatches.length === 0 || targetBatches.includes(batch);

      return schoolMatchName && centerMatchName && batchMatchName;
    });

    // Map flags and limit to 100 results
    const finalJobs = targetedJobs.map(job => {
      const hasTargetRecord = job.jobTargets.length > 0;
      const isRecommended = (job.visibilityMode === 'PRIORITY' || job.visibilityMode === 'priority') && hasTargetRecord;
      const isInvited = (job.visibilityMode === 'INVITE_ONLY' || job.visibilityMode === 'invite_only') && hasTargetRecord;
      
      return {
        ...job,
        isRecommended,
        isInvited
      };
    }).slice(0, 100);

    res.json(finalJobs);
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
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'The requested job does not exist.'
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get job error:', error);
    sendServerError(res, 'Failed to load job details. Please try again.');
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

    // STRICT: Explicitly reject STUDENT users - this is a safety net in addition to middleware
    if (userRole === 'STUDENT') {
      console.error('🚫 UNAUTHORIZED ACCESS ATTEMPT - createJob controller (bypassed middleware):', {
        userId,
        userRole,
        email: req.user.email,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    const jobData = req.body;

    // VALIDATE REQUIRED RECRUITER EMAILS (support both old single email and new array format)
    let recruiterEmails = [];

    // Handle backward compatibility: if recruiterEmail exists, convert to array format
    if (jobData.recruiterEmail) {
      recruiterEmails = [{
        email: jobData.recruiterEmail.trim(),
        name: (jobData.recruiterName || '').trim() || null
      }];
    } else if (jobData.recruiterEmails && Array.isArray(jobData.recruiterEmails)) {
      recruiterEmails = jobData.recruiterEmails;
    }

    // Validate at least one email is provided
    if (!recruiterEmails || recruiterEmails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recruiter/HR email is required',
        field: 'recruiterEmails',
        message: 'Please provide at least one valid email address for the recruiter or HR contact who will handle screening.'
      });
    }

    // CRITICAL: Validate both dates are required
    if (!jobData.applicationDeadline) {
      return res.status(400).json({
        success: false,
        error: 'Application deadline is required',
        field: 'applicationDeadline',
        message: 'Application deadline is required. This is the last date/time students can apply.'
      });
    }

    // Drive date is optional ("Not decided" / TBD). When provided, it must be after application deadline.
    if (jobData.driveDate) {
      const deadline = new Date(jobData.applicationDeadline);
      const driveDate = new Date(jobData.driveDate);
      if (driveDate <= deadline) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date configuration',
          field: 'driveDate',
          message: 'Drive date must be after the application deadline. Interviews happen after applications close.'
        });
      }
    }

    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = [];
    const invalidEmails = [];

    for (let i = 0; i < recruiterEmails.length; i++) {
      const rec = recruiterEmails[i];
      const email = rec?.email?.trim();

      if (!email) {
        invalidEmails.push({ index: i, reason: 'Email is required' });
        continue;
      }

      if (!emailRegex.test(email)) {
        invalidEmails.push({ index: i, email, reason: 'Invalid email format' });
        continue;
      }

      validEmails.push({
        email: email,
        name: rec?.name?.trim() || null
      });
    }

    if (validEmails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recruiter email format',
        field: 'recruiterEmails',
        message: 'Please provide at least one valid email address.',
        details: invalidEmails
      });
    }

    // Use first email as primary for backward compatibility (stored in recruiterEmail field)
    const primaryRecruiter = validEmails[0];
    const recruiterEmail = primaryRecruiter.email;
    const recruiterName = primaryRecruiter.name;

    // Handle both 'company' and 'companyName' fields from frontend
    const companyName = (jobData.companyName || jobData.company || '').trim();
    const normalizedRecruiterEmail = recruiterEmail ? recruiterEmail.trim().toLowerCase() : null;

    // Get recruiter profile or resolve/create one (if Admin)
    let recruiterId = null;
    if (userRole === 'RECRUITER') {
      const recruiter = await prisma.recruiter.findUnique({
        where: { userId },
      });

      if (!recruiter) {
        return res.status(403).json({ error: 'Recruiter profile not found' });
      }
      recruiterId = recruiter.id;
    } else {
      // Admin/SuperAdmin creating a job
      if (jobData.recruiterId) {
        // Frontend/admin panels sometimes send a User.id here. Validate and map safely.
        const directRecruiter = await prisma.recruiter.findUnique({
          where: { id: jobData.recruiterId },
        });
        if (directRecruiter) {
          recruiterId = directRecruiter.id;
        } else {
          const recruiterByUserId = await prisma.recruiter.findUnique({
            where: { userId: jobData.recruiterId },
          });
          if (recruiterByUserId) {
            recruiterId = recruiterByUserId.id;
          } else {
            recruiterId = null; // fall back to recruiterEmail resolution below
          }
        }
      }

      if (!recruiterId && normalizedRecruiterEmail) {
        // Find existing recruiter by user email
        const recruiterUser = await prisma.user.findUnique({
          where: { email: normalizedRecruiterEmail },
          include: { recruiter: true }
        });

        if (recruiterUser && recruiterUser.recruiter) {
          recruiterId = recruiterUser.recruiter.id;
        } else {
          // Auto-create recruiter user if admin provides an email that doesn't exist
          try {
            const newUser = await prisma.user.create({
              data: {
                email: normalizedRecruiterEmail,
                password: 'PASSWORD_REQD_FOR_CREATE_' + Math.random().toString(36).slice(-8), // Placeholder
                role: 'RECRUITER',
                name: recruiterName || 'New Recruiter',
                recruiter: {
                  create: {
                    companyName: companyName || 'Unknown Company',
                  }
                }
              },
              include: { recruiter: true }
            });
            recruiterId = newUser.recruiter.id;
            logger.info(`Auto-created recruiter profile for ${normalizedRecruiterEmail}`);
          } catch (createErr) {
            logger.warn(`Could not auto-create recruiter for ${normalizedRecruiterEmail}: ${createErr.message}`);
          }
        }
      }
    }

    // Find or create company
    let companyId = jobData.companyId;
    if (!companyId && companyName) {
      // DEDUP: Search by normalized name
      let company = await findCompanyByNameCaseInsensitive(companyName);

      if (!company) {
        company = await prisma.company.create({
          data: {
            name: companyName,
            location: jobData.companyLocation || null,
            website: jobData.website || null,
          }
        });
      } else {
        // Update website and location if provided
        await prisma.company.update({
          where: { id: company.id },
          data: {
            ...(jobData.website && { website: jobData.website }),
            ...(jobData.companyLocation && { location: jobData.companyLocation }),
          }
        });
      }
      companyId = company.id;

      // Link recruiter to company if needed
      if (recruiterId) {
        await prisma.recruiter.update({
          where: { id: recruiterId },
          data: { companyId: companyId }
        }).catch(() => {});
      }
    } else if (companyId && jobData.website) {
      await prisma.company.update({
        where: { id: companyId },
        data: { website: jobData.website },
      });
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

    // Convert array fields to JSON strings for database storage
    // Only include fields that exist in the schema
    // Clean jobTitle: remove any labels that might have been included
    let cleanJobTitle = (mappedData.jobTitle || '').trim();
    // Remove common prefixes/labels that might have been captured
    cleanJobTitle = cleanJobTitle.replace(/^(?:job\s*description\s*)?job\s*title[:\s]*/i, '');
    cleanJobTitle = cleanJobTitle.replace(/^(?:job\s*description\s*)?position[:\s]*/i, '');
    cleanJobTitle = cleanJobTitle.replace(/^(?:job\s*description\s*)?role[:\s]*/i, '');
    cleanJobTitle = cleanJobTitle.replace(/^(?:job\s*description\s*)?title[:\s]*/i, '');
    cleanJobTitle = cleanJobTitle.trim();

    const processedData = applyAuditContext({
      // Required fields
      jobTitle: cleanJobTitle || '',
      description: mappedData.description || '',
      requirements: typeof finalRequirements === 'string' ? finalRequirements : '[]',
      requiredSkills: Array.isArray(mappedData.requiredSkills) ? JSON.stringify(mappedData.requiredSkills) : (mappedData.requiredSkills || '[]'),
      driveVenues: Array.isArray(mappedData.driveVenues) ? JSON.stringify(mappedData.driveVenues) : (mappedData.driveVenues || '[]'),
      targetSchools: Array.isArray(mappedData.targetSchools) ? JSON.stringify(mappedData.targetSchools) : (mappedData.targetSchools || '[]'),
      targetCenters: Array.isArray(mappedData.targetCenters) ? JSON.stringify(mappedData.targetCenters) : (mappedData.targetCenters || '[]'),
      targetBatches: Array.isArray(mappedData.targetBatches) ? JSON.stringify(mappedData.targetBatches) : (mappedData.targetBatches || '[]'),
      targetSchoolIds: Array.isArray(mappedData.targetSchoolIds) ? JSON.stringify(mappedData.targetSchoolIds) : (mappedData.targetSchoolIds || '[]'),
      targetCenterIds: Array.isArray(mappedData.targetCenterIds) ? JSON.stringify(mappedData.targetCenterIds) : (mappedData.targetCenterIds || '[]'),
      targetBatchIds: Array.isArray(mappedData.targetBatchIds) ? JSON.stringify(mappedData.targetBatchIds) : (mappedData.targetBatchIds || '[]'),
      spocs: JSON.stringify(cleanSpocs),
      // Optional fields - use relation syntax for Prisma
      ...(companyId ? { company: { connect: { id: companyId } } } : {}),
      ...(recruiterId ? { recruiter: { connect: { id: recruiterId } } } : {}),
      companyName: companyName || null,
      recruiterEmail: normalizedRecruiterEmail || recruiterEmail, // REQUIRED: Primary email for recruiter screening access (backward compatibility)
      recruiterName: recruiterName || null, // Optional primary recruiter name (backward compatibility)
      recruiterEmails: JSON.stringify(validEmails), // Store all recruiter emails as JSON string for multiple emails support
      // Set default "As per industry standards" if salary/stipend not specified
      salary: (() => {
        // Check salary first
        if (mappedData.salary) {
          const salaryStr = String(mappedData.salary).trim();
          if (salaryStr !== '' && salaryStr !== 'null' && salaryStr !== 'undefined') {
            return salaryStr;
          }
        }
        // Check stipend for internships
        if (mappedData.stipend) {
          const stipendStr = String(mappedData.stipend).trim();
          if (stipendStr !== '' && stipendStr !== 'null' && stipendStr !== 'undefined') {
            return stipendStr;
          }
        }
        // Default value
        return 'As per industry standards';
      })(),
      ctc: (() => {
        if (mappedData.ctc) {
          const ctcStr = String(mappedData.ctc).trim();
          if (ctcStr !== '' && ctcStr !== 'null' && ctcStr !== 'undefined') {
            return ctcStr;
          }
        }
        return 'As per industry standards';
      })(),
      salaryRange: (mappedData.salaryRange && mappedData.salaryRange.trim() !== '')
        ? mappedData.salaryRange
        : null,
      location: mappedData.location || null,
      companyLocation: mappedData.companyLocation || null,
      driveDate: mappedData.driveDate || null,
      applicationDeadline: mappedData.applicationDeadline || null,
      jobType: mappedData.jobType || null,
      workMode: mappedData.workMode || null,
      experienceLevel: mappedData.experienceLevel || null,
      reportingTime: (mappedData.reportingTime && String(mappedData.reportingTime).trim() !== '') ? String(mappedData.reportingTime).trim() : null,
      // Eligibility Requirements
      qualification: mappedData.qualification || null,
      specialization: mappedData.specialization || null,
      yop: mappedData.yop || null,
      minCgpa: mappedData.minCgpa || null, // Minimum CGPA requirement (e.g., "7.00", "8.50", "70%")
      gapAllowed: mappedData.gapAllowed || null,
      gapYears: mappedData.gapYears || null,
      backlogs: mappedData.backlogs || null,
      // Interview rounds from job creation (stored for session/rounds sync)
      ...(jobData.interviewRounds && Array.isArray(jobData.interviewRounds) && jobData.interviewRounds.length > 0
        ? { interviewRounds: JSON.stringify(jobData.interviewRounds) }
        : {}),
      // Pre-Interview Requirements
      requiresScreening: mappedData.requiresScreening === true || mappedData.requiresScreening === 'true',
      requiresTest: mappedData.requiresTest === true || mappedData.requiresTest === 'true',
      // Status fields - ALL jobs (admin and recruiter) must go through review
      // Enforce: status = IN_REVIEW, isPosted = false, visibleToStudents = false (via isPosted)
      status: 'IN_REVIEW',
      isActive: false,
      isPosted: false, // Jobs are never posted directly - must be approved then posted
      submittedAt: new Date(), // All jobs are submitted for review
    }, userId, 'CREATE');

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

    // Notify all admins when ANY job (admin or recruiter created) is submitted for review
    if (job.status === 'IN_REVIEW') {
      try {
        const admins = await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
            status: 'ACTIVE',
          },
          select: { id: true },
        });

        if (admins.length > 0) {
          const creatorName = userRole === 'RECRUITER'
            ? (job.recruiter?.user?.displayName || 'A recruiter')
            : 'An admin';
          const companyName = job.company?.name || job.companyName || 'Unknown Company';
          const isAdminCreated = userRole === 'ADMIN';

          await Promise.all(
            admins.map((admin) =>
              createNotification({
                userId: admin.id,
                title: `New Job Pending Approval: ${job.jobTitle}`,
                body: isAdminCreated
                  ? `A new job posting for ${companyName} has been created and requires your approval.`
                  : `${creatorName} submitted a job posting for ${companyName} that requires your approval.`,
                data: {
                  type: 'jd_approval',
                  jobId: job.id,
                  jobTitle: job.jobTitle,
                  companyName: companyName,
                  recruiterId: job.recruiterId,
                  recruiterName: creatorName,
                  createdBy: userRole,
                  submittedAt: job.submittedAt || job.createdAt,
                },
              })
            )
          );
          logger.info(`JD approval notifications sent to ${admins.length} admins for job ${job.id} (created by ${userRole})`);
        }
      } catch (notificationError) {
        // Don't fail job creation if notification fails
        logger.error(`Failed to send JD approval notifications for job ${job.id}:`, notificationError);
      }
    }

    // Audit log
    await logAction(req, {
      actionType: 'Create Job',
      targetType: 'Job',
      targetId: job.id,
      details: `Created job: ${job.jobTitle} at ${job.companyName}`,
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully. It has been sent for review and will appear in the "In Review" section.',
      data: job,
    });
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
 * Enforces edit permissions based on job approval status and user role
 */
export async function updateJob(req, res) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const userRole = req.user.role;
    const updateData = req.body;

    // STRICT: Explicitly reject STUDENT users - this is a safety net in addition to middleware
    if (userRole === 'STUDENT') {
      console.error('🚫 UNAUTHORIZED ACCESS ATTEMPT - updateJob controller (bypassed middleware):', {
        userId,
        userRole,
        email: req.user.email,
        jobId,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    // First, get the existing job to check its status and ownership
    const existingJob = await prisma.job.findUnique({
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

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // STRICT RULE: Recruiters cannot edit jobs after creation (any status)
    if (userRole === 'RECRUITER' || userRole === 'recruiter') {
      // Recruiters can ONLY resubmit rejected jobs
      if (existingJob.status === 'REJECTED' && updateData.status === 'IN_REVIEW') {
        // Recruiter is resubmitting - allow status change to IN_REVIEW
        // Clear rejection fields
        updateData.rejectedAt = null;
        updateData.rejectedBy = null;
        updateData.rejectionReason = null;
        updateData.submittedAt = new Date();
      } else if (existingJob.status !== 'REJECTED' || updateData.status !== 'IN_REVIEW') {
        // Recruiters cannot edit jobs in any other state
        return res.status(403).json({
          error: 'Not authorized',
          message: 'Recruiters cannot edit jobs after creation. Only rejected jobs can be resubmitted for review.'
        });
      }
    }

    // STRICT RULE: For POSTED jobs, only applicationDeadline and driveDate can be edited
    if (existingJob.status === 'POSTED') {
      // Define allowed fields for POSTED jobs
      const allowedFieldsForPosted = ['applicationDeadline', 'driveDate'];

      // Check if any restricted fields are being updated
      const restrictedFields = Object.keys(updateData).filter(key =>
        !allowedFieldsForPosted.includes(key) &&
        key !== 'status' && // Status changes handled separately
        updateData[key] !== undefined
      );

      if (restrictedFields.length > 0) {
        return res.status(403).json({
          error: 'Field editing restricted',
          message: `For POSTED jobs, only applicationDeadline and driveDate can be edited. Attempted to edit: ${restrictedFields.join(', ')}`,
          restrictedFields
        });
      }

      // Status changes not allowed via updateJob for POSTED jobs
      if (updateData.status && updateData.status !== 'POSTED') {
        return res.status(403).json({
          error: 'Status change not allowed',
          message: 'POSTED jobs cannot have their status changed through this endpoint.'
        });
      }
    }

    // Admin can edit all fields for IN_REVIEW jobs
    // For POSTED jobs, admin can only edit dates (handled above)

    // CRITICAL: Validate date relationship if both dates are being updated
    if (updateData.applicationDeadline !== undefined || updateData.driveDate !== undefined) {
      const oldDeadline = existingJob.applicationDeadline ? new Date(existingJob.applicationDeadline) : null;
      const oldDriveDate = existingJob.driveDate ? new Date(existingJob.driveDate) : null;

      const newDeadline = updateData.applicationDeadline ? new Date(updateData.applicationDeadline) : oldDeadline;
      const newDriveDate = updateData.driveDate != null && updateData.driveDate !== ''
        ? new Date(updateData.driveDate)
        : (updateData.hasOwnProperty('driveDate') && (updateData.driveDate === null || updateData.driveDate === ''))
          ? null
          : oldDriveDate;

      // LOG: Old vs new values
      logger.info('📅 [updateJob] Date update request:', {
        jobId,
        userId,
        userRole,
        oldApplicationDeadline: oldDeadline?.toISOString(),
        newApplicationDeadline: updateData.applicationDeadline ? new Date(updateData.applicationDeadline).toISOString() : 'unchanged',
        oldDriveDate: oldDriveDate?.toISOString(),
        newDriveDate: newDriveDate ? newDriveDate.toISOString() : 'null (TBD)',
        timestamp: new Date().toISOString(),
      });

      if (!existingJob.applicationDeadline && !updateData.applicationDeadline) {
        return res.status(400).json({
          error: 'Application deadline is required',
          message: 'Application deadline must be set for this job.'
        });
      }

      // Drive date is optional (TBD). When both are set, enforce driveDate > applicationDeadline.
      if (newDriveDate && newDeadline && newDriveDate <= newDeadline) {
        logger.warn('❌ [updateJob] Invalid date configuration rejected:', {
          jobId,
          applicationDeadline: newDeadline?.toISOString(),
          driveDate: newDriveDate?.toISOString(),
          difference: newDriveDate && newDeadline ? (newDriveDate - newDeadline) / (1000 * 60) + ' minutes' : 'N/A',
        });
        return res.status(400).json({
          error: 'Invalid date configuration',
          message: 'Drive date must be after the application deadline. Interviews happen after applications close.'
        });
      }
    }

    // Prepare update data: only pass Job model scalar fields to Prisma (explicit allowlist)
    // This avoids "Unknown argument" errors if client is stale and prevents invalid fields
    const jobUpdateAllowedFields = [
      'jobTitle', 'description', 'requirements', 'requiredSkills',
      'companyId', 'recruiterId', 'companyName', 'recruiterEmail', 'recruiterName', 'recruiterEmails',
      'salary', 'ctc', 'salaryRange',
      'location', 'companyLocation', 'driveDate', 'applicationDeadline',
      'jobType', 'workMode', 'experienceLevel', 'driveVenues', 'reportingTime',
      'qualification', 'specialization', 'yop', 'minCgpa', 'gapAllowed', 'gapYears', 'backlogs',
      'spocs', 'status', 'isActive', 'isPosted', 'applicationDeadlineMailSent',
      'requiresScreening', 'requiresTest',
      'targetSchools', 'targetCenters', 'targetBatches',
      'targetSchoolIds', 'targetCenterIds', 'targetBatchIds',
      'submittedAt', 'postedAt', 'postedBy', 'approvedAt', 'approvedBy',
      'rejectedAt', 'rejectedBy', 'rejectionReason', 'archivedAt', 'archivedBy',
    ];

    const finalUpdateData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (jobUpdateAllowedFields.includes(key) && value !== undefined) {
        finalUpdateData[key] = value;
      }
    }

    // Map frontend fields to database fields
    // Map responsibilities to description if description is not provided
    if (updateData.responsibilities && !finalUpdateData.description) {
      finalUpdateData.description = updateData.responsibilities;
    }

    // Map stipend to salary for internships
    if (updateData.stipend && updateData.jobType === 'Internship' && !finalUpdateData.salary) {
      finalUpdateData.salary = updateData.stipend;
    }

    // Persist Company Location on Job (job.companyLocation) when provided
    if (updateData.companyLocation !== undefined) {
      finalUpdateData.companyLocation = updateData.companyLocation || null;
    }

    // Handle company update if companyName is provided
    if (updateData.companyName && !updateData.companyId) {
      // Find or create company by name
      let company = await prisma.company.findFirst({
        where: { name: updateData.companyName },
      });

      if (!company) {
        company = await prisma.company.create({
          data: {
            name: updateData.companyName,
            website: updateData.website || null,
            location: updateData.companyLocation || null,
          },
        });
      } else {
        // Update company fields if provided (only valid Company model fields)
        const companyUpdateData = {};
        if (updateData.website !== undefined) {
          companyUpdateData.website = updateData.website || null;
        }
        if (updateData.companyLocation !== undefined) {
          companyUpdateData.location = updateData.companyLocation || null;
        }

        if (Object.keys(companyUpdateData).length > 0) {
          await prisma.company.update({
            where: { id: company.id },
            data: companyUpdateData,
          });
        }
      }

      finalUpdateData.companyId = company.id;
    } else if (updateData.companyId && (updateData.website !== undefined || updateData.companyLocation !== undefined)) {
      // If companyId is provided, update the company directly
      const companyUpdateData = {};
      if (updateData.website !== undefined) {
        companyUpdateData.website = updateData.website || null;
      }
      if (updateData.companyLocation !== undefined) {
        companyUpdateData.location = updateData.companyLocation || null;
      }

      if (Object.keys(companyUpdateData).length > 0) {
        await prisma.company.update({
          where: { id: updateData.companyId },
          data: companyUpdateData,
        });
      }
    }

    // Handle recruiterEmails if provided (store as JSON string)
    if (updateData.recruiterEmails && Array.isArray(updateData.recruiterEmails)) {
      finalUpdateData.recruiterEmails = JSON.stringify(updateData.recruiterEmails);
    }

    // Handle other JSON string fields
    if (updateData.driveVenues && Array.isArray(updateData.driveVenues)) {
      finalUpdateData.driveVenues = JSON.stringify(updateData.driveVenues);
    }
    if (updateData.targetSchools && Array.isArray(updateData.targetSchools)) {
      finalUpdateData.targetSchools = JSON.stringify(updateData.targetSchools);
    }
    if (updateData.targetCenters && Array.isArray(updateData.targetCenters)) {
      finalUpdateData.targetCenters = JSON.stringify(updateData.targetCenters);
    }
    if (updateData.targetBatches && Array.isArray(updateData.targetBatches)) {
      finalUpdateData.targetBatches = JSON.stringify(updateData.targetBatches);
    }
    // Handle skills - map to requiredSkills (skills is frontend field, requiredSkills is DB field)
    if (updateData.skills && Array.isArray(updateData.skills)) {
      finalUpdateData.requiredSkills = JSON.stringify(updateData.skills);
    } else if (updateData.requiredSkills && Array.isArray(updateData.requiredSkills)) {
      finalUpdateData.requiredSkills = JSON.stringify(updateData.requiredSkills);
    } else if (updateData.requiredSkills && typeof updateData.requiredSkills === 'string') {
      // Already a JSON string, use as-is
      finalUpdateData.requiredSkills = updateData.requiredSkills;
    }
    if (updateData.spocs && Array.isArray(updateData.spocs)) {
      finalUpdateData.spocs = JSON.stringify(updateData.spocs);
    }

    // Handle interviewRounds - convert to requirements text (interviewRounds is not a DB field)
    if (updateData.interviewRounds) {
      let interviewRoundsArray = [];
      if (Array.isArray(updateData.interviewRounds)) {
        interviewRoundsArray = updateData.interviewRounds;
      } else if (typeof updateData.interviewRounds === 'string') {
        try {
          interviewRoundsArray = JSON.parse(updateData.interviewRounds);
        } catch (e) {
          // If parsing fails, ignore
        }
      }

      if (interviewRoundsArray.length > 0) {
        const requirementsText = interviewRoundsArray
          .map(round => `${round.title || 'Round'}: ${round.detail || ''}`)
          .filter(r => r.trim().length > 0)
          .join('\n');

        // Merge with existing requirements if any
        const existingRequirements = finalUpdateData.requirements || updateData.requirements || '';
        finalUpdateData.requirements = existingRequirements
          ? (requirementsText ? `${existingRequirements}\n\n${requirementsText}` : existingRequirements)
          : requirementsText;
        finalUpdateData.interviewRounds = JSON.stringify(interviewRoundsArray);
      }
    }

    // Ensure dates are properly formatted as Date objects
    if (finalUpdateData.applicationDeadline) {
      finalUpdateData.applicationDeadline = new Date(finalUpdateData.applicationDeadline);
    }
    if (finalUpdateData.driveDate) {
      finalUpdateData.driveDate = new Date(finalUpdateData.driveDate);
    }

    // Handle recruiterId update - validate before updating
    // Only update recruiterId if it's explicitly provided and valid
    if (finalUpdateData.recruiterId !== undefined) {
      // If recruiterId is null or empty string, allow setting it to null
      if (!finalUpdateData.recruiterId || finalUpdateData.recruiterId === '') {
        finalUpdateData.recruiterId = null;
      } else {
        // Check if recruiterId is the same as existing - if so, preserve it without validation
        if (existingJob.recruiterId === finalUpdateData.recruiterId) {
          // Same as existing, no need to validate
        } else {
          // Validate that the recruiterId exists
          const recruiter = await prisma.recruiter.findUnique({
            where: { id: finalUpdateData.recruiterId },
          });

          if (!recruiter) {
            // If recruiterId doesn't exist, try to see if it's a userId that should map to a recruiter
            // But for now, if it's being changed and doesn't exist, preserve the existing one
            console.warn(`⚠️ [updateJob] Invalid recruiterId ${finalUpdateData.recruiterId}, preserving existing recruiterId ${existingJob.recruiterId}`);
            delete finalUpdateData.recruiterId; // Don't update - preserve existing
          }
        }
      }
    }

    // Validate companyId if it's being updated
    if (finalUpdateData.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: finalUpdateData.companyId },
      });

      if (!company) {
        return res.status(400).json({
          error: 'Invalid company',
          message: `Company with ID ${finalUpdateData.companyId} does not exist.`
        });
      }
    }

    // Update the job
    const job = await prisma.job.update({
      where: { id: jobId },
      data: applyAuditContext(finalUpdateData, userId, 'UPDATE'),
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

    // LOG: Update success
    logger.info('✅ [updateJob] Job updated successfully:', {
      jobId,
      userId,
      userRole,
      updatedFields: Object.keys(updateData),
      finalApplicationDeadline: job.applicationDeadline?.toISOString(),
      finalDriveDate: job.driveDate?.toISOString(),
      timestamp: new Date().toISOString(),
    });

    // Audit log
    await logAction(req, {
      actionType: 'Update Job',
      targetType: 'Job',
      targetId: jobId,
      details: `Updated job: ${job.jobTitle}`,
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
 * Allows posting jobs from IN_REVIEW status directly (no approval step required).
 * Updates job status to POSTED and makes it visible to students.
 */
export async function postJob(req, res) {
  try {
    const { jobId } = req.params;
    const { 
      selectedSchools, 
      selectedCenters, 
      selectedBatches,
      selectedBranches = [],
      visibilityMode = 'OPEN',
      targetStudents = [] // Array of { studentId, score, sourceMode }
    } = req.body;
    const adminId = req.userId;

    // First, check if job exists and is in a postable state
    const existingJob = await prisma.job.findUnique({
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

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Allow posting from IN_REVIEW or POSTED status
    // Rejected jobs cannot be posted
    if (existingJob.status === 'REJECTED') {
      return res.status(400).json({
        error: 'Job rejected',
        message: 'Rejected jobs cannot be posted. Please edit and resubmit the job for review.'
      });
    }

    // Only allow posting from IN_REVIEW or POSTED status
    if (existingJob.status !== 'IN_REVIEW' && existingJob.status !== 'in_review' && existingJob.status !== 'POSTED' && existingJob.status !== 'posted') {
      return res.status(400).json({
        error: 'Invalid job status',
        message: `Only jobs in IN_REVIEW or POSTED status can be posted. Current status: ${existingJob.status}`
      });
    }

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
    const targetBranches = parseTargeting(selectedBranches);

    // Convert arrays to JSON strings for database storage (schema expects String)
    const targetSchoolsJson = JSON.stringify(targetSchools);
    const targetCentersJson = JSON.stringify(targetCenters);
    const targetBatchesJson = JSON.stringify(targetBatches);
    const targetBranchesJson = JSON.stringify(targetBranches);

    // Update job status
    const job = await prisma.job.update({
      where: { id: jobId },
      data: applyAuditContext({
        status: 'POSTED',
        isPosted: true,
        targetSchools: targetSchoolsJson,
        targetCenters: targetCentersJson,
        targetBatches: targetBatchesJson,
        targetBranches: targetBranchesJson,
        visibilityMode,
        recommendationEnabled: visibilityMode === 'PRIORITY',
      }, adminId, 'POST'),
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

    // Handle JobTargets
    if (targetStudents && targetStudents.length > 0) {
      await prisma.jobTarget.deleteMany({ where: { jobId } });
      await prisma.jobTarget.createMany({
        data: targetStudents.map(target => ({
          jobId,
          studentId: target.studentId,
          score: target.score || 0,
          sourceMode: target.sourceMode || 'SYSTEM',
          selectedByAdmin: target.sourceMode === 'MANUAL',
          status: 'PENDING'
        }))
      });
    }

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

    // Audit log
    await logAction(req, {
      actionType: 'Post Job',
      targetType: 'Job',
      targetId: jobId,
      details: `Posted job: ${job.jobTitle}`,
    });

    // Notify students via Socket.IO
    try {
      const io = getIO();
      io.emit('job:posted', { 
        jobId: job.id, 
        jobTitle: job.jobTitle,
        companyName: job.company?.name || job.companyName
      });
    } catch (socketErr) {
      logger.error('Failed to emit job:posted socket event:', socketErr);
    }

    res.json({
      success: true,
      job,
      message: 'Job posted successfully. Job distribution and email notification dispatched to asynchronous background worker.',
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
 * Approve job (admin only)
 * Moves job from IN_REVIEW → POSTED directly
 * This combines approval and posting into a single action
 */
export async function approveJob(req, res) {
  try {
    const { jobId } = req.params;
    const { 
      selectedSchools, 
      selectedCenters, 
      selectedBatches,
      selectedBranches = [],
      visibilityMode = 'OPEN',
      targetStudents = []
    } = req.body; // Optional targeting for posting
    const adminId = req.userId;

    // Check if job exists and is in IN_REVIEW status
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        recruiter: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (existingJob.status !== 'IN_REVIEW') {
      return res.status(400).json({
        error: 'Invalid job status',
        message: `Job must be in IN_REVIEW status to be approved. Current status: ${existingJob.status}`
      });
    }

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

    const targetSchools = parseTargeting(selectedSchools) || parseTargeting(existingJob.targetSchools);
    const targetCenters = parseTargeting(selectedCenters) || parseTargeting(existingJob.targetCenters);
    const targetBatches = parseTargeting(selectedBatches) || parseTargeting(existingJob.targetBatches);
    const targetBranches = parseTargeting(selectedBranches) || parseTargeting(existingJob.targetBranches);

    // Convert arrays to JSON strings for database storage
    const targetSchoolsJson = JSON.stringify(targetSchools);
    const targetCentersJson = JSON.stringify(targetCenters);
    const targetBatchesJson = JSON.stringify(targetBatches);
    const targetBranchesJson = JSON.stringify(targetBranches);

    // STRICT RULE: Move directly from IN_REVIEW → POSTED
    const job = await prisma.job.update({
      where: { id: jobId },
      data: applyAuditContext({
        status: 'POSTED', // Direct transition: IN_REVIEW → POSTED
        isPosted: true,   // Visible to students
        isActive: true,   // Active job
        targetSchools: targetSchoolsJson,
        targetCenters: targetCentersJson,
        targetBatches: targetBatchesJson,
        targetBranches: targetBranchesJson,
        visibilityMode,
        recommendationEnabled: visibilityMode === 'PRIORITY',
      }, adminId, 'APPROVE'),
      include: {
        recruiter: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    // Handle JobTargets
    if (targetStudents && targetStudents.length > 0) {
      await prisma.jobTarget.deleteMany({ where: { jobId } });
      await prisma.jobTarget.createMany({
        data: targetStudents.map(target => ({
          jobId,
          studentId: target.studentId,
          score: target.score || 0,
          sourceMode: target.sourceMode || 'SYSTEM',
          selectedByAdmin: target.sourceMode === 'MANUAL',
          status: 'PENDING'
        }))
      });
    }

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
      logger.error(`Failed to add job ${job.id} to distribution queue:`, queueError);
    }

    // Send notification to recruiter
    if (job.recruiter?.user?.id) {
      try {
        await createNotification({
          userId: job.recruiter.user.id,
          title: 'Job Posting Approved and Posted',
          body: `Your job posting "${job.jobTitle}" has been approved and posted to students by the admin.`,
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
      }
    }

    // Send email notifications to matching students about new job
    try {
      let matchingStudents = [];

      if (visibilityMode === 'INVITE_ONLY') {
        // For Invite Only, only notify the explicitly selected students
        if (targetStudents && targetStudents.length > 0) {
          const invitedStudentIds = targetStudents.map(ts => ts.studentId);
          matchingStudents = await prisma.student.findMany({
            where: {
              id: { in: invitedStudentIds },
              user: { status: 'ACTIVE' }
            },
            include: {
              user: {
                select: { email: true, displayName: true }
              }
            }
          });
        }
      } else {
        // For Open or Priority, notify based on school/center/batch criteria
        const where = {
          user: { status: 'ACTIVE' },
        };

        if (targetSchools.length > 0 && !targetSchools.includes('ALL')) {
          where.school = { in: targetSchools };
        }
        if (targetCenters.length > 0 && !targetCenters.includes('ALL')) {
          where.center = { in: targetCenters };
        }
        if (targetBatches.length > 0 && !targetBatches.includes('ALL')) {
          where.batch = { in: targetBatches };
        }

        matchingStudents = await prisma.student.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                displayName: true,
              },
            },
          },
          take: 1000, // Increased limit for broader reach
        });
      }

      if (matchingStudents.length > 0) {
        // Customize notification based on visibility mode
        const notificationData = {
          ...job,
          visibilityMode,
          isInviteOnly: visibilityMode === 'INVITE_ONLY',
          isPriority: visibilityMode === 'PRIORITY'
        };
        
        const emailResults = await sendBulkJobNotifications(matchingStudents, notificationData);
        logger.info(
          `New job notifications sent to ${emailResults.successful} students for job ${job.id} (${emailResults.failed} failed) [Mode: ${visibilityMode}]`
        );
      }
    } catch (emailError) {
      logger.error(`Failed to send new job notifications to students for job ${job.id}:`, emailError);
    }

    // Audit log
    await logAction(req, {
      actionType: 'Approve Job',
      targetType: 'Job',
      targetId: jobId,
      details: `Approved and posted job: ${job.jobTitle}`,
    });

    // Notify students via Socket.IO
    try {
      const io = getIO();
      io.emit('job:posted', { 
        jobId: job.id, 
        jobTitle: job.jobTitle,
        companyName: job.company?.name || job.companyName
      });
    } catch (socketErr) {
      logger.error('Failed to emit job:posted socket event:', socketErr);
    }

    res.json({
      success: true,
      job,
      message: 'Job approved and posted successfully. Students have been notified.'
    });
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

    // Audit log
    await logAction(req, {
      actionType: 'Delete Job',
      targetType: 'Job',
      targetId: jobId,
      details: `Deleted job: ${job.jobTitle}`,
    });

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

    // Check if job exists and is in IN_REVIEW status
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (existingJob.status !== 'IN_REVIEW') {
      return res.status(400).json({
        error: 'Invalid job status',
        message: `Job must be in IN_REVIEW status to be rejected. Current status: ${existingJob.status}`
      });
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: applyAuditContext({
        status: 'REJECTED',
        isActive: false,
        isPosted: false, // NOT visible to students
        rejectionReason: rejectionReason || 'No reason provided',
      }, adminId, 'REJECT'),
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

    // Audit log
    await logAction(req, {
      actionType: 'Reject Job',
      targetType: 'Job',
      targetId: jobId,
      details: `Rejected job: ${job.jobTitle}. Reason: ${rejectionReason || 'No reason provided'}`,
    });

    res.json({ success: true, job });
  } catch (error) {
    console.error('Reject job error:', error);
    res.status(500).json({ error: 'Failed to reject job' });
  }
}

/**
 * Auto-archive expired jobs (admin)
 * NOTE: With the new workflow, we don't auto-archive. Jobs remain POSTED.
 * This function is kept for backward compatibility but may be deprecated.
 * Expired jobs stay POSTED; students can still see them but cannot apply (deadline check in application logic).
 */
export async function autoArchiveExpiredJobs(req, res) {
  try {
    // NOTE: Auto-archiving is not part of the new workflow
    // Jobs remain POSTED even after deadline passes
    // Application deadline is enforced in the applyToJob logic

    return res.json({
      success: true,
      successful: 0,
      archived: 0,
      message: 'Auto-archiving is disabled. Jobs remain POSTED. Application deadlines are enforced in application logic.',
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

/**
 * Update admin note for a job (post-drive note, visible in Applicants section)
 * PATCH /api/admin/jobs/:jobId/note - ADMIN only
 */
export async function updateJobAdminNote(req, res) {
  try {
    const { jobId } = req.params;
    const { note } = req.body ?? {};

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: applyAuditContext({ 
        adminNote: note != null ? String(note) : null 
      }, req.userId, 'UPDATE'),
    });

    return res.json({
      success: true,
      message: 'Admin note saved',
    });
  } catch (error) {
    logger.error('Update job admin note error:', error);
    return res.status(500).json({
      error: 'Failed to save admin note',
      message: error.message,
    });
  }
}

/**
 * Update recruiter note for a job (post–placement-drive note, visible in Company History).
 * Called when a recruiter adds/edits a note after an interview session for this job has ended.
 * Correctly maps to the job and the recruiter who owns it (job.recruiterId).
 * PATCH /api/jobs/:jobId/recruiter-note - RECRUITER only, must own the job
 */
export async function updateJobRecruiterNote(req, res) {
  try {
    const { jobId } = req.params;
    const { note } = req.body ?? {};
    const userId = req.user?.id;

    const recruiter = await prisma.recruiter.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!recruiter) {
      return res.status(403).json({ error: 'Only recruiters can update recruiter note' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, recruiterId: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.recruiterId !== recruiter.id) {
      return res.status(403).json({ error: 'You can only add a note to jobs you posted' });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: applyAuditContext({ 
        recruiterNote: note != null ? String(note) : null 
      }, userId, 'UPDATE'),
    });

    return res.json({
      success: true,
      message: 'Recruiter note saved',
    });
  } catch (error) {
    logger.error('Update job recruiter note error:', error);
    return res.status(500).json({
      error: 'Failed to save recruiter note',
      message: error.message,
    });
  }
}

/**
 * Analyze candidates for a job (admin only)
 * Returns a ranked list of students for the job's targeting
 */
export async function analyzeCandidates(req, res) {
  try {
    const { jobId } = req.params;
    const rankedCandidates = await rankCandidatesForJob(jobId);
    res.json(rankedCandidates);
  } catch (error) {
    logger.error('Analyze candidates error:', error);
    res.status(500).json({ error: 'Failed to analyze candidates' });
  }
}
