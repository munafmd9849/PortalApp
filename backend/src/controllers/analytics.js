/**
 * Analytics Controller (Super Admin Control Tower)
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Helper to build common filters
 */
const getCommonFilters = (query) => {
  const { centerId, schoolId, batchId } = query;
  const filters = {};
  if (centerId && centerId !== 'all') filters.centerId = centerId;
  if (schoolId && schoolId !== 'all') filters.schoolId = schoolId;
  if (batchId && batchId !== 'all') filters.batchId = batchId;
  return filters;
};

/**
 * Overview Metrics
 */
export async function getOverview(req, res) {
  try {
    const filters = getCommonFilters(req.query);
    
    const [totalStudents, eligibleStudents, placedStudents, activeJobs, totalRecruiters] = await Promise.all([
      prisma.student.count({ where: filters }),
      prisma.student.count({ where: { ...filters, user: { status: 'ACTIVE' } } }),
      prisma.application.count({
        where: {
          student: filters,
          OR: [
            { status: { in: ['SELECTED', 'OFFERED', 'JOINED', 'ACCEPTED'] } },
            { interviewStatus: 'SELECTED' }
          ]
        }
      }),
      prisma.job.count({ where: { status: 'POSTED', isActive: true } }),
      prisma.user.count({ where: { role: 'RECRUITER', status: 'ACTIVE' } })
    ]);

    res.json({
      totalStudents,
      eligibleStudents,
      placedStudents,
      placementPercentage: eligibleStudents > 0 ? (placedStudents / eligibleStudents) * 100 : 0,
      activeJobs,
      totalRecruiters
    });
  } catch (error) {
    logger.error('Analytics Overview Error:', error);
    res.status(500).json({ error: 'Failed to fetch overview metrics' });
  }
}

/**
 * Placement Funnel
 */
export async function getFunnel(req, res) {
  try {
    const filters = getCommonFilters(req.query);
    
    // Stages: Eligible -> Applied -> Shortlisted -> Interviewed -> Offered -> Joined
    const [eligible, shortlisted, interviewed, offered, joined] = await Promise.all([
      prisma.student.count({ where: { ...filters, user: { status: 'ACTIVE' } } }),
      prisma.application.count({ where: { student: filters, screeningStatus: 'SHORTLISTED' } }),
      prisma.application.count({ where: { student: filters, interviewStatus: { not: null } } }),
      prisma.application.count({ where: { student: filters, status: { in: ['OFFERED', 'SELECTED', 'ACCEPTED'] } } }),
      prisma.application.count({ where: { student: filters, status: 'JOINED' } })
    ]);

    // For "Applied", we need unique student count
    const uniqueAppliedCount = await prisma.application.groupBy({
      by: ['studentId'],
      where: { student: filters }
    }).then(res => res.length);

    res.json([
      { stage: 'Eligible', count: eligible, rate: 100 },
      { stage: 'Applied', count: uniqueAppliedCount, rate: eligible > 0 ? (uniqueAppliedCount / eligible) * 100 : 0 },
      { stage: 'Shortlisted', count: shortlisted, rate: uniqueAppliedCount > 0 ? (shortlisted / uniqueAppliedCount) * 100 : 0 },
      { stage: 'Interviewed', count: interviewed, rate: shortlisted > 0 ? (interviewed / shortlisted) * 100 : 0 },
      { stage: 'Offered', count: offered, rate: interviewed > 0 ? (offered / interviewed) * 100 : 0 },
      { stage: 'Joined', count: joined, rate: offered > 0 ? (joined / offered) * 100 : 0 }
    ]);
  } catch (error) {
    logger.error('Analytics Funnel Error:', error);
    res.status(500).json({ error: 'Failed to fetch funnel data' });
  }
}

/**
 * Batch Performance
 */
