import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const assessments = await prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('--- RECENT ASSESSMENTS ---');
    console.log(JSON.stringify(assessments, null, 2));
    
    const count = await prisma.assessment.count();
    console.log('Total Assessments:', count);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
