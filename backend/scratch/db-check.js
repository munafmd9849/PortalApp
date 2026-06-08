import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkConnection() {
  try {
    console.log('🔄 Checking database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Database is ACTIVE and connected.');
    console.log('Result:', result);
    
    // Check if models are accessible
    const studentCount = await prisma.student.count();
    console.log(`📊 Student records found: ${studentCount}`);
    
    const jobCount = await prisma.job.count();
    console.log(`📊 Job records found: ${jobCount}`);
    
  } catch (error) {
    console.error('❌ Database connection FAILED:');
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();
