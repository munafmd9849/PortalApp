import prisma from '../config/database.js';

/**
 * Build student WHERE clause from query filters
 */
function buildStudentWhere(center, school, quarter, batch) {
    const studentWhere = {};
    if (center) {
        const centers = center.split(',').map((c) => c.trim()).filter(Boolean);
        if (centers.length) studentWhere.center = { in: centers, mode: 'insensitive' };
    }
    if (school) {
        const schools = school.split(',').map((s) => s.trim()).filter(Boolean);
        if (schools.length) studentWhere.school = { in: schools, mode: 'insensitive' };
    }
    const batches = [];
    if (batch) batches.push(...batch.split(',').map((b) => b.trim()).filter(Boolean));
    if (quarter) {
        const quarterToBatch = {
            'Q1 (PRE-PLACEMENT)': '25-29',
            'Q2 (PLACEMENT DRIVE)': '24-28',
            'Q3 (INTERNSHIP)': '23-27',
            'Q4 (FINAL PLACEMENTS)': '26-30',
        };
        quarter.split(',').forEach((q) => {
            const uppercaseQ = String(q).trim().toUpperCase();
            batches.push(quarterToBatch[uppercaseQ] || q);
        });
    }
    if (batches.length) {
        studentWhere.batch = { in: batches, mode: 'insensitive' };
    }
    return studentWhere;
}

/**
 * Get dashboard statistics (optimized: parallel queries, aggregates instead of findMany)
 * @route GET /api/admin/dashboard
 */
