/**
 * Add sample data for a student
 * Usage: node scripts/addSampleDataForStudent.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

const STUDENT_EMAIL = 'charansai82140@gmail.com';

async function addSampleData() {
  try {
    console.log(`🔍 Finding student with email: ${STUDENT_EMAIL}...`);

    // Find the student
    const student = await prisma.student.findUnique({
      where: { email: STUDENT_EMAIL },
      include: { user: true },
    });

    if (!student) {
      console.error(`❌ Student with email ${STUDENT_EMAIL} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found student: ${student.fullName} (ID: ${student.id})`);

    // 1. Update stats
    console.log('\n📊 Updating career stats...');
    await prisma.student.update({
      where: { id: student.id },
      data: {
        statsApplied: 15,
        statsShortlisted: 8,
        statsInterviewed: 5,
        statsOffers: 2,
      },
    });
    console.log('✅ Stats updated: Applied: 15, Shortlisted: 8, Interviewed: 5, Offers: 2');

    // 2. Add Education records
    console.log('\n📚 Adding education records...');
    const educationData = [
      {
        degree: 'B.Tech',
        institution: 'PVPSIT - Prasad V. Potluri Siddhartha Institute of Technology',
        startYear: 2020,
        endYear: 2024,
        cgpa: 8.75,
        description: 'Bachelor of Technology in Computer Science and Engineering',
      },
      {
        degree: 'Intermediate (12th)',
        institution: 'Narayana Junior College',
        startYear: 2018,
        endYear: 2020,
        cgpa: 9.2,
        description: 'Intermediate Education with MPC (Mathematics, Physics, Chemistry)',
      },
      {
        degree: 'SSC (10th)',
        institution: 'Kendriya Vidyalaya',
        startYear: 2017,
        endYear: 2018,
        cgpa: 9.5,
        description: 'Secondary School Certificate',
      },
    ];

    for (const edu of educationData) {
      await prisma.education.create({
        data: {
          studentId: student.id,
          ...edu,
        },
      });
    }
    console.log(`✅ Added ${educationData.length} education records`);

    // 3. Add Projects
    console.log('\n💻 Adding projects...');
    const projectsData = [
      {
        title: 'E-Commerce Platform',
        description: 'Full-stack e-commerce web application with user authentication, product catalog, shopping cart, and payment integration. Built using React, Node.js, Express, and MongoDB.',
        technologies: JSON.stringify(['React', 'Node.js', 'Express', 'MongoDB', 'Stripe API', 'JWT']),
        githubUrl: 'https://github.com/example/ecommerce-platform',
        liveUrl: 'https://ecommerce-demo.vercel.app',
      },
      {
        title: 'AI-Powered Chatbot',
        description: 'Intelligent chatbot application using NLP and machine learning. Handles customer queries, provides product recommendations, and integrates with multiple messaging platforms.',
        technologies: JSON.stringify(['Python', 'TensorFlow', 'Flask', 'NLTK', 'OpenAI API']),
        githubUrl: 'https://github.com/example/ai-chatbot',
        liveUrl: 'https://chatbot-demo.herokuapp.com',
      },
      {
        title: 'Task Management System',
        description: 'Collaborative task management tool with real-time updates, team collaboration features, drag-and-drop interface, and deadline tracking.',
        technologies: JSON.stringify(['React', 'TypeScript', 'Socket.io', 'PostgreSQL', 'Redis']),
        githubUrl: 'https://github.com/example/task-manager',
        liveUrl: 'https://taskmanager-demo.netlify.app',
      },
      {
        title: 'Weather Forecast App',
        description: 'Mobile-first weather application with location-based forecasts, interactive maps, weather alerts, and beautiful UI/UX design.',
        technologies: JSON.stringify(['React Native', 'Weather API', 'Redux', 'AsyncStorage']),
        githubUrl: 'https://github.com/example/weather-app',
        liveUrl: null,
      },
    ];

    for (const project of projectsData) {
      await prisma.project.create({
        data: {
          studentId: student.id,
          ...project,
        },
      });
    }
    console.log(`✅ Added ${projectsData.length} projects`);

    // 4. Add Achievements
    console.log('\n🏆 Adding achievements...');
    const achievementsData = [
      {
        title: 'Winner - National Coding Championship 2023',
        description: 'Secured 1st place in the National Coding Championship organized by CodeChef. Solved all problems in the final round.',
        date: new Date('2023-11-15'),
        hasCertificate: true,
        certificateUrl: 'https://example.com/certificates/coding-championship-2023.pdf',
      },
      {
        title: 'Best Project Award - College Tech Fest',
        description: 'Received Best Project Award for the E-Commerce Platform at the annual college technical festival.',
        date: new Date('2023-09-20'),
        hasCertificate: true,
        certificateUrl: null,
      },
      {
        title: 'Hackathon Winner - HackFest 2024',
        description: 'Team leader and winner of HackFest 2024 hackathon. Built a real-time collaboration tool in 24 hours.',
        date: new Date('2024-01-10'),
        hasCertificate: true,
        certificateUrl: null,
      },
      {
        title: 'Dean\'s List - Academic Excellence',
        description: 'Consistently maintained top 5% position in the department. Included in Dean\'s List for three consecutive semesters.',
        date: new Date('2023-12-01'),
        hasCertificate: false,
        certificateUrl: null,
      },
      {
        title: 'Open Source Contributor',
        description: 'Active contributor to multiple open-source projects. Have 50+ contributions on GitHub with 5 projects merged to main.',
        date: new Date('2023-08-01'),
        hasCertificate: false,
        certificateUrl: null,
      },
    ];

    for (const achievement of achievementsData) {
      await prisma.achievement.create({
        data: {
          studentId: student.id,
          ...achievement,
        },
      });
    }
    console.log(`✅ Added ${achievementsData.length} achievements`);

    // 5. Add Certifications
    console.log('\n📜 Adding certifications...');
    const certificationsData = [
      {
        title: 'AWS Certified Solutions Architect - Associate',
        description: 'Certified in designing distributed systems on AWS. Expertise in cloud architecture, security, and scalability.',
        issuedDate: new Date('2024-02-15'),
        expiryDate: new Date('2027-02-15'),
        issuer: 'Amazon Web Services',
        certificateUrl: 'https://example.com/certificates/aws-saa.pdf',
      },
      {
        title: 'Google Cloud Professional Cloud Architect',
        description: 'Professional certification in Google Cloud Platform architecture, design, and implementation.',
        issuedDate: new Date('2023-10-20'),
        expiryDate: new Date('2026-10-20'),
        issuer: 'Google Cloud',
        certificateUrl: 'https://example.com/certificates/gcp-architect.pdf',
      },
      {
        title: 'Meta Front-End Developer Professional Certificate',
        description: 'Comprehensive certification covering React, JavaScript, HTML, CSS, and modern web development practices.',
        issuedDate: new Date('2023-07-10'),
        expiryDate: null,
        issuer: 'Meta (Coursera)',
        certificateUrl: 'https://example.com/certificates/meta-frontend.pdf',
      },
      {
        title: 'MongoDB Certified Developer Associate',
        description: 'Certified in MongoDB database development, query optimization, and data modeling.',
        issuedDate: new Date('2023-05-05'),
        expiryDate: new Date('2026-05-05'),
        issuer: 'MongoDB University',
        certificateUrl: 'https://example.com/certificates/mongodb-dev.pdf',
      },
      {
        title: 'Docker Certified Associate',
        description: 'Certified in containerization, Docker orchestration, and container management best practices.',
        issuedDate: new Date('2023-09-01'),
        expiryDate: new Date('2026-09-01'),
        issuer: 'Docker Inc.',
        certificateUrl: 'https://example.com/certificates/docker-associate.pdf',
      },
    ];

    for (const cert of certificationsData) {
      await prisma.certification.create({
        data: {
          studentId: student.id,
          ...cert,
        },
      });
    }
    console.log(`✅ Added ${certificationsData.length} certifications`);

    // 6. Add Skills
    console.log('\n🎯 Adding skills...');
    const skillsData = [
      { skillName: 'JavaScript', rating: 5 },
      { skillName: 'React', rating: 5 },
      { skillName: 'Node.js', rating: 5 },
      { skillName: 'Python', rating: 4 },
      { skillName: 'TypeScript', rating: 4 },
      { skillName: 'MongoDB', rating: 4 },
      { skillName: 'PostgreSQL', rating: 4 },
      { skillName: 'AWS', rating: 4 },
      { skillName: 'Docker', rating: 4 },
      { skillName: 'Git', rating: 5 },
      { skillName: 'Express.js', rating: 5 },
      { skillName: 'SQL', rating: 4 },
      { skillName: 'HTML/CSS', rating: 5 },
      { skillName: 'Redux', rating: 4 },
      { skillName: 'GraphQL', rating: 3 },
      { skillName: 'REST APIs', rating: 5 },
      { skillName: 'Java', rating: 3 },
      { skillName: 'C++', rating: 3 },
      { skillName: 'TensorFlow', rating: 3 },
      { skillName: 'Machine Learning', rating: 3 },
    ];

    let skillsAdded = 0;
    for (const skill of skillsData) {
      try {
        await prisma.skill.create({
          data: {
            studentId: student.id,
            ...skill,
          },
        });
        skillsAdded++;
      } catch (error) {
        if (error.code === 'P2002') {
          // Skill already exists, skip
          continue;
        } else {
          throw error;
        }
      }
    }
    console.log(`✅ Added ${skillsAdded} skills`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SAMPLE DATA ADDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary for ${student.fullName}:`);
    console.log(`   - Career Stats: Applied: 15, Shortlisted: 8, Interviewed: 5, Offers: 2`);
    console.log(`   - Education: ${educationData.length} records`);
    console.log(`   - Projects: ${projectsData.length} records`);
    console.log(`   - Achievements: ${achievementsData.length} records`);
    console.log(`   - Certifications: ${certificationsData.length} records`);
    console.log(`   - Skills: ${skillsAdded} records`);
    console.log('\n✅ All data has been added to the database!');

  } catch (error) {
    console.error('\n❌ Error adding sample data:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleData();
