import prisma from '../config/database.js';

/**
 * Get dashboard statistics
 * @route GET /api/admin/dashboard
 */
export const getDashboardStats = async (req, res) => {
    try {
        const { center, school, quarter, batch } = req.query;

        // Build the WHERE clause for students based on filters
        const studentWhere = {};
        if (center) {
            const centers = center.split(',');
            studentWhere.center = { in: centers, mode: 'insensitive' };
        }
        if (school) {
            const schools = school.split(',');
            studentWhere.school = { in: schools, mode: 'insensitive' };
        }

        // Handle batch filtering (including mapping from quarters)
        const batches = [];
        if (batch) batches.push(...batch.split(','));
        if (quarter) {
            const quarterToBatch = {
                'Q1 (PRE-PLACEMENT)': '25-29',
                'Q2 (PLACEMENT DRIVE)': '24-28',
                'Q3 (INTERNSHIP)': '23-27',
                'Q4 (FINAL PLACEMENTS)': '26-30'
            };
            quarter.split(',').forEach(q => {
                const uppercaseQ = String(q).trim().toUpperCase();
                if (quarterToBatch[uppercaseQ]) batches.push(quarterToBatch[uppercaseQ]);
                else batches.push(q);
            });
        }
        if (batches.length > 0) {
            studentWhere.batch = { in: batches, mode: 'insensitive' };
        }

        // 1. Total Jobs Posted
        // All jobs that are actually posted
        const totalJobsPosted = await prisma.job.count({
            where: {
                OR: [
                    { isPosted: true },
                    { status: { equals: 'POSTED', mode: 'insensitive' } }
                ]
            }
        });

        // 2. Active Recruiters
        const activeRecruiters = await prisma.recruiter.count({
            where: {
                user: {
                    status: { in: ['ACTIVE', 'PENDING'], mode: 'insensitive' }
                }
            }
        });

        // 3. Active Students (Filtered)
        const activeStudents = await prisma.student.count({
            where: {
                ...studentWhere,
                user: {
                    status: { equals: 'ACTIVE', mode: 'insensitive' }
                }
            }
        });

        // 4. Pending Queries (Filtered) - StudentQuery links to User, filter via user.student
        const pendingQueriesWhere = {
            status: { in: ['OPEN', 'PENDING', 'UNRESOLVED'], mode: 'insensitive' }
        };
        if (Object.keys(studentWhere).length > 0) {
            pendingQueriesWhere.user = { student: studentWhere };
        }
        const pendingQueries = await prisma.studentQuery.count({
            where: pendingQueriesWhere
        });

        // 5. Total Applications (Filtered)
        const totalApplications = await prisma.application.count({
            where: {
                student: studentWhere // Apply same filters
            }
        });

        // 6. Placed Students (Filtered)
        // Count distinct students who have an application with a placement status
        const placedStudentsResult = await prisma.application.findMany({
            where: {
                student: studentWhere,
                OR: [
                    { status: { in: ['SELECTED', 'ACCEPTED', 'OFFERED'], mode: 'insensitive' } },
                    { interviewStatus: { in: ['SELECTED', 'ACCEPTED', 'OFFERED'], mode: 'insensitive' } }
                ]
            },
            select: {
                studentId: true
            },
            distinct: ['studentId']
        });
        const placedStudents = placedStudentsResult.length;

        // --- CHART DATA ---

        // 7. Placement Trend (Last 6 Months)
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

        // Get all placements in the last 6 months
        const recentPlacements = await prisma.application.findMany({
            where: {
                student: studentWhere,
                appliedDate: { gte: sixMonthsAgo },
                OR: [
                    { status: { in: ['SELECTED', 'ACCEPTED', 'OFFERED'], mode: 'insensitive' } },
                    { interviewStatus: { in: ['SELECTED', 'ACCEPTED', 'OFFERED'], mode: 'insensitive' } }
                ]
            },
            select: { appliedDate: true }
        });

        // Group by month manually (Prisma groupBy by month requires raw queries, doing it in memory is fine for a small subset)
        const placementTrendMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            placementTrendMap[monthLabel] = 0;
        }

        recentPlacements.forEach(app => {
            const monthLabel = app.appliedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (placementTrendMap[monthLabel] !== undefined) {
                placementTrendMap[monthLabel]++;
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

        // 8. Recruiter Activity (Top 10)
        // We get recruiter jobs, then fetch applications for those jobs
        const topRecruiters = await prisma.recruiter.findMany({
            include: {
                user: { select: { displayName: true, email: true } },
                jobs: { select: { id: true } }
            }
        });

        let recruiterActivityList = await Promise.all(topRecruiters.map(async (r) => {
            const jobIds = r.jobs.map(j => j.id);
            const appCount = await prisma.application.count({
                where: { jobId: { in: jobIds } }
            });

            return {
                name: r.user?.displayName || r.user?.email || r.companyName || 'Unknown',
                jobsPosted: jobIds.length,
                applications: appCount
            };
        }));

        recruiterActivityList = recruiterActivityList
            .filter(r => r.jobsPosted > 0)
            .sort((a, b) => b.jobsPosted - a.jobsPosted)
            .slice(0, 10);

        let recruiterActivity = null;
        if (recruiterActivityList.length > 0) {
            recruiterActivity = {
                labels: recruiterActivityList.map(r => r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name),
                datasets: [{
                    label: 'Jobs Posted',
                    data: recruiterActivityList.map(r => r.jobsPosted),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                }]
            };
        }

        // 9. Query Volume - StudentQuery links to User, filter via user.student
        const queryVolumeWhere = Object.keys(studentWhere).length > 0
            ? { user: { student: studentWhere } }
            : {};
        const queryTypesGroup = await prisma.studentQuery.groupBy({
            by: ['type'],
            where: queryVolumeWhere,
            _count: { id: true }
        });

        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
        const queryVolumeData = queryTypesGroup
            .filter(g => g._count.id > 0)
            .map((g, index) => ({
                title: (g.type || 'Other').charAt(0).toUpperCase() + (g.type || 'Other').slice(1),
                value: g._count.id,
                color: colors[index % colors.length]
            }));

        // 10. School Performance (SOT, SOM, SOH)
        const schools = ['SOT', 'SOM', 'SOH'];
        const schoolPerformance = {};

        for (const schoolCode of schools) {
            const localStudentWhere = { ...studentWhere, school: { equals: schoolCode, mode: 'insensitive' } };

            const totalSchStudents = await prisma.student.count({ where: localStudentWhere });

            const apps = await prisma.application.findMany({
                where: { student: localStudentWhere },
                select: { status: true, interviewStatus: true, screeningStatus: true }
            });

            const applied = apps.length;
            const placed = apps.filter(a => {
                const s1 = String(a.status || '').toUpperCase();
                const s2 = String(a.interviewStatus || '').toUpperCase();
                return ['SELECTED', 'ACCEPTED', 'OFFERED'].includes(s1) || ['SELECTED', 'ACCEPTED', 'OFFERED'].includes(s2);
            }).length;

            const interviewEligible = apps.filter(a => String(a.screeningStatus || '').toUpperCase() === 'TEST_SELECTED').length;

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
        }

        res.json({
            stats: {
                totalJobsPosted,
                activeRecruiters,
                activeStudents,
                pendingQueries,
                totalApplications,
                placedStudents
            },
            chartData: {
                placementTrend,
                recruiterActivity,
                queryVolume: queryVolumeData,
                schoolPerformance
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
};