export const getDashboardStats = async (req, res) => {
    try {
        const { center, school, quarter, batch } = req.query;
        const studentWhere = buildStudentWhere(center, school, quarter, batch);
        const hasStudentFilter = Object.keys(studentWhere).length > 0;

        const placementStatusFilter = {
            OR: [
                { status: { in: ['SELECTED', 'ACCEPTED', 'OFFERED'], mode: 'insensitive' } },
                { interviewStatus: { in: ['SELECTED', 'ACCEPTED', 'OFFERED'], mode: 'insensitive' } },
            ],
        };

        // --- PHASE 1: Run all independent stats in parallel ---
        const [
            totalJobsPosted,
            activeRecruiters,
            activeStudents,
            pendingQueries,
            totalApplications,
            placedStudentsResult,
            queryVolumeGroup,
            topRecruitersWithJobs,
        ] = await Promise.all([
            prisma.job.count({
                where: {
                    OR: [{ isPosted: true }, { status: { equals: 'POSTED', mode: 'insensitive' } }],
                },
            }),
            prisma.recruiter.count({
                where: {
                    user: { status: { in: ['ACTIVE', 'PENDING'], mode: 'insensitive' } },
                },
            }),
            prisma.student.count({
                where: {
                    ...studentWhere,
                    user: { status: { equals: 'ACTIVE', mode: 'insensitive' } },
                },
            }),
            prisma.studentQuery.count({
                where: {
                    status: { in: ['OPEN', 'PENDING', 'UNRESOLVED'], mode: 'insensitive' },
                    ...(hasStudentFilter && { user: { student: studentWhere } }),
                },
            }),
            prisma.application.count({
                where: { student: studentWhere },
            }),
            prisma.application.groupBy({
                by: ['studentId'],
                where: {
                    student: studentWhere,
                    ...placementStatusFilter,
                },
                _count: { id: true },
            }).then((groups) => groups.length),
            prisma.studentQuery.groupBy({
                by: ['type'],
                where: hasStudentFilter ? { user: { student: studentWhere } } : {},
                _count: { id: true },
            }),
            prisma.recruiter.findMany({
                where: { jobs: { some: {} } },
                select: {
                    id: true,
                    companyName: true,
                    user: { select: { displayName: true, email: true } },
                    jobs: { select: { id: true } },
                },
            }),
        ]);

        const placedStudents = placedStudentsResult;

        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
        const queryVolumeData = queryVolumeGroup
            .filter((g) => g._count.id > 0)
            .map((g, index) => ({
                title: ((g.type || 'Other').charAt(0).toUpperCase() + (g.type || 'Other').slice(1)),
                value: g._count.id,
                color: colors[index % colors.length],
            }));

        // --- PHASE 2: Recruiter activity - single app count grouped by jobId ---
        const allJobIds = topRecruitersWithJobs.flatMap((r) => r.jobs.map((j) => j.id));
        const appCountByJobId = allJobIds.length
            ? await prisma.application.groupBy({
                  by: ['jobId'],
                  where: { jobId: { in: allJobIds } },
                  _count: { id: true },
              }).then((groups) => {
                  const map = {};
                  groups.forEach((g) => { map[g.jobId] = g._count.id; });
                  return map;
              })
            : {};

        const recruiterActivityList = topRecruitersWithJobs
            .map((r) => {
                const jobIds = r.jobs.map((j) => j.id);
                const applications = jobIds.reduce((sum, jid) => sum + (appCountByJobId[jid] || 0), 0);
                return {
                    name: r.user?.displayName || r.user?.email || r.companyName || 'Unknown',
                    jobsPosted: jobIds.length,
                    applications,
                };
            })
            .filter((r) => r.jobsPosted > 0)
            .sort((a, b) => b.jobsPosted - a.jobsPosted)
            .slice(0, 10);

        const recruiterActivity =
            recruiterActivityList.length > 0
                ? {
                      labels: recruiterActivityList.map((r) =>
                          r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
                      ),
                      datasets: [
                          {
                              label: 'Jobs Posted',
                              data: recruiterActivityList.map((r) => r.jobsPosted),
                              backgroundColor: 'rgba(34, 197, 94, 0.8)',
                              borderColor: 'rgb(34, 197, 94)',
                              borderWidth: 1,
                          },
                      ],
                  }
                : null;

        // --- PHASE 3: Placement trend - raw SQL for efficient month grouping ---
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

        const studentFilterConditions = [];
        const params = [sixMonthsAgo];
        let paramIdx = 1;
        if (studentWhere.center) {
            studentFilterConditions.push(`s.center = ANY($${++paramIdx}::text[])`);
            params.push(studentWhere.center.in);
        }
        if (studentWhere.school) {
            studentFilterConditions.push(`s.school = ANY($${++paramIdx}::text[])`);
            params.push(studentWhere.school.in);
        }
        if (studentWhere.batch) {
            studentFilterConditions.push(`s.batch = ANY($${++paramIdx}::text[])`);
            params.push(studentWhere.batch.in);
        }
        const studentFilterSql = studentFilterConditions.length
            ? `AND ${studentFilterConditions.join(' AND ')}`
            : '';

        const placementTrendRaw = await prisma.$queryRawUnsafe(`
            SELECT to_char(a."appliedDate", 'Mon YYYY') AS month, COUNT(*)::int AS cnt
            FROM applications a
            JOIN students s ON a."studentId" = s.id
            WHERE a."appliedDate" >= $1
              AND (UPPER(a.status) IN ('SELECTED','ACCEPTED','OFFERED')
                   OR UPPER(a."interviewStatus") IN ('SELECTED','ACCEPTED','OFFERED'))
              ${studentFilterSql}
            GROUP BY to_char(a."appliedDate", 'Mon YYYY'), date_trunc('month', a."appliedDate")
            ORDER BY date_trunc('month', a."appliedDate")
        `, ...params);

        const placementTrendMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            placementTrendMap[monthLabel] = 0;
        }
        (placementTrendRaw || []).forEach((row) => {
            const label = String(row.month || '').trim();
            if (placementTrendMap[label] !== undefined) {
                placementTrendMap[label] = Number(row.cnt) || 0;
            }
        });

        const placementTrend = {
            labels: Object.keys(placementTrendMap),
            datasets: [
                {
                    label: 'Placements',
                    data: Object.values(placementTrendMap),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                },
            ],
        };

        // --- PHASE 4: School performance - parallel count queries ---
        const schools = ['SOT', 'SOM', 'SOH'];
        const schoolPromises = schools.flatMap((schoolCode) => {
            const localStudentWhere = {
                ...studentWhere,
                school: { equals: schoolCode, mode: 'insensitive' },
            };
            const placedWhere = {
                student: localStudentWhere,
                ...placementStatusFilter,
            };
            return [
                prisma.student.count({ where: localStudentWhere }),
                prisma.application.count({ where: { student: localStudentWhere } }),
                prisma.application.count({
                    where: placedWhere,
                }),
                prisma.application.count({
                    where: {
                        student: localStudentWhere,
                        screeningStatus: { equals: 'TEST_SELECTED', mode: 'insensitive' },
                    },
                }),
            ];
        });

        const schoolResults = await Promise.all(schoolPromises);

        const schoolPerformance = {};
        schools.forEach((schoolCode, sIdx) => {
            const base = sIdx * 4;
            const totalSchStudents = schoolResults[base];
            const applied = schoolResults[base + 1];
            const placed = schoolResults[base + 2];
            const interviewEligible = schoolResults[base + 3];

            const placementRate = totalSchStudents > 0 ? Math.round((placed / totalSchStudents) * 100) : 0;
            const applicationRate = totalSchStudents > 0 ? Math.round((applied / totalSchStudents) * 100) : 0;
            const conversionRate = applied > 0 ? Math.round((placed / applied) * 100) : 0;
            const interviewRate = applied > 0 ? Math.round((interviewEligible / applied) * 100) : 0;

            schoolPerformance[schoolCode] = {
                performance: {
                    labels: ['Placement Rate', 'Application Rate', 'Conversion Rate', 'Interview Rate'],
                    values: [placementRate, applicationRate, conversionRate, interviewRate],
                },
                applications: {
                    labels: ['Total Students', 'Applied', 'Interview Eligible', 'Placed'],
                    values: [totalSchStudents, applied, interviewEligible, placed],
                },
            };
        });

        res.json({
            stats: {
                totalJobsPosted,
                activeRecruiters,
                activeStudents,
                pendingQueries,
                totalApplications,
                placedStudents,
            },
            chartData: {
                placementTrend,
                recruiterActivity,
                queryVolume: queryVolumeData,
                schoolPerformance,
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
};
