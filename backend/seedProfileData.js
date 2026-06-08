import 'dotenv/config';
import prisma from './src/config/database.js';

async function addDummyData() {
  const email = 'charansai82140@gmail.com';

  console.log(`Starting to add profile data for ${email}...`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { student: true },
    });

    if (!user?.student) {
      console.error(`Student profile not found for ${email}`);
      return;
    }

    const studentId = user.student.id;
    const { school, center, batch } = user.student;
    console.log(`Found student: ${user.student.fullName} (${studentId})`);

    await prisma.education.deleteMany({ where: { studentId } });
    await prisma.skill.deleteMany({ where: { studentId } });
    await prisma.project.deleteMany({ where: { studentId } });
    await prisma.achievement.deleteMany({ where: { studentId } });
    await prisma.certification.deleteMany({ where: { studentId } });
    await prisma.endorsement.deleteMany({ where: { studentId } });
    console.log('Cleared existing profile data.');

    const batchStart = batch ? parseInt(batch.split('-')[0], 10) : 2024;
    const batchEnd = batch ? parseInt(batch.split('-')[1], 10) : 2028;

    await prisma.education.createMany({
      data: [
        {
          studentId,
          institution: school ? `${school} — ${center || 'Campus'}` : 'School of Technology',
          degree: 'B.Tech Computer Science',
          startYear: batchStart,
          endYear: batchEnd,
          cgpa: 8.6,
          description: 'Core coursework in DSA, DBMS, OS, and full-stack development. Active in placement prep and hackathons.',
        },
        {
          studentId,
          institution: 'Narayana Junior College',
          degree: 'Intermediate (MPC)',
          startYear: batchStart - 2,
          endYear: batchStart,
          cgpa: 9.2,
          description: 'Science stream with focus on mathematics and physics.',
        },
      ],
    });
    console.log('Added education.');

    await prisma.skill.createMany({
      data: [
        { studentId, skillName: 'JavaScript', rating: 5 },
        { studentId, skillName: 'React', rating: 5 },
        { studentId, skillName: 'Node.js', rating: 4 },
        { studentId, skillName: 'Python', rating: 4 },
        { studentId, skillName: 'PostgreSQL', rating: 4 },
        { studentId, skillName: 'Data Structures', rating: 5 },
        { studentId, skillName: 'System Design', rating: 3 },
      ],
    });
    console.log('Added skills.');

    await prisma.project.createMany({
      data: [
        {
          studentId,
          title: 'Placement Portal',
          description:
            'Campus placement management platform with job drives, assessments, mock interviews, and student tracking.',
          liveUrl: 'https://github.com/charansai0108/PORTAL',
          githubUrl: 'https://github.com/charansai0108/PORTAL',
          technologies: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Prisma', 'Tailwind CSS']),
        },
        {
          studentId,
          title: 'Coding Assessment Engine',
          description:
            'LeetCode-style coding workspace with multi-language support, test cases, and automated evaluation.',
          githubUrl: 'https://github.com/charansai0108/PORTAL',
          technologies: JSON.stringify(['JavaScript', 'Monaco Editor', 'Express']),
        },
        {
          studentId,
          title: 'AI Mock Interview Module',
          description:
            'One-way video mock interviews with proctoring, timed questions, and admin review workflow.',
          technologies: JSON.stringify(['React', 'WebRTC', 'Mistral AI']),
        },
      ],
    });
    console.log('Added projects.');

    await prisma.achievement.createMany({
      data: [
        {
          studentId,
          title: 'Winner — Internal Hackathon 2025',
          date: new Date('2025-02-14'),
          description: 'Built an AI-assisted placement readiness dashboard. Issued by Placement Cell.',
          hasCertificate: false,
        },
        {
          studentId,
          title: '500+ LeetCode Problems Solved',
          date: new Date('2025-11-01'),
          description: 'Consistent DSA practice with focus on arrays, graphs, and dynamic programming.',
          hasCertificate: false,
        },
        {
          studentId,
          title: 'Smart India Hackathon — College Finalist',
          date: new Date('2024-09-20'),
          description: 'Team project on student employability analytics.',
          hasCertificate: false,
        },
      ],
    });
    console.log('Added awards & achievements.');

    await prisma.certification.createMany({
      data: [
        {
          studentId,
          title: 'AWS Cloud Practitioner',
          issuer: 'Amazon Web Services',
          issuedDate: new Date('2025-06-01'),
          certificateUrl: 'https://aws.amazon.com/verification/example',
          description: 'Foundational cloud concepts, security, and AWS services.',
        },
        {
          studentId,
          title: 'Meta Front-End Developer',
          issuer: 'Coursera / Meta',
          issuedDate: new Date('2024-12-10'),
          certificateUrl: 'https://coursera.org/verify/example',
          description: 'HTML, CSS, JavaScript, React, and responsive design.',
        },
      ],
    });
    console.log('Added certificates.');

    await prisma.endorsement.createMany({
      data: [
        {
          studentId,
          endorserName: 'Dr. Ramesh Kumar',
          endorserEmail: 'ramesh.kumar@pwioi.live',
          endorserRole: 'Placement Coordinator',
          organization: 'PW IOI',
          relationship: 'Faculty',
          context: 'Placement preparation mentor',
          message:
            'Charan demonstrates strong full-stack skills and ownership. He consistently delivers clean code and communicates well in team settings.',
          skills: JSON.stringify(['React', 'Node.js', 'Problem Solving']),
          skillRatings: JSON.stringify({ React: 5, 'Node.js': 4, 'Problem Solving': 5 }),
          overallRating: 5,
          consent: true,
          verified: true,
        },
        {
          studentId,
          endorserName: 'Priya Sharma',
          endorserEmail: 'priya.sharma@techcorp.com',
          endorserRole: 'Senior Software Engineer',
          organization: 'TechCorp',
          relationship: 'Industry Mentor',
          context: 'Summer internship project guide',
          message:
            'Reliable developer with good grasp of system design basics. Would recommend for product engineering roles.',
          skills: JSON.stringify(['JavaScript', 'System Design', 'Teamwork']),
          skillRatings: JSON.stringify({ JavaScript: 5, 'System Design': 4, Teamwork: 5 }),
          overallRating: 4,
          consent: true,
          verified: true,
        },
      ],
    });
    console.log('Added endorsements.');

    console.log('Successfully added profile data!');
  } catch (error) {
    console.error('Error adding profile data:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

addDummyData();
