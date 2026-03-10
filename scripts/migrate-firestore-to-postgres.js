/**
 * Firestore to PostgreSQL Migration Script
 * Exports data from Firebase Firestore and imports into PostgreSQL
 * 
 * Usage:
 * 1. Set up Firebase Admin SDK credentials
 * 2. Run: node migrate-firestore-to-postgres.js
 */

import admin from 'firebase-admin';
import prisma from '../backend/src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin (requires serviceAccount.json)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!serviceAccount.project_id) {
  console.error('⚠️  Firebase service account not configured');
  console.log('Set FIREBASE_SERVICE_ACCOUNT environment variable with service account JSON');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Migrate users collection
 */
async function migrateUsers() {
  console.log('📦 Migrating users...');
  const usersSnapshot = await db.collection('users').get();
  let count = 0;

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    
    // Skip if user already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      console.log(`⏭️  User ${data.email} already exists, skipping`);
      continue;
    }

    // Create user (without password - users will need to reset)
    await prisma.user.create({
      data: {
        id: doc.id,
        email: data.email,
        passwordHash: '', // Users need to reset password
        role: data.role?.toUpperCase() || 'STUDENT',
        status: data.status?.toUpperCase() || 'PENDING',
        emailVerified: data.emailVerified || false,
        emailVerifiedAt: data.emailVerifiedAt?.toDate(),
        recruiterVerified: data.recruiterVerified || false,
        displayName: data.displayName,
        profilePhoto: data.profilePhoto,
        blockInfo: data.blockInfo || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      },
    });

    count++;
  }

  console.log(`✅ Migrated ${count} users`);
}

/**
 * Migrate students collection
 */
async function migrateStudents() {
  console.log('📦 Migrating students...');
  const studentsSnapshot = await db.collection('students').get();
  let count = 0;

  for (const doc of studentsSnapshot.docs) {
    const data = doc.data();
    const userId = data.uid || doc.id;

    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log(`⚠️  User ${userId} not found, skipping student`);
      continue;
    }

    // Create student
    await prisma.student.create({
      data: {
        id: doc.id,
        userId,
        fullName: data.fullName || '',
        email: data.email || user.email,
        phone: data.phone || '',
        enrollmentId: data.enrollmentId || '',
        cgpa: data.cgpa || null,
        batch: data.batch || '',
        center: data.center || '',
        school: data.school || '',
        bio: data.bio,
        headline: data.headline || data.Headline,
        city: data.city,
        stateRegion: data.stateRegion || data.state,
        jobFlexibility: data.jobFlexibility,
        linkedin: data.linkedin,
        githubUrl: data.githubUrl || data.github,
        youtubeUrl: data.youtubeUrl || data.youtube,
        leetcode: data.leetcode,
        codeforces: data.codeforces,
        gfg: data.gfg,
        hackerrank: data.hackerrank,
        resumeUrl: data.resumeUrl,
        resumeFileName: data.resumeFileName,
        resumeUploadedAt: data.resumeUploadedAt?.toDate(),
        statsApplied: data.stats?.applied || 0,
        statsShortlisted: data.stats?.shortlisted || 0,
        statsInterviewed: data.stats?.interviewed || 0,
        statsOffers: data.stats?.offers || 0,
        emailNotificationsDisabled: data.emailNotificationsDisabled || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      },
    });

    count++;
  }

  console.log(`✅ Migrated ${count} students`);
}

/**
 * Migrate jobs collection
 */
