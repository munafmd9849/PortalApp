
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma connection and schema...');
    const students = await prisma.student.findMany({ take: 1 });
    console.log('✅ Student query success. Sample:', JSON.stringify(students[0] || 'No students', null, 2));
    
    const jobs = await prisma.job.findMany({ take: 1 });
    console.log('✅ Job query success. Sample:', JSON.stringify(jobs[0] || 'No jobs', null, 2));
    
    console.log('✅ Schema seems synchronized.');
  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
    if (err.message.includes('column')) {
      console.error('Possible missing column in DB. Run: npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
