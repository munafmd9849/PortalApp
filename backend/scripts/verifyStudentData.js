/**
 * Verify Student Profile Data
 * 
 * Checks and displays profile data for all students.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const STUDENT_EMAILS = [
  'munafmd9849@gmail.com',
  'munafmd7407@gmail.com',
  'ssdqwert13@gmail.com',
  'temp87981@gmail.com',
  'temp20086@gmail.com',
  'temp83437@gmail.com',
];

async function verifyData() {
  console.log('🔍 Verifying student profile data...\n');

  for (const email of STUDENT_EMAILS) {
    const student = await prisma.student.findUnique({
      where: { email },
      include: {
        skills: true,
        education: true,
        projects: true,
        achievements: true,
        certifications: true,
      },
    });

    if (!student) {
      console.log(`❌ ${email}: Student not found\n`);
      continue;
    }

    console.log(`📋 ${student.fullName} (${email})`);
    console.log(`   Education: ${student.education.length} records`);
    console.log(`   Skills: ${student.skills.length} skills`);
    console.log(`   Projects: ${student.projects.length} projects`);
    console.log(`   Achievements: ${student.achievements.length} achievements`);
    console.log(`   Certifications: ${student.certifications.length} certifications`);
    console.log(`   Endorsements: ${student.endorsementsData ? 'Yes' : 'No'}`);
    console.log('');
  }

  // Summary
  const totalStudents = await prisma.student.count();
  const totalSkills = await prisma.skill.count();
  const totalEducation = await prisma.education.count();
  const totalProjects = await prisma.project.count();
  const totalAchievements = await prisma.achievement.count();
  const totalCertifications = await prisma.certification.count();

  console.log('='.repeat(60));
  console.log('📊 Database Summary:');
  console.log(`   Students: ${totalStudents}`);
  console.log(`   Skills: ${totalSkills}`);
  console.log(`   Education Records: ${totalEducation}`);
  console.log(`   Projects: ${totalProjects}`);
  console.log(`   Achievements: ${totalAchievements}`);
  console.log(`   Certifications: ${totalCertifications}`);
  console.log('='.repeat(60));
}

async function main() {
  try {
    await prisma.$connect();
    await verifyData();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
