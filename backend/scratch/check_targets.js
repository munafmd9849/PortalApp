
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTargets() {
  try {
    const targets = await prisma.jobTarget.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Recent Job Targets:', JSON.stringify(targets, null, 2));
    
    const undefinedTargets = await prisma.jobTarget.findMany({
      where: {
        studentId: {
          equals: undefined
        }
      }
    });
    console.log('Targets with undefined studentId (should be 0):', undefinedTargets.length);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkTargets();