export async function getBatchPerformance(req, res) {
  try {
    const filters = getCommonFilters(req.query);
    
    const batches = await prisma.batch.findMany({ where: { status: 'ACTIVE' } });
    const performance = await Promise.all(batches.map(async (b) => {
      const total = await prisma.student.count({ where: { ...filters, batchId: b.id } });
      const placed = await prisma.application.count({
        where: {
          student: { ...filters, batchId: b.id },
          status: { in: ['SELECTED', 'OFFERED', 'JOINED', 'ACCEPTED'] }
        }
      });
      return {
        batch: b.year,
        placed,
        total,
        percentage: total > 0 ? (placed / total) * 100 : 0
      };
    }));

    res.json(performance);
  } catch (error) {
    logger.error('Batch Performance Error:', error);
    res.status(500).json({ error: 'Failed to fetch batch performance' });
  }
}

/**
 * School Performance
 */
export async function getSchoolPerformance(req, res) {
  try {
    const filters = getCommonFilters(req.query);
    const schools = await prisma.school.findMany({ where: { status: 'ACTIVE' } });
    
    const performance = await Promise.all(schools.map(async (s) => {
      const total = await prisma.student.count({ where: { ...filters, schoolId: s.id } });
      const placed = await prisma.application.count({
        where: {
          student: { ...filters, schoolId: s.id },
          status: { in: ['SELECTED', 'OFFERED', 'JOINED', 'ACCEPTED'] }
        }
      });
      return {
        school: s.name,
        placed,
        total,
        percentage: total > 0 ? (placed / total) * 100 : 0
      };
    }));

    res.json(performance);
  } catch (error) {
    logger.error('School Performance Error:', error);
    res.status(500).json({ error: 'Failed to fetch school performance' });
  }
}

/**
 * Center Performance
 */
export async function getCenterPerformance(req, res) {
  try {
    const filters = getCommonFilters(req.query);
    const centers = await prisma.center.findMany({ where: { status: 'ACTIVE' } });
    
    const performance = await Promise.all(centers.map(async (c) => {
      const total = await prisma.student.count({ where: { ...filters, centerId: c.id } });
      const placed = await prisma.application.count({
        where: {
          student: { ...filters, centerId: c.id },
          status: { in: ['SELECTED', 'OFFERED', 'JOINED', 'ACCEPTED'] }
        }
      });
      return {
        center: c.name,
        placed,
        total,
        percentage: total > 0 ? (placed / total) * 100 : 0
      };
    }));

    res.json(performance);
  } catch (error) {
    logger.error('Center Performance Error:', error);
    res.status(500).json({ error: 'Failed to fetch center performance' });
  }
}

/**
 * Unplaced Students (Action List)
 */
