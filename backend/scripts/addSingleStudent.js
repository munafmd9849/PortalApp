/**
 * Add Single Student with Profile Data
 * 
 * Creates a student and adds complete profile data.
 * 
 * Usage:
 *   node scripts/addSingleStudent.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const EMAIL = 'charansai82140@gmail.com';
const PASSWORD = 'qwert123';
const FULL_NAME = 'Charansai'; // You can customize this

// Profile data for this student - Frontend Developer specialization
const PROFILE_DATA = {
  education: [
    { 
      degree: 'B.Tech Computer Science and Engineering', 
      institution: 'PWIOI University', 
      startYear: 2025, 
      endYear: 2029, 
      cgpa: 8.7,
      description: 'Focused on software engineering and web technologies'
    },
    { 
      degree: 'Higher Secondary (12th)', 
      institution: 'Delhi Public School', 
      startYear: 2023, 
      endYear: 2025, 
      cgpa: 9.1 
    },
  ],
  skills: [
    { skillName: 'React', rating: 5 },
    { skillName: 'JavaScript', rating: 5 },
    { skillName: 'TypeScript', rating: 4 },
    { skillName: 'Next.js', rating: 4 },
    { skillName: 'Tailwind CSS', rating: 5 },
    { skillName: 'Node.js', rating: 4 },
    { skillName: 'Git', rating: 4 },
    { skillName: 'Webpack', rating: 3 },
    { skillName: 'RESTful APIs', rating: 4 },
    { skillName: 'GraphQL', rating: 3 },
  ],
  projects: [
    {
      title: 'E-Learning Platform Frontend',
      description: 'Interactive online learning platform with video streaming, quizzes, and progress tracking. Built with React and integrated with backend APIs.',
      technologies: JSON.stringify(['React', 'TypeScript', 'Tailwind CSS', 'React Router', 'Axios', 'Chart.js']),
      githubUrl: 'https://github.com/charansai/elearning-platform',
      liveUrl: 'https://elearning-platform-demo.vercel.app',
    },
    {
      title: 'Portfolio Website Builder',
      description: 'Drag-and-drop portfolio builder with customizable themes and real-time preview. Export as static site.',
      technologies: JSON.stringify(['React', 'Next.js', 'Framer Motion', 'Tailwind CSS', 'Zustand']),
      githubUrl: 'https://github.com/charansai/portfolio-builder',
      liveUrl: 'https://portfolio-builder.vercel.app',
    },
    {
      title: 'Task Management Dashboard',
      description: 'Collaborative task management tool with Kanban boards, time tracking, and team collaboration features.',
      technologies: JSON.stringify(['React', 'Redux', 'Material-UI', 'Socket.io', 'Node.js']),
      githubUrl: 'https://github.com/charansai/task-dashboard',
    },
  ],
  achievements: [
    {
      title: 'Frontend Developer of the Year - TechFest 2025',
      description: 'Won first place in frontend development competition for innovative UI/UX design',
      date: new Date('2025-01-20'),
      hasCertificate: true,
      certificateUrl: 'https://example.com/certificates/frontend-dev-2025.pdf',
    },
    {
      title: 'Best UI/UX Design Award',
      description: 'Recognized for outstanding user interface design in e-learning platform project',
      date: new Date('2024-12-15'),
      hasCertificate: true,
    },
    {
      title: 'Open Source Contributor - GitHub',
      description: 'Contributed to major open source projects including React ecosystem libraries',
      date: new Date('2024-11-10'),
      hasCertificate: false,
    },
  ],
  certifications: [
    {
      title: 'Meta React Developer Professional Certificate',
      description: 'Comprehensive React development certification covering hooks, state management, and best practices',
      issuedDate: new Date('2024-10-15'),
      issuer: 'Meta',
      certificateUrl: 'https://example.com/certificates/meta-react-cert.pdf',
    },
    {
      title: 'Next.js 14 - Complete Developer Guide',
      description: 'Advanced Next.js course covering App Router, Server Components, and deployment',
      issuedDate: new Date('2024-09-20'),
      issuer: 'Udemy',
      certificateUrl: 'https://example.com/certificates/nextjs-14.pdf',
    },
    {
      title: 'JavaScript Algorithms and Data Structures',
      description: 'Certification in advanced JavaScript concepts and problem-solving',
      issuedDate: new Date('2024-08-05'),
      issuer: 'freeCodeCamp',
    },
  ],
  endorsements: JSON.stringify([
    {
      endorserName: 'Prof. Emily Davis',
      endorserEmail: 'emily.davis@pwioi.com',
      endorserRole: 'Professor of Web Development',
      organization: 'PWIOI University',
      message: 'Exceptional frontend development skills with strong attention to detail. Charansai demonstrates excellent problem-solving abilities and creates user-friendly, responsive web applications.',
      relatedSkills: ['React', 'JavaScript', 'UI/UX Design'],
      verified: true,
      submittedAt: new Date('2025-01-20').toISOString(),
    },
    {
      endorserName: 'Michael Chen',
      endorserEmail: 'michael.chen@techstartup.com',
      endorserRole: 'Senior Frontend Engineer',
      organization: 'TechStartup Inc',
      message: 'Outstanding React developer with a keen eye for design. Great communication skills and ability to work in agile teams.',
      relatedSkills: ['React', 'TypeScript', 'Next.js'],
      verified: true,
      submittedAt: new Date('2025-01-18').toISOString(),
    },
  ]),
};

async function createStudentWithProfile() {
  console.log(`👤 Creating student: ${EMAIL}\n`);

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existingUser) {
      console.log(`⚠️  User ${EMAIL} already exists.`);
      const existingStudent = await prisma.student.findUnique({ where: { email: EMAIL } });
      if (!existingStudent) {
        console.log('   But student profile not found. This should not happen. Skipping...');
        return;
      }

      // Check if profile data already exists
      const existingSkills = await prisma.skill.count({ where: { studentId: existingStudent.id } });
      if (existingSkills > 0) {
        console.log('   Profile data already exists. Skipping...');
        return;
      }

      // Add profile data only
      console.log('   Adding profile data...');
      await addProfileData(existingStudent.id);
      console.log(`✅ Profile data added for existing student: ${EMAIL}\n`);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // Create user and student with profile data in transaction
    await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: EMAIL,
          passwordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Create student profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          fullName: FULL_NAME,
          email: EMAIL,
          phone: '9876543210',
          batch: '25-29',
          center: 'BANGALORE',
          school: 'SOT',
        },
      });

      // Add profile data
      await addProfileData(student.id, tx);

      console.log(`✅ Created student and added profile data: ${EMAIL}\n`);
    });

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    throw error;
  }
}

async function addProfileData(studentId, tx = prisma) {
  // Add Education
  if (PROFILE_DATA.education && PROFILE_DATA.education.length > 0) {
    await tx.education.createMany({
      data: PROFILE_DATA.education.map(edu => ({
        studentId,
        ...edu,
      })),
    });
  }

  // Add Skills
  if (PROFILE_DATA.skills && PROFILE_DATA.skills.length > 0) {
    await tx.skill.createMany({
      data: PROFILE_DATA.skills.map(skill => ({
        studentId,
        ...skill,
      })),
    });
  }

  // Add Projects
  if (PROFILE_DATA.projects && PROFILE_DATA.projects.length > 0) {
    await tx.project.createMany({
      data: PROFILE_DATA.projects.map(project => ({
        studentId,
        ...project,
      })),
    });
  }

  // Add Achievements
  if (PROFILE_DATA.achievements && PROFILE_DATA.achievements.length > 0) {
    await tx.achievement.createMany({
      data: PROFILE_DATA.achievements.map(achievement => ({
        studentId,
        ...achievement,
      })),
    });
  }

  // Add Certifications
  if (PROFILE_DATA.certifications && PROFILE_DATA.certifications.length > 0) {
    await tx.certification.createMany({
      data: PROFILE_DATA.certifications.map(cert => ({
        studentId,
        ...cert,
      })),
    });
  }

  // Update Student with endorsements
  if (PROFILE_DATA.endorsements) {
    await tx.student.update({
      where: { id: studentId },
      data: { endorsementsData: PROFILE_DATA.endorsements },
    });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    await createStudentWithProfile();

    // Verify the data
    const student = await prisma.student.findUnique({
      where: { email: EMAIL },
      include: {
        skills: true,
        education: true,
        projects: true,
        achievements: true,
        certifications: true,
      },
    });

    if (student) {
      console.log('📋 Profile Summary:');
      console.log(`   Education: ${student.education.length} records`);
      console.log(`   Skills: ${student.skills.length} skills`);
      console.log(`   Projects: ${student.projects.length} projects`);
      console.log(`   Achievements: ${student.achievements.length} achievements`);
      console.log(`   Certifications: ${student.certifications.length} certifications`);
      console.log(`   Endorsements: ${student.endorsementsData ? 'Yes' : 'No'}\n`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
