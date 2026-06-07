
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing Analytics Overview...');
    const filters = {}; // Test with no filters
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
    console.log('Overview OK');

    console.log('Testing Funnel...');
    const uniqueAppliedCount = await prisma.application.groupBy({
      by: ['studentId'],
      where: { student: filters }
    }).then(res => res.length);
    console.log('Funnel OK');

    console.log('Testing Unplaced Students...');
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
      take: 5
    });
    console.log('Unplaced OK');

  } catch (e) {
    console.error('DIAGNOSTIC ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