async function migrateJobs() {
  console.log('📦 Migrating jobs...');
  const jobsSnapshot = await db.collection('jobs').get();
  let count = 0;

  for (const doc of jobsSnapshot.docs) {
    const data = doc.data();

    // Find or create company
    let companyId = null;
    if (data.companyName || (typeof data.company === 'string' ? data.company : data.company?.name)) {
      const companyName = typeof data.company === 'string' ? data.company : (data.company?.name || data.companyName);
      const company = await prisma.company.upsert({
        where: { name: companyName },
        update: {},
        create: {
          name: companyName,
          location: data.companyLocation,
        },
      });
      companyId = company.id;
    } else if (data.companyId) {
      companyId = data.companyId;
    }

    // Find recruiter
    let recruiterId = null;
    if (data.recruiterId) {
      const recruiter = await prisma.recruiter.findFirst({
        where: { userId: data.recruiterId },
      });
      recruiterId = recruiter?.id;
    }

    // Create job
    await prisma.job.create({
      data: {
        id: doc.id,
        jobTitle: data.jobTitle || data.title,
        description: data.description || '',
        requirements: data.requirements || [],
        requiredSkills: data.requiredSkills || [],
        companyId,
        recruiterId,
        companyName: data.companyName || (typeof data.company === 'string' ? data.company : data.company?.name),
        salary: data.salary?.toString(),
        ctc: data.ctc,
        salaryRange: data.salaryRange,
        location: data.location,
        companyLocation: data.companyLocation,
        driveDate: data.driveDate?.toDate(),
        applicationDeadline: data.applicationDeadline?.toDate(),
        jobType: data.jobType,
        experienceLevel: data.experienceLevel,
        driveVenues: data.driveVenues || [],
        spocs: data.spocs || [],
        status: (data.status?.toUpperCase() || 'DRAFT'),
        isActive: data.isActive || data.isPosted || false,
        isPosted: data.isPosted || data.posted || false,
        targetSchools: data.targetSchools || [],
        targetCenters: data.targetCenters || [],
        targetBatches: data.targetBatches || [],
        submittedAt: data.submittedAt?.toDate(),
        postedAt: data.postedAt?.toDate(),
        postedBy: data.postedBy,
        approvedAt: data.approvedAt?.toDate(),
        approvedBy: data.approvedBy,
        rejectedAt: data.rejectedAt?.toDate(),
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
        archivedAt: data.archivedAt?.toDate(),
        archivedBy: data.archivedBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      },
    });

    count++;
  }

  console.log(`✅ Migrated ${count} jobs`);
}

/**
 * Migrate applications collection
 */
async function migrateApplications() {
  console.log('📦 Migrating applications...');
  const appsSnapshot = await db.collection('applications').get();
  let count = 0;

  for (const doc of appsSnapshot.docs) {
    const data = doc.data();

    // Get student ID
    const student = await prisma.student.findFirst({
      where: { userId: data.studentId },
    });

    if (!student) {
      console.log(`⚠️  Student ${data.studentId} not found, skipping application`);
      continue;
    }

    // Create application
    await prisma.application.create({
      data: {
        id: doc.id,
        studentId: student.id,
        jobId: data.jobId,
        companyId: data.companyId,
        status: (data.status?.toUpperCase() || 'APPLIED'),
        appliedDate: data.appliedDate ? new Date(data.appliedDate) : (data.createdAt?.toDate() || new Date()),
        interviewDate: data.interviewDate?.toDate(),
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      },
    }).catch((error) => {
      if (error.code === 'P2002') {
        console.log(`⏭️  Application already exists: ${doc.id}`);
      } else {
        throw error;
      }
    });

    count++;
  }

  console.log(`✅ Migrated ${count} applications`);
}

/**
 * Migrate notifications collection
 */
async function migrateNotifications() {
  console.log('📦 Migrating notifications...');
  const notifsSnapshot = await db.collection('notifications').get();
  let count = 0;

  for (const doc of notifsSnapshot.docs) {
    const data = doc.data();

    await prisma.notification.create({
      data: {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        body: data.body,
        data: data.data || {},
        isRead: data.isRead || false,
        readAt: data.readAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
      },
    }).catch(() => {
      // Skip duplicates
    });

    count++;
  }

  console.log(`✅ Migrated ${count} notifications`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Firestore to PostgreSQL migration...\n');

  try {
    await migrateUsers();
    await migrateStudents();
    await migrateJobs();
    await migrateApplications();
    await migrateNotifications();

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run migration
migrate();
