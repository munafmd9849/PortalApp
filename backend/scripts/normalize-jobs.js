/**
 * Data Normalization Script
 * Resolves string-based company and recruiter data into entity relations.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function normalize() {
  console.log('🚀 Starting Data Normalization...');

  // 1. Normalize Companies
  const jobsWithoutCompany = await prisma.job.findMany({
    where: { companyId: null, companyName: { not: null } }
  });

  console.log(`Found ${jobsWithoutCompany.length} jobs without companyId.`);

  for (const job of jobsWithoutCompany) {
    const name = job.companyName.trim();
    if (!name) continue;

    const company = await prisma.company.upsert({
      where: { name },
      update: {},
      create: { name }
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { companyId: company.id }
    });
    console.log(`Linked job "${job.jobTitle}" to company "${name}"`);
  }

  // 2. Normalize Recruiters
  const jobsWithoutRecruiter = await prisma.job.findMany({
    where: { recruiterId: null, recruiterEmail: { not: null } }
  });

  console.log(`Found ${jobsWithoutRecruiter.length} jobs without recruiterId.`);

  for (const job of jobsWithoutRecruiter) {
    const email = job.recruiterEmail.trim();
    if (!email) continue;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { recruiter: true }
    });

    if (user && user.recruiter) {
      await prisma.job.update({
        where: { id: job.id },
        data: { recruiterId: user.recruiter.id }
      });
      console.log(`Linked job "${job.jobTitle}" to recruiter "${email}"`);
    } else {
      console.log(`Skipping recruiter for "${email}" - profile not found.`);
    }
  }

  console.log('✅ Normalization complete.');
}

normalize()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
