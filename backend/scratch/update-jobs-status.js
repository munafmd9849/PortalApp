import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateJobs() {
  try {
    console.log('🔄 Updating some jobs to IN_REVIEW status...');
    
    // Get some jobs that are POSTED
    const jobs = await prisma.job.findMany({
      take: 5
    });
    
    if (jobs.length === 0) {
      console.log('⚠️ No jobs found to update.');
      return;
    }
    
    // Update first 3 jobs to IN_REVIEW
    const jobIdsToUpdate = jobs.slice(0, 3).map(j => j.id);
    
    await prisma.job.updateMany({
      where: { id: { in: jobIdsToUpdate } },
      data: {
        status: 'IN_REVIEW',
        isPosted: false,
        isActive: false
      }
    });
    
    console.log(`✅ Updated ${jobIdsToUpdate.length} jobs to IN_REVIEW.`);
    
  } catch (error) {
    console.error('❌ Error updating jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateJobs();
