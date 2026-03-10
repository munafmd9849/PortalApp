/**
 * Add Student Profile Data Script
 * 
 * Adds education, skills, projects, achievements, certifications, and endorsements
 * for all students with different data for each student.
 * 
 * Usage:
 *   node scripts/addStudentProfileData.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const STUDENT_EMAILS = [
  'munafmd9849@gmail.com',
  'munafmd7407@gmail.com',
  'ssdqwert13@gmail.com',
  'temp87981@gmail.com',
  'temp20086@gmail.com',
  'temp83437@gmail.com',
];

// Sample data templates for different students
const STUDENT_DATA = [
  {
    // Student 1: Backend Developer
    education: [
      { degree: 'B.Tech Computer Science', institution: 'PWIOI University', startYear: 2025, endYear: 2029, cgpa: 8.5 },
      { degree: 'Higher Secondary', institution: 'ABC School', startYear: 2023, endYear: 2025, cgpa: 9.2 },
    ],
    skills: [
      { skillName: 'Node.js', rating: 5 },
      { skillName: 'Python', rating: 4 },
      { skillName: 'PostgreSQL', rating: 4 },
      { skillName: 'MongoDB', rating: 3 },
      { skillName: 'Docker', rating: 4 },
      { skillName: 'AWS', rating: 3 },
      { skillName: 'REST API', rating: 5 },
      { skillName: 'Git', rating: 4 },
    ],
    projects: [
      {
        title: 'E-Commerce Backend API',
        description: 'RESTful API for e-commerce platform with payment integration',
        technologies: JSON.stringify(['Node.js', 'Express', 'PostgreSQL', 'Stripe API']),
        githubUrl: 'https://github.com/student1/ecommerce-api',
        liveUrl: 'https://ecommerce-api-demo.vercel.app',
      },
      {
        title: 'Real-time Chat Application',
        description: 'WebSocket-based chat app with rooms and file sharing',
        technologies: JSON.stringify(['Node.js', 'Socket.io', 'MongoDB', 'React']),
        githubUrl: 'https://github.com/student1/chat-app',
      },
    ],
    achievements: [
      {
        title: 'Hackathon Winner - TechFest 2025',
        description: 'Won first place in backend development category',
        date: new Date('2025-01-15'),
        hasCertificate: true,
        certificateUrl: 'https://example.com/certificates/hackathon-2025.pdf',
      },
      {
        title: 'Best Project Award',
        description: 'Awarded for outstanding e-commerce API project',
        date: new Date('2024-12-10'),
        hasCertificate: true,
      },
    ],
    certifications: [
      {
        title: 'AWS Certified Cloud Practitioner',
        description: 'Fundamentals of AWS cloud services',
        issuedDate: new Date('2024-11-01'),
        issuer: 'Amazon Web Services',
        certificateUrl: 'https://example.com/certificates/aws-ccp.pdf',
      },
      {
        title: 'MongoDB Certified Developer',
        description: 'MongoDB database development and administration',
        issuedDate: new Date('2024-09-15'),
        issuer: 'MongoDB University',
      },
    ],
    endorsements: JSON.stringify([
      {
        endorserName: 'Dr. John Smith',
        endorserEmail: 'john.smith@pwioi.com',
        endorserRole: 'Professor',
        organization: 'PWIOI University',
        message: 'Excellent problem-solving skills and strong understanding of backend architecture.',
        relatedSkills: ['Node.js', 'Database Design'],
        verified: true,
        submittedAt: new Date('2025-01-10').toISOString(),
      },
    ]),
  },
  {
    // Student 2: Full Stack Developer
    education: [
      { degree: 'B.Tech Information Technology', institution: 'PWIOI University', startYear: 2025, endYear: 2029, cgpa: 8.8 },
    ],
    skills: [
      { skillName: 'React', rating: 5 },
      { skillName: 'JavaScript', rating: 5 },
      { skillName: 'TypeScript', rating: 4 },
      { skillName: 'Node.js', rating: 4 },
      { skillName: 'Express', rating: 4 },
      { skillName: 'MySQL', rating: 4 },
      { skillName: 'Redux', rating: 3 },
      { skillName: 'Material-UI', rating: 4 },
    ],
    projects: [
      {
        title: 'Task Management Dashboard',
        description: 'Full-stack task management app with drag-and-drop functionality',
        technologies: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Material-UI']),
        githubUrl: 'https://github.com/student2/task-manager',
        liveUrl: 'https://task-manager-demo.vercel.app',
      },
      {
        title: 'Social Media Analytics Platform',
        description: 'Dashboard for analyzing social media metrics and trends',
        technologies: JSON.stringify(['React', 'Python', 'Django', 'Chart.js']),
        githubUrl: 'https://github.com/student2/social-analytics',
      },
    ],
    achievements: [
      {
        title: 'Dean\'s List - Fall 2024',
        description: 'Achieved top 5% GPA in the semester',
        date: new Date('2024-12-20'),
        hasCertificate: true,
      },
      {
        title: 'Open Source Contributor',
        description: 'Contributed to 10+ open source projects',
        date: new Date('2024-11-01'),
        hasCertificate: false,
      },
    ],
    certifications: [
      {
        title: 'Meta Front-End Developer Certificate',
        description: 'Comprehensive front-end development certification',
        issuedDate: new Date('2024-10-01'),
        issuer: 'Meta',
        certificateUrl: 'https://example.com/certificates/meta-frontend.pdf',
      },
    ],
    endorsements: JSON.stringify([
      {
        endorserName: 'Sarah Johnson',
        endorserEmail: 'sarah.j@techcorp.com',
        endorserRole: 'Senior Developer',
        organization: 'TechCorp Inc',
        message: 'Outstanding full-stack development skills. Great attention to detail and user experience.',
        relatedSkills: ['React', 'JavaScript'],
        verified: true,
        submittedAt: new Date('2025-01-05').toISOString(),
      },
    ]),
  },
  {
    // Student 3: Data Science & ML
    education: [
      { degree: 'B.Tech Data Science', institution: 'PWIOI University', startYear: 2025, endYear: 2029, cgpa: 9.0 },
      { degree: 'Data Science Bootcamp', institution: 'Online Academy', startYear: 2024, endYear: 2024, cgpa: null },
    ],
    skills: [
      { skillName: 'Python', rating: 5 },
      { skillName: 'Machine Learning', rating: 4 },
      { skillName: 'TensorFlow', rating: 4 },
      { skillName: 'Pandas', rating: 5 },
      { skillName: 'NumPy', rating: 5 },
      { skillName: 'Scikit-learn', rating: 4 },
      { skillName: 'Data Visualization', rating: 4 },
      { skillName: 'SQL', rating: 4 },
    ],
    projects: [
      {
        title: 'Customer Churn Prediction Model',
        description: 'ML model to predict customer churn using logistic regression and random forest',
        technologies: JSON.stringify(['Python', 'Scikit-learn', 'Pandas', 'Matplotlib']),
        githubUrl: 'https://github.com/student3/churn-prediction',
      },
      {
        title: 'Image Classification with CNN',
        description: 'Deep learning model for image classification using TensorFlow',
        technologies: JSON.stringify(['Python', 'TensorFlow', 'Keras', 'OpenCV']),
        githubUrl: 'https://github.com/student3/image-classifier',
      },
    ],
    achievements: [
      {
        title: 'Kaggle Competition - Top 10%',
        description: 'Achieved top 10% in house prices prediction competition',
        date: new Date('2024-12-01'),
        hasCertificate: true,
        certificateUrl: 'https://www.kaggle.com/certificates/kaggle-top10',
      },
      {
        title: 'Research Paper Published',
        description: 'Co-authored paper on machine learning applications',
        date: new Date('2024-10-15'),
        hasCertificate: false,
      },
    ],
    certifications: [
      {
        title: 'Google Data Analytics Certificate',
        description: 'Data analysis and visualization using Google tools',
        issuedDate: new Date('2024-08-01'),
        issuer: 'Google',
        certificateUrl: 'https://example.com/certificates/google-data-analytics.pdf',
      },
      {
        title: 'TensorFlow Developer Certificate',
        description: 'Deep learning and neural networks with TensorFlow',
        issuedDate: new Date('2024-11-15'),
        issuer: 'TensorFlow',
      },
    ],
    endorsements: JSON.stringify([
      {
        endorserName: 'Prof. Michael Chen',
        endorserEmail: 'm.chen@pwioi.com',
        endorserRole: 'Professor of Data Science',
        organization: 'PWIOI University',
        message: 'Exceptional analytical skills and deep understanding of machine learning algorithms.',
        relatedSkills: ['Machine Learning', 'Python'],
        verified: true,
        submittedAt: new Date('2025-01-08').toISOString(),
      },
    ]),
  },
  {
    // Student 4: Mobile App Developer
    education: [
      { degree: 'B.Tech Computer Science', institution: 'PWIOI University', startYear: 2025, endYear: 2029, cgpa: 8.3 },
    ],
    skills: [
      { skillName: 'React Native', rating: 5 },
      { skillName: 'Flutter', rating: 4 },
      { skillName: 'Dart', rating: 4 },
      { skillName: 'Firebase', rating: 4 },
      { skillName: 'iOS Development', rating: 3 },
      { skillName: 'Android Development', rating: 4 },
      { skillName: 'REST API', rating: 4 },
      { skillName: 'State Management', rating: 4 },
    ],
    projects: [
      {
        title: 'Fitness Tracking App',
        description: 'Cross-platform mobile app for tracking workouts and nutrition',
        technologies: JSON.stringify(['React Native', 'Firebase', 'Redux']),
        githubUrl: 'https://github.com/student4/fitness-app',
        liveUrl: 'https://play.google.com/store/apps/details?id=com.fitnessapp',
      },
      {
        title: 'E-Learning Mobile Platform',
        description: 'Flutter app for online courses with video streaming',
        technologies: JSON.stringify(['Flutter', 'Dart', 'Firebase', 'Video Player']),
        githubUrl: 'https://github.com/student4/elearning-app',
      },
    ],
    achievements: [
      {
        title: 'App Store Featured App',
        description: 'Fitness app featured in Google Play Store',
        date: new Date('2024-11-20'),
        hasCertificate: false,
      },
      {
        title: 'Mobile App Hackathon - Runner Up',
        description: 'Second place in mobile app development competition',
        date: new Date('2024-09-15'),
        hasCertificate: true,
      },
    ],
    certifications: [
      {
        title: 'Flutter Development Bootcamp',
        description: 'Complete Flutter development course',
        issuedDate: new Date('2024-07-01'),
        issuer: 'Udemy',
        certificateUrl: 'https://example.com/certificates/flutter-bootcamp.pdf',
      },
    ],
    endorsements: JSON.stringify([
      {
        endorserName: 'Alex Rodriguez',
        endorserEmail: 'alex.r@mobileapps.com',
        endorserRole: 'Mobile App Developer',
        organization: 'MobileApps Co',
        message: 'Strong mobile development skills with excellent UI/UX design sense.',
        relatedSkills: ['React Native', 'Flutter'],
        verified: true,
        submittedAt: new Date('2025-01-12').toISOString(),
      },
    ]),
  },
  {
    // Student 5: DevOps & Cloud Engineer
    education: [
      { degree: 'B.Tech Computer Science', institution: 'PWIOI University', startYear: 2025, endYear: 2029, cgpa: 8.6 },
    ],
    skills: [
      { skillName: 'Docker', rating: 5 },
      { skillName: 'Kubernetes', rating: 4 },
      { skillName: 'AWS', rating: 5 },
      { skillName: 'CI/CD', rating: 4 },
      { skillName: 'Terraform', rating: 4 },
      { skillName: 'Jenkins', rating: 4 },
      { skillName: 'Linux', rating: 5 },
      { skillName: 'Bash Scripting', rating: 4 },
    ],
    projects: [
      {
        title: 'CI/CD Pipeline Automation',
        description: 'Automated deployment pipeline using Jenkins and Docker',
        technologies: JSON.stringify(['Jenkins', 'Docker', 'GitHub Actions', 'AWS']),
        githubUrl: 'https://github.com/student5/cicd-pipeline',
      },
      {
        title: 'Infrastructure as Code',
        description: 'Terraform scripts for AWS infrastructure provisioning',
        technologies: JSON.stringify(['Terraform', 'AWS', 'CloudFormation']),
        githubUrl: 'https://github.com/student5/terraform-aws',
      },
    ],
    achievements: [
      {
        title: 'AWS Certified Solutions Architect',
        description: 'Associate level certification in AWS architecture',
        date: new Date('2024-12-01'),
        hasCertificate: true,
        certificateUrl: 'https://example.com/certificates/aws-saa.pdf',
      },
      {
        title: 'DevOps Excellence Award',
        description: 'Recognized for outstanding DevOps practices',
        date: new Date('2024-10-20'),
        hasCertificate: true,
      },
    ],
    certifications: [
      {
        title: 'AWS Certified Solutions Architect - Associate',
        description: 'Designing and deploying scalable systems on AWS',
        issuedDate: new Date('2024-12-01'),
        issuer: 'Amazon Web Services',
        certificateUrl: 'https://example.com/certificates/aws-saa.pdf',
      },
      {
        title: 'Kubernetes Administrator (CKA)',
        description: 'Certified Kubernetes Administrator',
        issuedDate: new Date('2024-09-15'),
        issuer: 'Cloud Native Computing Foundation',
      },
    ],
    endorsements: JSON.stringify([
      {
        endorserName: 'David Kim',
        endorserEmail: 'david.kim@cloudtech.com',
        endorserRole: 'DevOps Lead',
        organization: 'CloudTech Solutions',
        message: 'Excellent infrastructure management skills and deep knowledge of cloud platforms.',
        relatedSkills: ['AWS', 'Docker', 'Kubernetes'],
        verified: true,
        submittedAt: new Date('2025-01-15').toISOString(),
      },
    ]),
  },
  {
    // Student 6: Cybersecurity & Ethical Hacking
    education: [
      { degree: 'B.Tech Cyber Security', institution: 'PWIOI University', startYear: 2025, endYear: 2029, cgpa: 8.9 },
    ],
    skills: [
      { skillName: 'Penetration Testing', rating: 4 },
      { skillName: 'Network Security', rating: 5 },
      { skillName: 'Ethical Hacking', rating: 4 },
      { skillName: 'Python', rating: 4 },
      { skillName: 'Linux', rating: 5 },
      { skillName: 'Wireshark', rating: 4 },
      { skillName: 'Metasploit', rating: 3 },
      { skillName: 'Cryptography', rating: 4 },
    ],
    projects: [
      {
        title: 'Vulnerability Scanner Tool',
        description: 'Automated tool for scanning web application vulnerabilities',
        technologies: JSON.stringify(['Python', 'Nmap', 'SQL Injection', 'XSS Detection']),
        githubUrl: 'https://github.com/student6/vuln-scanner',
      },
      {
        title: 'Network Security Monitoring System',
        description: 'Real-time network traffic analysis and threat detection',
        technologies: JSON.stringify(['Python', 'Wireshark', 'Snort', 'ELK Stack']),
        githubUrl: 'https://github.com/student6/network-monitor',
      },
    ],
    achievements: [
      {
        title: 'Bug Bounty Program - Top Contributor',
        description: 'Found and reported 50+ security vulnerabilities',
        date: new Date('2024-11-30'),
        hasCertificate: true,
        certificateUrl: 'https://example.com/certificates/bug-bounty.pdf',
      },
      {
        title: 'CTF Competition Winner',
        description: 'First place in Capture The Flag cybersecurity competition',
        date: new Date('2024-09-25'),
        hasCertificate: true,
      },
    ],
    certifications: [
      {
        title: 'Certified Ethical Hacker (CEH)',
        description: 'Ethical hacking and penetration testing certification',
        issuedDate: new Date('2024-10-01'),
        issuer: 'EC-Council',
        certificateUrl: 'https://example.com/certificates/ceh.pdf',
      },
      {
        title: 'CompTIA Security+',
        description: 'Information security fundamentals and best practices',
        issuedDate: new Date('2024-08-15'),
        issuer: 'CompTIA',
      },
    ],
    endorsements: JSON.stringify([
      {
        endorserName: 'Dr. Lisa Wang',
        endorserEmail: 'l.wang@pwioi.com',
        endorserRole: 'Professor of Cybersecurity',
        organization: 'PWIOI University',
        message: 'Outstanding security analysis skills and ethical approach to penetration testing.',
        relatedSkills: ['Network Security', 'Ethical Hacking'],
        verified: true,
        submittedAt: new Date('2025-01-18').toISOString(),
      },
    ]),
  },
];

async function addProfileData() {
  console.log('📝 Adding profile data for students...\n');

  const results = {
    success: [],
    errors: [],
  };

  for (let i = 0; i < STUDENT_EMAILS.length; i++) {
    const email = STUDENT_EMAILS[i];
    const data = STUDENT_DATA[i];

    try {
      // Find student by email
      const student = await prisma.student.findUnique({
        where: { email },
        include: { user: true },
      });

      if (!student) {
        console.log(`⚠️  Student ${email} not found, skipping...`);
        results.errors.push({ email, error: 'Student not found' });
        continue;
      }

      // Check if data already exists
      const existingSkills = await prisma.skill.count({ where: { studentId: student.id } });
      if (existingSkills > 0) {
        console.log(`⚠️  Profile data already exists for ${email}, skipping...`);
        results.errors.push({ email, error: 'Data already exists' });
        continue;
      }

      // Add all data in transaction
      await prisma.$transaction(async (tx) => {
        // Add Education
        if (data.education && data.education.length > 0) {
          await tx.education.createMany({
            data: data.education.map(edu => ({
              studentId: student.id,
              ...edu,
            })),
          });
        }

        // Add Skills
        if (data.skills && data.skills.length > 0) {
          await tx.skill.createMany({
            data: data.skills.map(skill => ({
              studentId: student.id,
              ...skill,
            })),
          });
        }

        // Add Projects
        if (data.projects && data.projects.length > 0) {
          await tx.project.createMany({
            data: data.projects.map(project => ({
              studentId: student.id,
              ...project,
            })),
          });
        }

        // Add Achievements
        if (data.achievements && data.achievements.length > 0) {
          await tx.achievement.createMany({
            data: data.achievements.map(achievement => ({
              studentId: student.id,
              ...achievement,
            })),
          });
        }

        // Add Certifications
        if (data.certifications && data.certifications.length > 0) {
          await tx.certification.createMany({
            data: data.certifications.map(cert => ({
              studentId: student.id,
              ...cert,
            })),
          });
        }

        // Update Student with endorsements
        if (data.endorsements) {
          await tx.student.update({
            where: { id: student.id },
            data: { endorsementsData: data.endorsements },
          });
        }
      });

      console.log(`✅ Added profile data for: ${email}`);
      results.success.push({ email });
    } catch (error) {
      console.error(`❌ Error adding data for ${email}:`, error.message);
      results.errors.push({ email, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`✅ Successfully added data for: ${results.success.length} students`);
  console.log(`❌ Errors/Skipped: ${results.errors.length}`);
  console.log('='.repeat(60) + '\n');

  return results;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    console.error('Please set it in your .env file.\n');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    await addProfileData();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
