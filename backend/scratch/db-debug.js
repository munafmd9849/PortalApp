import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.job.count({
    where: { status: 'IN_REVIEW' }
  });
  console.log(`Total IN_REVIEW jobs in DB: ${count}`);

  const jobs = await prisma.job.findMany({
    where: { status: 'IN_REVIEW' },
    select: { id: true, jobTitle: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('Latest 10 IN_REVIEW jobs:');
  jobs.forEach(j => console.log(`- ${j.jobTitle} (${j.id}) created at ${j.createdAt}`));
}

main().finally(() => prisma.$disconnect());