export async function getUnplacedStudents(req, res) {
  try {
    const filters = getCommonFilters(req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Find students with NO 'SELECTED/OFFERED/JOINED' applications
    const unplacedStudents = await prisma.student.findMany({
      where: {
        ...filters,
        user: { status: 'ACTIVE' },
        applications: {
          none: {
            status: { in: ['SELECTED', 'OFFERED', 'JOINED', 'ACCEPTED'] }
          }
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        school: true,
        batch: true,
        center: true,
        updatedAt: true,
        user: { select: { displayName: true, email: true } },
        _count: { select: { applications: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip
    });

    const total = await prisma.student.count({
      where: {
        ...filters,
        user: { status: 'ACTIVE' },
        applications: {
          none: {
            status: { in: ['SELECTED', 'OFFERED', 'JOINED', 'ACCEPTED'] }
          }
        }
      }
    });

    res.json({
      students: unplacedStudents.map(s => ({
        id: s.id,
        name: s.user?.displayName || s.fullName,
        email: s.user?.email || s.email,
        school: s.school,
        batch: s.batch,
        center: s.center,
        applicationsCount: s._count.applications,
        lastActivity: s.updatedAt
      })),
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Unplaced Students Error:', error);
    res.status(500).json({ error: 'Failed to fetch unplaced students' });
  }
}

/**
 * Company Performance
 */
export async function getCompanyPerformance(req, res) {
  try {
    const filters = getCommonFilters(req.query);
    
    // Group applications by companyName
    const companyStats = await prisma.application.groupBy({
      by: ['companyId'],
      where: { student: filters },
      _count: {
        _all: true,
        status: true
      }
    });

    // Detailed metrics per company
    const detailed = await Promise.all(companyStats.map(async (stat) => {
      if (!stat.companyId) return null;
      const company = await prisma.company.findUnique({ where: { id: stat.companyId }, select: { name: true } });
      if (!company) return null;

      const [shortlisted, offers] = await Promise.all([
        prisma.application.count({ where: { companyId: stat.companyId, student: filters, screeningStatus: 'SHORTLISTED' } }),
        prisma.application.count({ where: { companyId: stat.companyId, student: filters, status: { in: ['OFFERED', 'SELECTED', 'ACCEPTED', 'JOINED'] } } })
      ]);

      return {
        company: company.name,
        applications: stat._count._all,
        shortlisted,
        offers,
        roi: stat._count._all > 0 ? (offers / stat._count._all) * 100 : 0
      };
    }));

    res.json(detailed.filter(Boolean).sort((a, b) => b.offers - a.offers));
  } catch (error) {
    logger.error('Company Performance Error:', error);
    res.status(500).json({ error: 'Failed to fetch company performance' });
  }
}

/**
 * Admin Performance Analytics (Phase 2 & 3)
 */
export async function getAdminPerformanceAnalytics(req, res) {
  try {
    const { schoolId, centerId, batchId } = req.query;
    
    // 1. Fetch all admins
    const admins = await prisma.admin.findMany({
      include: {
        user: { select: { displayName: true, email: true, id: true } }
      }
    });

    // 2. Aggregate metrics per admin
    const performance = await Promise.all(admins.map(async (admin) => {
      // Parse scoping
      const allowedSchools = JSON.parse(admin.allowedSchoolIds || '[]');
      const allowedCenters = JSON.parse(admin.allowedCenterIds || '[]');
      const allowedBatches = JSON.parse(admin.allowedBatchIds || '[]');

      // Base scope filter
      const scopeFilter = {
        AND: [
          allowedSchools.length > 0 ? { schoolId: { in: allowedSchools } } : {},
          allowedCenters.length > 0 ? { centerId: { in: allowedCenters } } : {},
          allowedBatches.length > 0 ? { batchId: { in: allowedBatches } } : {},
          // Apply global filters
          schoolId && schoolId !== 'all' ? { schoolId } : {},
          centerId && centerId !== 'all' ? { centerId } : {},
          batchId && batchId !== 'all' ? { batchId } : {}
        ]
      };

      // Metrics
      const [assignedStudents, eligibleStudents, placedStudents, applicationsManaged, activeJobsHandled] = await Promise.all([
        // Total Assigned Students in scope
        prisma.student.count({ where: scopeFilter }),
        
        // Eligible (Active users in scope)
        prisma.student.count({ where: { ...scopeFilter, user: { status: 'ACTIVE' } } }),
        
        // Placed Students (Unique students in scope with success status)
        prisma.student.count({
          where: {
            ...scopeFilter,
            applications: {
              some: { status: { in: ['SELECTED', 'OFFERED', 'JOINED', 'ACCEPTED'] } }
            }
          }
        }),

        // Applications Managed (Total apps for students in scope)
        prisma.application.count({
          where: {
            student: scopeFilter
          }
        }),

        // Active Jobs Handled (Jobs posted/approved by this specific admin)
        prisma.job.count({
          where: {
            OR: [
              { postedBy: admin.user.id },
              { approvedBy: admin.user.id }
            ],
            // Respect global filters even for jobs
            AND: [
              schoolId && schoolId !== 'all' ? { targetSchoolIds: { contains: schoolId } } : {},
              centerId && centerId !== 'all' ? { targetCenterIds: { contains: centerId } } : {},
              batchId && batchId !== 'all' ? { targetBatchIds: { contains: batchId } } : {}
            ]
          }
        })
      ]);

      const placementRate = eligibleStudents > 0 ? (placedStudents / eligibleStudents) * 100 : 0;

      return {
        adminId: admin.id,
        name: admin.user?.displayName || 'Unknown Admin',
        assignedStudents,
        eligibleStudents,
        placedStudents,
        placementRate,
        applicationsManaged,
        activeJobsHandled
      };
    }));

    res.json(performance.sort((a, b) => b.placementRate - a.placementRate));
  } catch (error) {
    logger.error('Admin Performance Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch admin performance analytics' });
  }
}
