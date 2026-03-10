/**
 * Script to add test students and applications for screening/QA testing
 * Creates students with applications to all jobs with various screening statuses
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test@123'; // Default password for test students

// Test students data with various screening statuses
const testStudents = [
  {
    fullName: 'Rajesh Kumar',
    email: 'rajesh.kumar.test@student.pwioi.edu.in',
    phone: '9876543210',
    enrollmentId: 'ENR2024001',
    batch: '25-29',
    center: 'BANGALORE',
    school: 'SOM',
    screeningStatus: 'APPLIED', // Not yet screened
  },
  {
    fullName: 'Priya Sharma',
    email: 'priya.sharma.test@student.pwioi.edu.in',
    phone: '9876543211',
    enrollmentId: 'ENR2024002',
    batch: '24-28',
    center: 'NOIDA',
    school: 'SOT',
    screeningStatus: 'RESUME_SELECTED', // Passed resume screening
  },
  {
    fullName: 'Amit Patel',
    email: 'amit.patel.test@student.pwioi.edu.in',
    phone: '9876543212',
    enrollmentId: 'ENR2024003',
    batch: '25-29',
    center: 'PUNE',
    school: 'SOH',
    screeningStatus: 'TEST_SELECTED', // Passed test - eligible for interview
  },
  {
    fullName: 'Sneha Reddy',
    email: 'sneha.reddy.test@student.pwioi.edu.in',
    phone: '9876543213',
    enrollmentId: 'ENR2024004',
    batch: '24-28',
    center: 'HYDERABAD',
    school: 'SOM',
    screeningStatus: 'TEST_SELECTED', // Passed test - eligible for interview
  },
  {
    fullName: 'Vikram Singh',
    email: 'vikram.singh.test@student.pwioi.edu.in',
    phone: '9876543214',
    enrollmentId: 'ENR2024005',
    batch: '25-29',
    center: 'BANGALORE',
    school: 'SOT',
    screeningStatus: 'RESUME_REJECTED', // Rejected at resume stage
  },
  {
    fullName: 'Anjali Mehta',
    email: 'anjali.mehta.test@student.pwioi.edu.in',
    phone: '9876543215',
    enrollmentId: 'ENR2024006',
    batch: '24-28',
    center: 'NOIDA',
    school: 'SOH',
    screeningStatus: 'TEST_REJECTED', // Rejected at test stage
  },
  {
    fullName: 'Rohit Gupta',
    email: 'rohit.gupta.test@student.pwioi.edu.in',
    phone: '9876543216',
    enrollmentId: 'ENR2024007',
    batch: '25-29',
    center: 'PUNE',
    school: 'SOM',
    screeningStatus: 'TEST_SELECTED', // Passed test - eligible for interview
  },
  {
    fullName: 'Divya Nair',
    email: 'divya.nair.test@student.pwioi.edu.in',
    phone: '9876543217',
    enrollmentId: 'ENR2024008',
    batch: '24-28',
    center: 'HYDERABAD',
    school: 'SOT',
    screeningStatus: 'APPLIED', // Not yet screened
  },
];

async function createTestStudent(studentData) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: studentData.email },
    });

    if (existingUser) {
      console.log(`⚠️  Student with email ${studentData.email} already exists, skipping...`);
      return existingUser.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: studentData.email,
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        displayName: studentData.fullName,
        student: {
          create: {
            fullName: studentData.fullName,
            email: studentData.email,
            phone: studentData.phone,
            enrollmentId: studentData.enrollmentId,
            batch: studentData.batch,
            center: studentData.center,
            school: studentData.school,
            cgpa: 8.5,
            backlogs: '0',
          },
        },
      },
      include: {
        student: true,
      },
    });

    console.log(`✅ Created student: ${studentData.fullName} (${studentData.email})`);
    return user.student.id;
  } catch (error) {
    console.error(`❌ Error creating student ${studentData.email}:`, error.message);
    throw error;
  }
}

async function createApplicationForJob(studentId, jobId, screeningStatus) {
  try {
    // Try to check if application already exists (skip if quota exceeded)
    let existingApp = null;
    try {
      existingApp = await prisma.application.findUnique({
        where: {
          studentId_jobId: {
            studentId,
            jobId,
          },
        },
      });
    } catch (error) {
      // If quota exceeded, continue anyway and try to create
      if (!error.message.includes('quota')) {
        throw error;
      }
    }

    if (existingApp) {
      // Update screening status if needed
      if (existingApp.screeningStatus !== screeningStatus) {
        await prisma.application.update({
          where: { id: existingApp.id },
          data: { screeningStatus },
        });
        console.log(`  ↻ Updated application for job ${jobId.substring(0, 8)}... with status: ${screeningStatus}`);
      } else {
        console.log(`  ⏭️  Application already exists with status: ${screeningStatus}`);
      }
      return;
    }

    // Try to get job to get companyId (skip if quota exceeded)
    let companyId = null;
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { companyId: true },
      });
      companyId = job?.companyId || null;
    } catch (error) {
      // If quota exceeded, continue without companyId
      if (!error.message.includes('quota')) {
        throw error;
      }
    }

    // Create application
    await prisma.application.create({
      data: {
        studentId,
        jobId,
        companyId,
        status: 'APPLIED',
        screeningStatus,
        appliedDate: new Date(),
      },
    });

    console.log(`  ✅ Created application with status: ${screeningStatus}`);
  } catch (error) {
    if (error.message.includes('quota')) {
      console.error(`  ⚠️  Database quota exceeded, skipping application for job ${jobId.substring(0, 8)}...`);
    } else {
      console.error(`  ❌ Error creating application:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting test students and applications creation...\n');

    // Get job IDs from command line arguments or try to fetch from database
    const jobIdsFromArgs = process.argv.slice(2);
    let jobs = [];

    if (jobIdsFromArgs.length > 0) {
      // Use job IDs provided as command line arguments
      console.log(`📋 Using ${jobIdsFromArgs.length} job IDs from command line arguments\n`);
      for (const jobId of jobIdsFromArgs) {
        try {
          const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
              id: true,
              jobTitle: true,
              companyName: true,
              status: true,
            },
          });
          if (job) {
            jobs.push(job);
          } else {
            console.log(`⚠️  Job ID ${jobId} not found, skipping...`);
          }
        } catch (error) {
          // If quota exceeded, still add job ID to proceed without fetching details
          if (error.message.includes('quota')) {
            console.log(`⚠️  Database quota exceeded, using job ID ${jobId} without fetching details...`);
            jobs.push({ id: jobId, jobTitle: 'Unknown', companyName: 'Unknown', status: 'UNKNOWN' });
          } else {
            console.log(`⚠️  Error fetching job ${jobId}: ${error.message}`);
          }
        }
      }
    } else {
      // Try to get jobs from database (may fail due to quota)
      try {
        const fetchedJobs = await prisma.job.findMany({
          where: {
            OR: [
              { status: 'POSTED' },
              { status: 'APPROVED' },
            ],
          },
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            status: true,
          },
          take: 20, // Limit to avoid quota issues
        });

        if (fetchedJobs.length > 0) {
          jobs = fetchedJobs;
          console.log(`📋 Found ${jobs.length} POSTED/APPROVED jobs\n`);
        } else {
          // Try to get any jobs
          const allJobs = await prisma.job.findMany({
            select: {
              id: true,
              jobTitle: true,
              companyName: true,
              status: true,
            },
            take: 20,
          });
          jobs = allJobs;
          console.log(`📋 Found ${jobs.length} jobs total\n`);
        }
      } catch (error) {
        console.error('❌ Could not fetch jobs from database:', error.message);
        console.log('\n💡 Usage: node scripts/addTestStudentsForScreening.js <jobId1> <jobId2> ...');
        console.log('   Example: node scripts/addTestStudentsForScreening.js 48eaae52-967b-4305-98c8-e5d59d55d85d f7a8838f-03c2-430d-9449-22fbf5a176a8\n');
        throw new Error('Please provide job IDs as command line arguments when database quota is exceeded');
      }
    }

    if (jobs.length === 0) {
      throw new Error('No jobs found. Please provide job IDs as command line arguments.');
    }

    // Create test students
    console.log('👥 Creating test students...\n');
    const studentIds = [];
    for (const studentData of testStudents) {
      try {
        const studentId = await createTestStudent(studentData);
        if (studentId) {
          studentIds.push({ id: studentId, screeningStatus: studentData.screeningStatus });
        }
      } catch (error) {
        console.error(`Failed to create student ${studentData.email}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${studentIds.length} students\n`);

    // Create applications for each job
    console.log('📝 Creating applications...\n');
    let totalApplications = 0;

    for (const job of jobs) {
      if (job.jobTitle !== 'Unknown') {
        console.log(`\n📌 Job: ${job.jobTitle} at ${job.companyName || 'N/A'} [${job.status}]`);
      } else {
        console.log(`\n📌 Job ID: ${job.id}`);
      }
      console.log(`   Processing applications...\n`);

      for (const student of studentIds) {
        await createApplicationForJob(student.id, job.id, student.screeningStatus);
        totalApplications++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Summary:');
    console.log(`   📊 Jobs processed: ${jobs.length}`);
    console.log(`   👥 Test students: ${studentIds.length}`);
    console.log(`   📝 Total applications created/updated: ${totalApplications}`);
    console.log(`   🔑 Default password for all test students: ${DEFAULT_PASSWORD}`);
    console.log('='.repeat(60));
    console.log('\n✅ Test data creation completed!\n');

    // Print test student credentials
    console.log('📧 Test Student Credentials:');
    console.log('─'.repeat(60));
    testStudents.forEach((student) => {
      console.log(`   Email: ${student.email}`);
      console.log(`   Password: ${DEFAULT_PASSWORD}`);
      console.log(`   Status: ${student.screeningStatus}`);
      console.log('');
    });
    
    console.log('\n💡 Tip: If database quota is exceeded, provide job IDs as arguments:');
    console.log('   node scripts/addTestStudentsForScreening.js <jobId1> <jobId2> ...');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
