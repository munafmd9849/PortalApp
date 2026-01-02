/**
 * Test script to verify student profile API returns all data correctly
 * Usage: node backend/scripts/testProfileAPI.js <email>
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();
const prisma = new PrismaClient();

async function testProfileAPI(email) {
  try {
    console.log('🧪 Testing Profile API Response\n');
    
    // Find student
    const student = await prisma.student.findUnique({
      where: { email },
      include: {
        user: {
          select: {
            id: true,
            profilePhoto: true,
          },
        },
        skills: true,
        education: { orderBy: { endYear: 'desc' } },
        experiences: { orderBy: { start: 'desc' } },
        projects: { orderBy: { createdAt: 'desc' } },
        achievements: { orderBy: { createdAt: 'desc' } },
        certifications: { orderBy: { issuedDate: 'desc' } },
        codingProfiles: true,
      },
    });

    if (!student) {
      console.error(`❌ Student with email ${email} not found`);
      process.exit(1);
    }

    console.log('✅ Student found:', {
      id: student.id,
      userId: student.userId,
      fullName: student.fullName,
      email: student.email,
    });

    // Normalize data (same as controller)
    const normalizedData = {
      ...student,
      skills: Array.isArray(student.skills) ? student.skills : [],
      education: Array.isArray(student.education) ? student.education : [],
      projects: Array.isArray(student.projects) ? student.projects : [],
      achievements: Array.isArray(student.achievements) ? student.achievements : [],
      certifications: Array.isArray(student.certifications) ? student.certifications : [],
      experiences: Array.isArray(student.experiences) ? student.experiences : [],
      codingProfiles: Array.isArray(student.codingProfiles) ? student.codingProfiles : [],
      profilePhoto: student.user?.profilePhoto || null,
    };

    delete normalizedData.user;

    console.log('\n📊 Data Counts:');
    console.log('  Skills:', normalizedData.skills.length);
    console.log('  Education:', normalizedData.education.length);
    console.log('  Projects:', normalizedData.projects.length);
    console.log('  Achievements:', normalizedData.achievements.length);
    console.log('  Certifications:', normalizedData.certifications.length);
    console.log('  Experiences:', normalizedData.experiences.length);
    console.log('  Coding Profiles:', normalizedData.codingProfiles.length);

    console.log('\n🔍 Field Verification:');
    console.log('  Projects isArray:', Array.isArray(normalizedData.projects));
    console.log('  Achievements isArray:', Array.isArray(normalizedData.achievements));
    console.log('  Certifications isArray:', Array.isArray(normalizedData.certifications));

    if (normalizedData.projects.length > 0) {
      console.log('\n📦 First Project:');
      console.log(JSON.stringify(normalizedData.projects[0], null, 2));
    }

    if (normalizedData.achievements.length > 0) {
      console.log('\n🏆 First Achievement:');
      console.log(JSON.stringify(normalizedData.achievements[0], null, 2));
    }

    if (normalizedData.certifications.length > 0) {
      console.log('\n📜 First Certification:');
      console.log(JSON.stringify(normalizedData.certifications[0], null, 2));
    }

    console.log('\n✅ All data normalized and ready for API response');
    console.log('\n📤 Simulated API Response Structure:');
    console.log(JSON.stringify({
      id: normalizedData.id,
      projects: normalizedData.projects.length,
      achievements: normalizedData.achievements.length,
      certifications: normalizedData.certifications.length,
      hasProjects: normalizedData.projects.length > 0,
      hasAchievements: normalizedData.achievements.length > 0,
      hasCertifications: normalizedData.certifications.length > 0,
    }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'charansai07136@gmail.com';
testProfileAPI(email);

