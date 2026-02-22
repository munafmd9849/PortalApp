import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDummyData() {
    const email = 'charansai82140@gmail.com';

    console.log(`Starting to add dummy data for ${email}...`);

    try {
        // 1. Find the User
        const user = await prisma.user.findUnique({
            where: { email },
            include: { student: true }
        });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            return;
        }

        if (!user.student) {
            console.error(`User ${email} does not have a student profile.`);
            return;
        }

        const studentId = user.student.id;
        console.log(`Found user: ${user.id}, student profile: ${studentId}`);

        // 1.5 Clear existing data
        await prisma.education.deleteMany({ where: { studentId } });
        await prisma.skill.deleteMany({ where: { studentId } });
        await prisma.project.deleteMany({ where: { studentId } });
        await prisma.achievement.deleteMany({ where: { studentId } });
        await prisma.certification.deleteMany({ where: { studentId } });
        await prisma.endorsement.deleteMany({ where: { studentId } });
        console.log('Cleared existing profile data.');

        // 2. Add Education
        await prisma.education.createMany({
            data: [
                {
                    studentId,
                    institution: 'National Institute of Technology, Warangal',
                    degree: 'B.Tech CPU',
                    startYear: 2020,
                    endYear: 2024,
                    cgpa: 8.5,
                    description: 'Focus on distributed systems and machine learning. Active member of the coding club.'
                },
                {
                    studentId,
                    institution: 'Sri Chaitanya Junior College',
                    degree: 'Intermediate',
                    startYear: 2018,
                    endYear: 2020,
                    cgpa: 9.8,
                    description: 'Secured state rank 150 in engineering entrance exam.'
                }
            ]
        });
        console.log('Added Education data.');

        // 3. Add Skills
        await prisma.skill.createMany({
            data: [
                { studentId, skillName: 'React.js', rating: 5 },
                { studentId, skillName: 'Node.js', rating: 4 },
                { studentId, skillName: 'Python', rating: 5 },
                { studentId, skillName: 'Docker', rating: 3 },
                { studentId, skillName: 'PostgreSQL', rating: 4 }
            ]
        });
        console.log('Added Skills data.');

        // 4. Add Projects
        await prisma.project.createMany({
            data: [
                {
                    studentId,
                    title: 'Portal App',
                    description: 'A comprehensive campus placement management system built with React and Node.js.',
                    liveUrl: 'https://github.com/charansai0108/PORTAL', // Schema uses liveUrl instead of url
                    technologies: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Tailwind CSS']) // Must be JSON string
                },
                {
                    studentId,
                    title: 'AI Image Generator',
                    description: 'A web app that uses Stable Diffusion API to generate images from text prompts.',
                    githubUrl: 'https://github.com/example/ai-image',
                    technologies: JSON.stringify(['Python', 'Flask', 'React'])
                }
            ]
        });
        console.log('Added Projects data.');

        // 5. Add Awards & Achievements
        await prisma.achievement.createMany({
            data: [
                {
                    studentId,
                    title: '1st Place, HackWarangal 2023',
                    date: new Date('2023-03-15'),
                    description: 'Built a solution for optimizing campus energy usage using IoT sensors. (Issued by NIT Warangal)'
                },
                {
                    studentId,
                    title: 'Top 100 on LeetCode India',
                    date: new Date('2023-01-10'),
                    description: 'Maintained a ranking within the top 100 active users in India for 3 consecutive months. (Issued by LeetCode)'
                }
            ]
        });
        console.log('Added Awards & Achievements data.');

        // 6. Add Certifications (Frontend uses Achievement table with hasCertificate: true)
        await prisma.achievement.createMany({
            data: [
                {
                    studentId,
                    title: 'AWS Certified Solutions Architect – Associate',
                    date: new Date('2023-05-10'),
                    description: 'Amazon Web Services',
                    hasCertificate: true,
                    certificateUrl: 'https://aws.amazon.com/verification'
                },
                {
                    studentId,
                    title: 'Meta Front-End Developer Professional Certificate',
                    date: new Date('2022-12-05'),
                    description: 'Coursera',
                    hasCertificate: true,
                    certificateUrl: 'https://coursera.org/verify/1234'
                }
            ]
        });
        console.log('Added Certifications data (as Achievements with hasCertificate true).');

        // 7. Add Endorsements (Wait for a reviewer user to exist, or just use a dummy sender logic)
        // First, let's find or create a dummy reviewer
        let reviewer = await prisma.user.findFirst({
            where: { email: 'reviewer@example.com' }
        });

        if (!reviewer) {
            reviewer = await prisma.user.create({
                data: {
                    email: 'reviewer@example.com',
                    passwordHash: 'dummyhash',
                    role: 'ADMIN',
                    displayName: 'Dr. John Smith',
                    status: 'ACTIVE'
                }
            });
            console.log('Created dummy reviewer user.');
        }

        await prisma.endorsement.createMany({
            data: [
                {
                    studentId,
                    endorserName: 'Dr. John Smith',
                    endorserEmail: 'reviewer@example.com',
                    endorserRole: 'Professor',
                    organization: 'NIT Warangal',
                    message: 'Charan is an exceptional student with a deep understanding of software engineering principles. His full-stack development skills are outstanding.',
                    relationship: 'Professor',
                    consent: true
                },
                {
                    studentId,
                    endorserName: 'Dr. Jane Doe',
                    endorserEmail: 'janedoe@example.com',
                    endorserRole: 'Project Manager',
                    organization: 'Tech Innovators Inc.',
                    message: 'A highly motivated individual who consistently delivers high-quality work. A great team player during our software engineering lab project.',
                    relationship: 'Manager',
                    consent: true
                }
            ]
        });
        console.log('Added Endorsements data.');

        console.log('Successfully completed adding dummy data!');

    } catch (error) {
        console.error('Error adding dummy data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addDummyData();
