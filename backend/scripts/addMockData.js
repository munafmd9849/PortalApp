/**
 * Add mock data for a specific user
 * Usage: node backend/scripts/addMockData.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
const prisma = new PrismaClient();

const EMAIL = 'charansai82140@gmail.com';

async function addMockData() {
  try {
    console.log(`🔍 Looking for user with email: ${EMAIL}\n`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      include: {
        student: true,
      },
    });

    if (!user) {
      console.error(`❌ User with email ${EMAIL} not found`);
      process.exit(1);
    }

    console.log('✅ User found:', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Get or create student record
    let student = user.student;

    if (!student) {
      console.log('⚠️  Student record not found. Creating one...');
      student = await prisma.student.create({
        data: {
          userId: user.id,
          email: user.email,
          fullName: user.displayName || 'Charan Sai',
          phone: '1234567890',
          batch: '25-29',
          center: 'BANGALORE',
          school: 'SOT',
        },
      });
      console.log('✅ Student record created');
    }

    const studentId = student.id;
    console.log(`\n📝 Student ID: ${studentId}`);
    console.log('📊 Adding mock data...\n');

    // 1. Add Education
    console.log('🎓 Adding Education...');
    const educationData = [
      {
        studentId,
        degree: 'B.Tech Computer Science',
        institution: 'Presidency University, Bangalore',
        startYear: 2021,
        endYear: 2025,
        cgpa: 8.75,
        description: 'Bachelor of Technology in Computer Science and Engineering',
      },
      {
        studentId,
        degree: 'Higher Secondary',
        institution: 'ABC School, Bangalore',
        startYear: 2019,
        endYear: 2021,
        cgpa: 9.20,
        description: '12th Grade - Science Stream',
      },
    ];

    // Delete existing and add new
    await prisma.education.deleteMany({ where: { studentId } });
    await prisma.education.createMany({ data: educationData });
    console.log(`✅ Added ${educationData.length} education records`);

    // 2. Add Skills
    console.log('\n💻 Adding Skills...');
    const skillsData = [
      { studentId, skillName: 'JavaScript', rating: 5 },
      { studentId, skillName: 'React', rating: 5 },
      { studentId, skillName: 'Node.js', rating: 4 },
      { studentId, skillName: 'Python', rating: 4 },
      { studentId, skillName: 'Java', rating: 4 },
      { studentId, skillName: 'MongoDB', rating: 4 },
      { studentId, skillName: 'PostgreSQL', rating: 4 },
      { studentId, skillName: 'Express.js', rating: 5 },
      { studentId, skillName: 'TypeScript', rating: 4 },
      { studentId, skillName: 'Git', rating: 5 },
      { studentId, skillName: 'AWS', rating: 3 },
      { studentId, skillName: 'Docker', rating: 3 },
    ];

    // Delete existing and add new
    await prisma.skill.deleteMany({ where: { studentId } });
    await prisma.skill.createMany({ data: skillsData });
    console.log(`✅ Added ${skillsData.length} skills`);

    // 3. Add Projects
    console.log('\n🚀 Adding Projects...');
    const projectsData = [
      {
        studentId,
        title: 'E-Commerce Platform',
        description: 'Full-stack e-commerce application with React frontend and Node.js backend. Features include user authentication, product catalog, shopping cart, payment integration, and admin dashboard.',
        technologies: JSON.stringify(['React', 'Node.js', 'Express', 'MongoDB', 'Stripe API', 'JWT']),
        githubUrl: 'https://github.com/charansai/ecommerce-platform',
        liveUrl: 'https://ecommerce-demo.vercel.app',
      },
      {
        studentId,
        title: 'Task Management System',
        description: 'Collaborative task management tool with real-time updates using Socket.io. Includes team collaboration features, task assignment, deadlines, and progress tracking.',
        technologies: JSON.stringify(['React', 'Node.js', 'Socket.io', 'PostgreSQL', 'Redis']),
        githubUrl: 'https://github.com/charansai/task-manager',
        liveUrl: 'https://taskmanager-demo.netlify.app',
      },
      {
        studentId,
        title: 'Weather Forecast App',
        description: 'Real-time weather forecasting application using OpenWeatherMap API. Features include location-based weather, 7-day forecast, weather alerts, and interactive maps.',
        technologies: JSON.stringify(['React', 'JavaScript', 'OpenWeatherMap API', 'Chart.js']),
        githubUrl: 'https://github.com/charansai/weather-app',
        liveUrl: 'https://weather-forecast-demo.vercel.app',
      },
      {
        studentId,
        title: 'Social Media Analytics Dashboard',
        description: 'Analytics dashboard for social media metrics visualization. Built with React and D3.js for interactive charts and data visualization.',
        technologies: JSON.stringify(['React', 'TypeScript', 'D3.js', 'Node.js', 'PostgreSQL']),
        githubUrl: 'https://github.com/charansai/analytics-dashboard',
      },
    ];

    // Delete existing and add new
    await prisma.project.deleteMany({ where: { studentId } });
    await prisma.project.createMany({ data: projectsData });
    console.log(`✅ Added ${projectsData.length} projects`);

    // 4. Add Achievements
    console.log('\n🏆 Adding Awards & Achievements...');
    const achievementsData = [
      {
        studentId,
        title: 'Winner - Hackathon 2024',
        description: 'First place winner in the annual college hackathon. Built a real-time collaborative coding platform.',
        date: new Date('2024-03-15'),
        hasCertificate: true,
        certificateUrl: 'https://example.com/certificates/hackathon-2024.pdf',
      },
      {
        studentId,
        title: 'Best Project Award',
        description: 'Received best project award for E-Commerce Platform in Software Engineering course.',
        date: new Date('2024-01-20'),
        hasCertificate: true,
      },
      {
        studentId,
        title: 'Dean\'s List',
        description: 'Awarded Dean\'s List for outstanding academic performance (CGPA > 8.5)',
        date: new Date('2024-06-01'),
        hasCertificate: false,
      },
      {
        studentId,
        title: 'CodeChef Star Performer',
        description: 'Achieved 4-star rating on CodeChef competitive programming platform.',
        date: new Date('2024-02-10'),
        hasCertificate: false,
      },
      {
        studentId,
        title: 'GitHub Campus Expert',
        description: 'Selected as GitHub Campus Expert for contributing to open source and organizing tech events.',
        date: new Date('2023-11-01'),
        hasCertificate: true,
      },
    ];

    // Delete existing and add new
    await prisma.achievement.deleteMany({ where: { studentId } });
    await prisma.achievement.createMany({ data: achievementsData });
    console.log(`✅ Added ${achievementsData.length} achievements`);

    // 5. Add Certifications
    console.log('\n📜 Adding Certifications...');
    const certificationsData = [
      {
        studentId,
        title: 'AWS Certified Solutions Architect',
        description: 'Amazon Web Services Solutions Architect Associate certification',
        issuer: 'Amazon Web Services',
        issuedDate: new Date('2024-01-15'),
        expiryDate: new Date('2027-01-15'),
        certificateUrl: 'https://example.com/certificates/aws-saa.pdf',
      },
      {
        studentId,
        title: 'Google Cloud Professional Developer',
        description: 'Professional Cloud Developer certification from Google Cloud Platform',
        issuer: 'Google Cloud',
        issuedDate: new Date('2023-12-01'),
        expiryDate: new Date('2026-12-01'),
        certificateUrl: 'https://example.com/certificates/gcp-developer.pdf',
      },
      {
        studentId,
        title: 'Meta Front-End Developer Professional Certificate',
        description: 'Comprehensive front-end development course covering React, JavaScript, HTML, CSS',
        issuer: 'Meta (via Coursera)',
        issuedDate: new Date('2023-09-01'),
        certificateUrl: 'https://example.com/certificates/meta-frontend.pdf',
      },
      {
        studentId,
        title: 'MongoDB Certified Developer Associate',
        description: 'MongoDB database development and administration certification',
        issuer: 'MongoDB University',
        issuedDate: new Date('2024-02-20'),
        expiryDate: new Date('2027-02-20'),
        certificateUrl: 'https://example.com/certificates/mongodb-developer.pdf',
      },
      {
        studentId,
        title: 'JavaScript Algorithms and Data Structures',
        description: 'Mastered JavaScript algorithms and data structures through FreeCodeCamp',
        issuer: 'freeCodeCamp',
        issuedDate: new Date('2023-06-15'),
        certificateUrl: 'https://example.com/certificates/fcc-js-algorithms.pdf',
      },
      {
        studentId,
        title: 'Node.js Backend Development',
        description: 'Complete Node.js backend development with Express, REST APIs, and databases',
        issuer: 'Udemy',
        issuedDate: new Date('2023-08-10'),
        certificateUrl: 'https://example.com/certificates/udemy-nodejs.pdf',
      },
    ];

    // Delete existing and add new
    await prisma.certification.deleteMany({ where: { studentId } });
    await prisma.certification.createMany({ data: certificationsData });
    console.log(`✅ Added ${certificationsData.length} certifications`);

    // 6. Add Endorsements
    console.log('\n⭐ Adding Endorsements...');
    const endorsementsData = [
      {
        studentId,
        endorserName: 'Dr. Rajesh Kumar',
        endorserEmail: 'rajesh.kumar@presidencyuniversity.in',
        endorserRole: 'Professor',
        organization: 'Presidency University',
        relationship: 'Professor',
        context: 'Software Engineering Course',
        message: 'Charan is an exceptional student with outstanding problem-solving abilities. His dedication to learning and implementing complex software solutions is commendable. He demonstrated excellent teamwork skills and consistently delivered high-quality projects throughout the course.',
        skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Problem Solving']),
        skillRatings: JSON.stringify({ 'JavaScript': 5, 'React': 5, 'Node.js': 4, 'Problem Solving': 5 }),
        overallRating: 5,
        consent: true,
        verified: true,
      },
      {
        studentId,
        endorserName: 'Prof. Priya Sharma',
        endorserEmail: 'priya.sharma@presidencyuniversity.in',
        endorserRole: 'Professor',
        organization: 'Presidency University',
        relationship: 'Professor',
        context: 'Database Management Systems',
        message: 'Charan showed exceptional understanding of database concepts and was able to design and implement complex database schemas. His project on e-commerce platform demonstrated practical application of database principles. Highly recommended for any database-related role.',
        skills: JSON.stringify(['PostgreSQL', 'MongoDB', 'Database Design', 'SQL']),
        skillRatings: JSON.stringify({ 'PostgreSQL': 5, 'MongoDB': 4, 'Database Design': 5, 'SQL': 5 }),
        overallRating: 5,
        consent: true,
        verified: true,
      },
      {
        studentId,
        endorserName: 'Mr. Vikram Singh',
        endorserEmail: 'vikram.singh@techcorp.com',
        endorserRole: 'Senior Software Engineer',
        organization: 'TechCorp Solutions',
        relationship: 'Mentor',
        context: 'Summer Internship Program',
        message: 'I had the pleasure of mentoring Charan during his summer internship. He quickly adapted to our tech stack and contributed significantly to multiple projects. His code quality, attention to detail, and ability to work independently are remarkable for his experience level. He would be a valuable asset to any development team.',
        skills: JSON.stringify(['React', 'Node.js', 'Express.js', 'Team Collaboration']),
        skillRatings: JSON.stringify({ 'React': 5, 'Node.js': 4, 'Express.js': 5, 'Team Collaboration': 5 }),
        overallRating: 5,
        consent: true,
        verified: true,
      },
      {
        studentId,
        endorserName: 'Dr. Anjali Mehta',
        endorserEmail: 'anjali.mehta@presidencyuniversity.in',
        endorserRole: 'Head of Department',
        organization: 'Presidency University - Computer Science',
        relationship: 'Guide',
        context: 'Final Year Project',
        message: 'Charan\'s final year project on social media analytics dashboard showcased his expertise in full-stack development and data visualization. He demonstrated strong research capabilities and innovative thinking. His project received the Best Project Award, which is well-deserved. He is a motivated and talented student.',
        skills: JSON.stringify(['Full-Stack Development', 'Data Visualization', 'Research', 'Innovation']),
        skillRatings: JSON.stringify({ 'Full-Stack Development': 5, 'Data Visualization': 5, 'Research': 4, 'Innovation': 5 }),
        overallRating: 5,
        consent: true,
        verified: true,
      },
      {
        studentId,
        endorserName: 'Ms. Deepa Nair',
        endorserEmail: 'deepa.nair@startupxyz.com',
        endorserRole: 'Product Manager',
        organization: 'StartupXYZ',
        relationship: 'Manager',
        context: 'Hackathon 2024 - Winning Team',
        message: 'Charan was a key member of the winning team in our annual hackathon. His technical skills combined with excellent communication and leadership abilities made him stand out. He took initiative, mentored other team members, and delivered a polished product within the tight deadline. Exceptional performance!',
        skills: JSON.stringify(['Leadership', 'Communication', 'Problem Solving', 'JavaScript']),
        skillRatings: JSON.stringify({ 'Leadership': 5, 'Communication': 5, 'Problem Solving': 5, 'JavaScript': 5 }),
        overallRating: 5,
        consent: true,
        verified: true,
      },
    ];

    // Delete existing and add new
    await prisma.endorsement.deleteMany({ where: { studentId } });
    await prisma.endorsement.createMany({ data: endorsementsData });
    console.log(`✅ Added ${endorsementsData.length} endorsements`);

    // Verify the data was added
    console.log('\n📊 Verifying added data...');
    const verification = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        education: true,
        skills: true,
        projects: true,
        achievements: true,
        certifications: true,
        endorsements: true,
      },
    });

    console.log('\n✅ Summary:');
    console.log(`  Education: ${verification.education.length} records`);
    console.log(`  Skills: ${verification.skills.length} records`);
    console.log(`  Projects: ${verification.projects.length} records`);
    console.log(`  Achievements: ${verification.achievements.length} records`);
    console.log(`  Certifications: ${verification.certifications.length} records`);
    console.log(`  Endorsements: ${verification.endorsements.length} records`);

    console.log('\n🎉 Mock data added successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addMockData();