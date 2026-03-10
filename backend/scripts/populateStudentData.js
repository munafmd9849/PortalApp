/**
 * Populate comprehensive sample data for a student
 * Usage: node scripts/populateStudentData.js
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

async function populateData() {
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

    console.log(`✅ Found student: ${student.fullName} (ID: ${student.id})\n`);

    // 1. Update stats
    console.log('📊 Updating career stats...');
    await prisma.student.update({
      where: { id: student.id },
      data: {
        statsApplied: 15,
        statsShortlisted: 8,
        statsInterviewed: 5,
        statsOffers: 2,
      },
    });
    console.log('✅ Stats updated\n');

    // 2. Get some jobs to apply to
    console.log('💼 Getting available jobs...');
    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { status: 'POSTED' },
          { status: 'ACTIVE' },
          { isActive: true },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`✅ Found ${jobs.length} jobs to apply to\n`);

    // 3. Create Applications
    console.log('📝 Creating applications...');
    const applicationStatuses = ['APPLIED', 'SHORTLISTED', 'INTERVIEWED', 'APPLIED', 'APPLIED'];
    let appsCreated = 0;
    
    for (let i = 0; i < Math.min(jobs.length, 5); i++) {
      try {
        await prisma.application.create({
          data: {
            studentId: student.id,
            jobId: jobs[i].id,
            status: applicationStatuses[i] || 'APPLIED',
            appliedDate: new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000)), // Different dates
          },
        });
        appsCreated++;
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`   Application to "${jobs[i].jobTitle}" already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    console.log(`✅ Created ${appsCreated} new applications\n`);

    // 4. Add Education records (delete existing and add new)
    console.log('📚 Adding education records...');
    await prisma.education.deleteMany({ where: { studentId: student.id } });
    
    const educationData = [
      {
        degree: 'B.Tech Computer Science and Engineering',
        institution: 'PVPSIT - Prasad V. Potluri Siddhartha Institute of Technology',
        startYear: 2020,
        endYear: 2024,
        cgpa: 8.75,
        description: 'Bachelor of Technology in Computer Science and Engineering. Focused on software development, algorithms, and data structures.',
      },
      {
        degree: 'Intermediate (12th) - MPC',
        institution: 'Narayana Junior College, Vijayawada',
        startYear: 2018,
        endYear: 2020,
        cgpa: 9.2,
        description: 'Higher Secondary Education with Mathematics, Physics, and Chemistry. Secured district rank in board exams.',
      },
      {
        degree: 'SSC (10th)',
        institution: 'Kendriya Vidyalaya, Tenali',
        startYear: 2017,
        endYear: 2018,
        cgpa: 9.5,
        description: 'Secondary School Certificate. Active participant in science exhibitions and quiz competitions.',
      },
    ];

    await prisma.education.createMany({
      data: educationData.map(edu => ({ ...edu, studentId: student.id })),
    });
    console.log(`✅ Added ${educationData.length} education records\n`);

    // 5. Add Projects (delete existing and add new)
    console.log('💻 Adding projects...');
    await prisma.project.deleteMany({ where: { studentId: student.id } });
    
    const projectsData = [
      {
        title: 'E-Commerce Platform with Payment Integration',
        description: 'Full-stack e-commerce web application with user authentication, product catalog, shopping cart, and secure payment processing using Stripe API. Features include order management, inventory tracking, and admin dashboard.',
        technologies: JSON.stringify(['React', 'Node.js', 'Express', 'MongoDB', 'Stripe API', 'JWT', 'Redux']),
        githubUrl: 'https://github.com/charansai/ecommerce-platform',
        liveUrl: 'https://ecommerce-demo.vercel.app',
      },
      {
        title: 'AI-Powered Chatbot with NLP',
        description: 'Intelligent chatbot application using natural language processing and machine learning. Handles customer queries, provides product recommendations, integrates with multiple messaging platforms, and learns from user interactions.',
        technologies: JSON.stringify(['Python', 'TensorFlow', 'Flask', 'NLTK', 'OpenAI API', 'Socket.io']),
        githubUrl: 'https://github.com/charansai/ai-chatbot',
        liveUrl: 'https://chatbot-demo.herokuapp.com',
      },
      {
        title: 'Real-Time Task Management System',
        description: 'Collaborative task management tool with real-time updates using WebSockets, team collaboration features, drag-and-drop interface, deadline tracking, and notifications. Built for remote teams.',
        technologies: JSON.stringify(['React', 'TypeScript', 'Socket.io', 'PostgreSQL', 'Redis', 'Node.js']),
        githubUrl: 'https://github.com/charansai/task-manager',
        liveUrl: 'https://taskmanager-demo.netlify.app',
      },
      {
        title: 'Weather Forecast Mobile App',
        description: 'Mobile-first weather application with location-based forecasts, interactive maps, weather alerts, and beautiful UI/UX design. Features include hourly and daily forecasts, weather history, and multiple location support.',
        technologies: JSON.stringify(['React Native', 'Weather API', 'Redux', 'AsyncStorage', 'Expo']),
        githubUrl: 'https://github.com/charansai/weather-app',
        liveUrl: null,
      },
      {
        title: 'Blockchain-Based Voting System',
        description: 'Secure voting system built on blockchain technology ensuring transparency and immutability. Features include voter authentication, real-time vote counting, and result verification.',
        technologies: JSON.stringify(['Solidity', 'Web3.js', 'React', 'Node.js', 'Ethereum']),
        githubUrl: 'https://github.com/charansai/blockchain-voting',
        liveUrl: null,
      },
    ];

    await prisma.project.createMany({
      data: projectsData.map(proj => ({ ...proj, studentId: student.id })),
    });
    console.log(`✅ Added ${projectsData.length} projects\n`);

    // 6. Add Achievements (delete existing and add new)
    console.log('🏆 Adding achievements...');
    await prisma.achievement.deleteMany({ where: { studentId: student.id } });
    
    const achievementsData = [
      {
        title: 'Winner - National Coding Championship 2023',
        description: 'Secured 1st place in the National Coding Championship organized by CodeChef. Solved all problems in the final round and achieved the highest score among 500+ participants.',
        date: new Date('2023-11-15'),
        hasCertificate: true,
        certificateUrl: 'https://example.com/certificates/coding-championship-2023.pdf',
      },
      {
        title: 'Best Project Award - College Tech Fest 2024',
        description: 'Received Best Project Award for the E-Commerce Platform at the annual college technical festival. Recognized for innovation and technical excellence.',
        date: new Date('2024-01-20'),
        hasCertificate: true,
        certificateUrl: null,
      },
      {
        title: 'Hackathon Winner - HackFest 2024',
        description: 'Team leader and winner of HackFest 2024 hackathon. Built a real-time collaboration tool in 24 hours that impressed judges with its functionality and design.',
        date: new Date('2024-01-10'),
        hasCertificate: true,
        certificateUrl: null,
      },
      {
        title: "Dean's List - Academic Excellence",
        description: 'Consistently maintained top 5% position in the department. Included in Dean\'s List for three consecutive semesters for outstanding academic performance.',
        date: new Date('2023-12-01'),
        hasCertificate: false,
        certificateUrl: null,
      },
      {
        title: 'Open Source Contributor of the Year',
        description: 'Active contributor to multiple open-source projects. Have 150+ contributions on GitHub with 8 major projects merged to main. Recognized by the open-source community.',
        date: new Date('2023-08-01'),
        hasCertificate: false,
        certificateUrl: null,
      },
    ];

    await prisma.achievement.createMany({
      data: achievementsData.map(ach => ({ ...ach, studentId: student.id })),
    });
    console.log(`✅ Added ${achievementsData.length} achievements\n`);

    // 7. Add Certifications (delete existing and add new)
    console.log('📜 Adding certifications...');
    await prisma.certification.deleteMany({ where: { studentId: student.id } });
    
    const certificationsData = [
      {
        title: 'AWS Certified Solutions Architect - Associate',
        description: 'Certified in designing distributed systems on AWS. Expertise in cloud architecture, security, scalability, and cost optimization. Validated knowledge of AWS services and best practices.',
        issuedDate: new Date('2024-02-15'),
        expiryDate: new Date('2027-02-15'),
        issuer: 'Amazon Web Services',
        certificateUrl: 'https://example.com/certificates/aws-saa.pdf',
      },
      {
        title: 'Google Cloud Professional Cloud Architect',
        description: 'Professional certification in Google Cloud Platform architecture, design, and implementation. Demonstrated ability to design and manage robust, secure, and scalable cloud solutions.',
        issuedDate: new Date('2023-10-20'),
        expiryDate: new Date('2026-10-20'),
        issuer: 'Google Cloud',
        certificateUrl: 'https://example.com/certificates/gcp-architect.pdf',
      },
      {
        title: 'Meta Front-End Developer Professional Certificate',
        description: 'Comprehensive certification covering React, JavaScript, HTML, CSS, and modern web development practices. Includes hands-on projects and real-world application development.',
        issuedDate: new Date('2023-07-10'),
        expiryDate: null,
        issuer: 'Meta (Coursera)',
        certificateUrl: 'https://example.com/certificates/meta-frontend.pdf',
      },
      {
        title: 'MongoDB Certified Developer Associate',
        description: 'Certified in MongoDB database development, query optimization, data modeling, and indexing strategies. Proficient in MongoDB Atlas and database administration.',
        issuedDate: new Date('2023-05-05'),
        expiryDate: new Date('2026-05-05'),
        issuer: 'MongoDB University',
        certificateUrl: 'https://example.com/certificates/mongodb-dev.pdf',
      },
      {
        title: 'Docker Certified Associate',
        description: 'Certified in containerization, Docker orchestration, and container management best practices. Expertise in Docker Compose, Docker Swarm, and container security.',
        issuedDate: new Date('2023-09-01'),
        expiryDate: new Date('2026-09-01'),
        issuer: 'Docker Inc.',
        certificateUrl: 'https://example.com/certificates/docker-associate.pdf',
      },
    ];

    await prisma.certification.createMany({
      data: certificationsData.map(cert => ({ ...cert, studentId: student.id })),
    });
    console.log(`✅ Added ${certificationsData.length} certifications\n`);

    // 8. Add Skills (delete existing and add new)
    console.log('🎯 Adding skills...');
    await prisma.skill.deleteMany({ where: { studentId: student.id } });
    
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
      { skillName: 'React Native', rating: 4 },
    ];

    await prisma.skill.createMany({
      data: skillsData.map(skill => ({ ...skill, studentId: student.id })),
    });
    console.log(`✅ Added ${skillsData.length} skills\n`);

    // 9. Add Endorsements (delete existing and add new)
    console.log('⭐ Adding endorsements...');
    await prisma.endorsement.deleteMany({ where: { studentId: student.id } });
    
    const endorsementsData = [
      {
        endorserName: 'Dr. Rajesh Kumar',
        endorserEmail: 'rajesh.kumar@pvpsit.ac.in',
        endorserRole: 'Professor & Head of Department',
        organization: 'PVPSIT - CSE Department',
        relationship: 'Professor',
        message: 'Outstanding student with exceptional problem-solving skills and dedication to learning. Demonstrated strong leadership in group projects and consistently delivered high-quality work.',
        skills: JSON.stringify(['Problem Solving', 'Leadership', 'Team Collaboration']),
        verified: true,
        submittedAt: new Date('2023-12-01'),
      },
      {
        endorserName: 'Priya Sharma',
        endorserEmail: 'priya.sharma@techcorp.com',
        endorserRole: 'Senior Software Engineer',
        organization: 'TechCorp Solutions',
        relationship: 'Colleague',
        message: 'Worked together on an open-source project. Excellent coding skills, attention to detail, and ability to work in a team. Would highly recommend for any software development role.',
        skills: JSON.stringify(['JavaScript', 'React', 'Git', 'Teamwork']),
        verified: true,
        submittedAt: new Date('2024-01-15'),
      },
      {
        endorserName: 'Amit Patel',
        endorserEmail: 'amit.patel@startup.io',
        endorserRole: 'CTO & Co-founder',
        organization: 'Startup.io',
        relationship: 'Supervisor',
        message: 'Interned with our company for 3 months. Showed great initiative, learned quickly, and contributed significantly to our product development. A rising star in software engineering.',
        skills: JSON.stringify(['Full Stack Development', 'Quick Learning', 'Initiative']),
        verified: true,
        submittedAt: new Date('2023-11-20'),
      },
      {
        endorserName: 'Sneha Reddy',
        endorserEmail: 'sneha.reddy@codingacademy.com',
        endorserRole: 'Mentor & Coding Instructor',
        organization: 'Coding Academy',
        relationship: 'Mentor',
        message: 'Mentored this student in competitive programming. Exceptional algorithmic thinking and coding skills. Consistently ranked in top 10% in coding contests and hackathons.',
        skills: JSON.stringify(['Algorithms', 'Data Structures', 'Competitive Programming']),
        verified: true,
        submittedAt: new Date('2024-01-05'),
      },
    ];

    await prisma.endorsement.createMany({
      data: endorsementsData.map(end => ({ ...end, studentId: student.id })),
    });
    console.log(`✅ Added ${endorsementsData.length} endorsements\n`);

    console.log('='.repeat(60));
    console.log('✅ ALL DATA POPULATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary for ${student.fullName}:`);
    console.log(`   ✅ Career Stats: Applied: 15, Shortlisted: 8, Interviewed: 5, Offers: 2`);
    console.log(`   ✅ Applications: ${appsCreated} new applications created`);
    console.log(`   ✅ Education: ${educationData.length} records`);
    console.log(`   ✅ Projects: ${projectsData.length} records`);
    console.log(`   ✅ Achievements: ${achievementsData.length} records`);
    console.log(`   ✅ Certifications: ${certificationsData.length} records`);
    console.log(`   ✅ Skills: ${skillsData.length} records`);
    console.log(`   ✅ Endorsements: ${endorsementsData.length} records`);
    console.log('\n🎉 All sections have been populated!');

  } catch (error) {
    console.error('\n❌ Error populating data:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

populateData();
