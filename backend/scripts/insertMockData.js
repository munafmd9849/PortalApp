/**
 * Script to insert mock data into the database for student panel
 * Usage: node backend/scripts/insertMockData.js [studentId]
 * If studentId is not provided, it will use the first student found
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const mockProjects = [
  {
    title: 'E-Commerce Platform',
    description: 'A full-stack e-commerce application with user authentication, product catalog, shopping cart, and payment integration. Built with React for frontend and Node.js for backend.',
    technologies: JSON.stringify(['React', 'Node.js', 'MongoDB', 'Express', 'Stripe']),
    githubUrl: 'https://github.com/username/ecommerce-platform',
    liveUrl: 'https://ecommerce-demo.vercel.app'
  },
  {
    title: 'Task Management App',
    description: 'A collaborative task management application with real-time updates, drag-and-drop functionality, and team collaboration features.',
    technologies: JSON.stringify(['React', 'TypeScript', 'Firebase', 'Material-UI']),
    githubUrl: 'https://github.com/username/task-manager',
    liveUrl: 'https://taskmanager-demo.netlify.app'
  },
  {
    title: 'Weather Dashboard',
    description: 'A responsive weather dashboard that displays current weather conditions and forecasts using weather API integration.',
    technologies: JSON.stringify(['JavaScript', 'HTML', 'CSS', 'OpenWeather API']),
    githubUrl: 'https://github.com/username/weather-dashboard',
    liveUrl: 'https://weather-demo.github.io'
  }
];

const mockAchievements = [
  {
    title: 'Hackathon Winner',
    description: 'Won first place in the annual college hackathon for developing an innovative solution.',
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    hasCertificate: false
  },
  {
    title: 'Best Project Award',
    description: 'Received best project award for outstanding work in the final year project.',
    date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    hasCertificate: true,
    certificateUrl: 'https://example.com/certificate.pdf'
  }
];

const mockCertifications = [
  {
    title: 'AWS Certified Cloud Practitioner',
    description: 'Validated cloud expertise and knowledge of AWS services.',
    issuedDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    issuer: 'Amazon Web Services',
    certificateUrl: 'https://example.com/aws-cert.pdf'
  },
  {
    title: 'React Developer Certification',
    description: 'Completed comprehensive React development course with hands-on projects.',
    issuedDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    issuer: 'Online Learning Platform',
    certificateUrl: 'https://example.com/react-cert.pdf'
  }
];

const mockEducation = [
  {
    degree: 'Bachelor of Technology',
    institution: 'PW Institute of Innovation',
    startYear: 2021,
    endYear: 2025,
    cgpa: 8.5,
    description: 'Computer Science and Engineering'
  },
  {
    degree: 'Higher Secondary',
    institution: 'ABC School',
    startYear: 2019,
    endYear: 2021,
    cgpa: 85.0,
    description: 'Science Stream'
  }
];

const mockSkills = [
  { skillName: 'JavaScript', rating: 4 },
  { skillName: 'React', rating: 4 },
  { skillName: 'Node.js', rating: 3 },
  { skillName: 'Python', rating: 4 },
  { skillName: 'Java', rating: 3 },
  { skillName: 'SQL', rating: 4 },
  { skillName: 'MongoDB', rating: 3 },
  { skillName: 'Git', rating: 4 }
];

const mockExperience = [
  {
    title: 'Software Development Intern',
    company: 'Tech Startup',
    start: 'Jun 2024',
    end: 'Dec 2024',
    description: 'Worked on developing RESTful APIs, implemented new features, and fixed bugs in the existing codebase. Collaborated with a team of 5 developers.'
  },
  {
    title: 'Frontend Developer Intern',
    company: 'Web Solutions Inc',
    start: 'Jan 2023',
    end: 'Jun 2023',
    description: 'Developed responsive web applications using React and Redux. Improved application performance by 30% through code optimization.'
  }
];

async function insertMockData(studentId = null, email = null) {
  try {
    console.log('🚀 Starting mock data insertion...\n');

    // Find student
    let student;
    if (email) {
      // Find by email
      student = await prisma.student.findUnique({
        where: { email },
        include: { user: true }
      });
      if (!student) {
        console.error(`❌ Student with email ${email} not found`);
        process.exit(1);
      }
    } else if (studentId) {
      student = await prisma.student.findUnique({
        where: { userId: studentId },
        include: { user: true }
      });
      if (!student) {
        console.error(`❌ Student with userId ${studentId} not found`);
        process.exit(1);
      }
    } else {
      // Get first student
      student = await prisma.student.findFirst({
        include: { user: true }
      });
      if (!student) {
        console.error('❌ No students found in database');
        process.exit(1);
      }
    }

    console.log(`✅ Found student: ${student.fullName} (${student.email})`);
    console.log(`   Student ID: ${student.id}\n`);

    // Check existing data
    const existingProjects = await prisma.project.count({ where: { studentId: student.id } });
    const existingAchievements = await prisma.achievement.count({ where: { studentId: student.id } });
    const existingCertifications = await prisma.certification.count({ where: { studentId: student.id } });
    const existingEducation = await prisma.education.count({ where: { studentId: student.id } });
    const existingSkills = await prisma.skill.count({ where: { studentId: student.id } });
    const existingExperiences = await prisma.experience.count({ where: { studentId: student.id } });

    console.log('📊 Existing data:');
    console.log(`   Projects: ${existingProjects}`);
    console.log(`   Achievements: ${existingAchievements}`);
    console.log(`   Certifications: ${existingCertifications}`);
    console.log(`   Education: ${existingEducation}`);
    console.log(`   Skills: ${existingSkills}`);
    console.log(`   Experiences: ${existingExperiences}\n`);

    // Insert Projects (only if none exist)
    if (existingProjects === 0) {
      console.log('📦 Inserting projects...');
      for (const project of mockProjects) {
        await prisma.project.create({
          data: {
            studentId: student.id,
            ...project
          }
        });
      }
      console.log(`   ✅ Inserted ${mockProjects.length} projects\n`);
    } else {
      console.log(`   ⏭️  Skipping projects (${existingProjects} already exist)\n`);
    }

    // Insert Achievements (only if none exist)
    if (existingAchievements === 0) {
      console.log('🏆 Inserting achievements...');
      for (const achievement of mockAchievements) {
        await prisma.achievement.create({
          data: {
            studentId: student.id,
            ...achievement
          }
        });
      }
      console.log(`   ✅ Inserted ${mockAchievements.length} achievements\n`);
    } else {
      console.log(`   ⏭️  Skipping achievements (${existingAchievements} already exist)\n`);
    }

    // Insert Certifications (only if none exist)
    if (existingCertifications === 0) {
      console.log('📜 Inserting certifications...');
      for (const cert of mockCertifications) {
        await prisma.certification.create({
          data: {
            studentId: student.id,
            ...cert
          }
        });
      }
      console.log(`   ✅ Inserted ${mockCertifications.length} certifications\n`);
    } else {
      console.log(`   ⏭️  Skipping certifications (${existingCertifications} already exist)\n`);
    }

    // Insert Education (only if none exist)
    if (existingEducation === 0) {
      console.log('🎓 Inserting education...');
      for (const edu of mockEducation) {
        await prisma.education.create({
          data: {
            studentId: student.id,
            ...edu
          }
        });
      }
      console.log(`   ✅ Inserted ${mockEducation.length} education records\n`);
    } else {
      console.log(`   ⏭️  Skipping education (${existingEducation} already exist)\n`);
    }

    // Insert Skills (only if none exist)
    if (existingSkills === 0) {
      console.log('💻 Inserting skills...');
      for (const skill of mockSkills) {
        await prisma.skill.create({
          data: {
            studentId: student.id,
            ...skill
          }
        });
      }
      console.log(`   ✅ Inserted ${mockSkills.length} skills\n`);
    } else {
      console.log(`   ⏭️  Skipping skills (${existingSkills} already exist)\n`);
    }

    // Insert Experiences (only if none exist)
    if (existingExperiences === 0) {
      console.log('💼 Inserting experiences...');
      for (const exp of mockExperience) {
        await prisma.experience.create({
          data: {
            studentId: student.id,
            ...exp
          }
        });
      }
      console.log(`   ✅ Inserted ${mockExperience.length} experiences\n`);
    } else {
      console.log(`   ⏭️  Skipping experiences (${existingExperiences} already exist)\n`);
    }

    console.log('✨ Mock data insertion completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   Student: ${student.fullName}`);
    console.log(`   Projects: ${existingProjects === 0 ? mockProjects.length : existingProjects} (${existingProjects === 0 ? 'inserted' : 'existing'})`);
    console.log(`   Achievements: ${existingAchievements === 0 ? mockAchievements.length : existingAchievements} (${existingAchievements === 0 ? 'inserted' : 'existing'})`);
    console.log(`   Certifications: ${existingCertifications === 0 ? mockCertifications.length : existingCertifications} (${existingCertifications === 0 ? 'inserted' : 'existing'})`);
    console.log(`   Education: ${existingEducation === 0 ? mockEducation.length : existingEducation} (${existingEducation === 0 ? 'inserted' : 'existing'})`);
    console.log(`   Skills: ${existingSkills === 0 ? mockSkills.length : existingSkills} (${existingSkills === 0 ? 'inserted' : 'existing'})`);
    console.log(`   Experiences: ${existingExperiences === 0 ? mockExperience.length : existingExperiences} (${existingExperiences === 0 ? 'inserted' : 'existing'})`);

  } catch (error) {
    console.error('❌ Error inserting mock data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get studentId or email from command line arguments
const arg1 = process.argv[2] || null;
const arg2 = process.argv[3] || null;

// Check if first argument is an email (contains @)
const email = arg1 && arg1.includes('@') ? arg1 : null;
const studentId = email ? null : arg1;

// Run the script
insertMockData(studentId, email);

