import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding 5 jobs in IN_REVIEW status...');

  const jobs = [
    {
      jobTitle: 'Software Engineer (Frontend)',
      description: 'We are looking for a React developer to join our core product team. You will work on building high-performance web applications.',
      requirements: 'Strong knowledge of React, JavaScript, and Tailwind CSS.',
      requiredSkills: 'React, JavaScript, CSS, HTML5',
      applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      driveVenues: 'Bangalore Office / Online',
      targetSchools: JSON.stringify(['SOT']),
      targetCenters: JSON.stringify(['BANGALORE']),
      targetBatches: JSON.stringify(['23-27']),
      status: 'IN_REVIEW',
      isActive: false,
      isPosted: false,
      salary: '12 - 18 LPA',
      location: 'Bangalore',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      spocs: 'Placement Team',
    },
    {
      jobTitle: 'Backend Developer (Node.js)',
      description: 'Join our backend team to build scalable APIs and microservices using Node.js and PostgreSQL.',
      requirements: 'Experience with Node.js, Express, and SQL databases.',
      requiredSkills: 'Node.js, Express, PostgreSQL, Redis',
      applicationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      driveVenues: 'Online',
      targetSchools: JSON.stringify(['SOT']),
      targetCenters: JSON.stringify(['NOIDA', 'PUNE']),
      targetBatches: JSON.stringify(['23-27', '24-28']),
      status: 'IN_REVIEW',
      isActive: false,
      isPosted: false,
      salary: '15 - 22 LPA',
      location: 'Remote / Noida',
      jobType: 'Full-time',
      workMode: 'Remote',
      spocs: 'Admin Dept',
    },
    {
      jobTitle: 'Product Manager Intern',
      description: 'Help us shape the future of our product. You will work closely with engineering and design teams.',
      requirements: 'Good communication skills and analytical mindset.',
      requiredSkills: 'Product Management, Agile, Analytics',
      applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      driveVenues: 'Office',
      targetSchools: JSON.stringify(['SOM']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['24-28']),
      status: 'IN_REVIEW',
      isActive: false,
      isPosted: false,
      salary: '40,000 - 60,000 per month',
      location: 'Mumbai',
      jobType: 'Internship',
      workMode: 'In-office',
      spocs: 'Internship Cell',
    },
    {
      jobTitle: 'Data Analyst',
      description: 'Extract insights from our vast dataset to drive business decisions.',
      requirements: 'Proficiency in Python, SQL, and data visualization tools.',
      requiredSkills: 'Python, SQL, Tableau, Statistics',
      applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      driveVenues: 'Pune Campus',
      targetSchools: JSON.stringify(['SOT', 'SOM']),
      targetCenters: JSON.stringify(['PUNE']),
      targetBatches: JSON.stringify(['23-27']),
      status: 'IN_REVIEW',
      isActive: false,
      isPosted: false,
      salary: '8 - 12 LPA',
      location: 'Pune',
      jobType: 'Full-time',
      workMode: 'In-office',
      spocs: 'Corporate Relations',
    },
    {
      jobTitle: 'Business Development Associate',
      description: 'Drive growth by identifying new business opportunities and building relationships.',
      requirements: 'Sales experience and networking skills.',
      requiredSkills: 'Sales, Marketing, Networking',
      applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      driveVenues: 'Hotel Grand Residency',
      targetSchools: JSON.stringify(['SOM', 'SOH']),
      targetCenters: JSON.stringify(['BANGALORE', 'NOIDA']),
      targetBatches: JSON.stringify(['ALL']),
      status: 'IN_REVIEW',
      isActive: false,
      isPosted: false,
      salary: '6 - 10 LPA + Incentives',
      location: 'Bangalore / Noida',
      jobType: 'Full-time',
      workMode: 'On-field',
      spocs: 'Sales Lead',
    }
  ];

  for (const job of jobs) {
    const createdJob = await prisma.job.create({
      data: job
    });
    console.log(`✅ Created Job: ${createdJob.jobTitle} (ID: ${createdJob.id})`);
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
