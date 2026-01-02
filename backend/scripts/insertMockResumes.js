/**
 * Script to insert mock resumes into the database
 * Usage: node backend/scripts/insertMockResumes.js [studentEmail]
 * If studentEmail is not provided, it will use the first student found
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const mockResumes = [
  {
    title: 'Software Engineer Resume',
    fileName: 'resume_software_engineer.pdf',
    fileUrl: 'https://example.com/resumes/resume_software_engineer.pdf',
    fileSize: 245678, // bytes (~240 KB)
    publicId: 'resumes/mock_resume_1',
    isDefault: true, // First resume is default
  },
  {
    title: 'Full Stack Developer Resume',
    fileName: 'resume_fullstack_dev.pdf',
    fileUrl: 'https://example.com/resumes/resume_fullstack_dev.pdf',
    fileSize: 312456, // bytes (~305 KB)
    publicId: 'resumes/mock_resume_2',
    isDefault: false,
  },
  {
    title: 'Frontend Developer Resume',
    fileName: 'resume_frontend_dev.pdf',
    fileUrl: 'https://example.com/resumes/resume_frontend_dev.pdf',
    fileSize: 198234, // bytes (~193 KB)
    publicId: 'resumes/mock_resume_3',
    isDefault: false,
  },
];

async function main() {
  console.log('🚀 Starting mock resume insertion...');
  const targetStudentEmail = process.argv[2] || 'charansai07136@gmail.com';

  // Find student by email
  let student;
  if (targetStudentEmail.includes('@')) {
    student = await prisma.student.findUnique({
      where: { email: targetStudentEmail },
      select: { id: true, userId: true, fullName: true, email: true },
    });
  } else {
    // Try to find by userId
    student = await prisma.student.findUnique({
      where: { userId: targetStudentEmail },
      select: { id: true, userId: true, fullName: true, email: true },
    });
  }

  if (!student) {
    console.error('❌ No student found. Please provide a valid student email or userId.');
    console.log('   Example: node backend/scripts/insertMockResumes.js charansai07136@gmail.com');
    return;
  }

  console.log(`✅ Found student: ${student.fullName} (${student.email})`);
  console.log(`   Student ID: ${student.id}`);
  console.log(`   User ID: ${student.userId}`);

  const studentId = student.id;
  const userId = student.userId;

  // Check for existing resumes
  const existingResumes = await prisma.studentResumeFile.findMany({
    where: { studentId },
    select: { id: true, title: true, fileName: true },
  });

  console.log(`\n📄 Existing resumes: ${existingResumes.length}`);
  if (existingResumes.length > 0) {
    console.log('   Existing resume titles:');
    existingResumes.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title || r.fileName}`);
    });
  }

  // Insert mock resumes
  let insertedCount = 0;
  let skippedCount = 0;

  for (const resume of mockResumes) {
    try {
      // Check if resume with same title already exists
      const existing = await prisma.studentResumeFile.findFirst({
        where: {
          studentId,
          title: resume.title,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping "${resume.title}" - already exists`);
        skippedCount++;
        continue;
      }

      // If this is the default resume, unset all other defaults first
      if (resume.isDefault) {
        await prisma.studentResumeFile.updateMany({
          where: { studentId },
          data: { isDefault: false },
        });
      }

      // Insert resume
      const created = await prisma.studentResumeFile.create({
        data: {
          studentId,
          userId,
          title: resume.title,
          fileName: resume.fileName,
          fileUrl: resume.fileUrl,
          fileSize: resume.fileSize,
          publicId: resume.publicId,
          isDefault: resume.isDefault,
          uploadedAt: new Date(),
        },
      });

      console.log(`✅ Inserted resume: "${resume.title}" (ID: ${created.id})`);
      insertedCount++;
    } catch (error) {
      console.error(`❌ Error inserting resume "${resume.title}":`, error.message);
    }
  }

  // Summary
  console.log('\n✨ Mock resume insertion completed!');
  console.log(`   ✅ Inserted: ${insertedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   📄 Total resumes: ${existingResumes.length + insertedCount}`);

  // Verify
  const allResumes = await prisma.studentResumeFile.findMany({
    where: { studentId },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, title: true, fileName: true, isDefault: true, uploadedAt: true },
  });

  if (allResumes.length > 0) {
    console.log('\n📋 All resumes for this student:');
    allResumes.forEach((r, i) => {
      const defaultBadge = r.isDefault ? ' [DEFAULT]' : '';
      console.log(`   ${i + 1}. ${r.title || r.fileName}${defaultBadge}`);
      console.log(`      Uploaded: ${r.uploadedAt.toLocaleString()}`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Mock resume insertion failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

