/**
 * Create a published AI Guided Interview for one student by email.
 * Run: node scripts/seedAiMockInterview.js charansai82140@gmail.com
 */
import prisma from '../src/config/database.js';
import { createEnrollmentsForInterview } from '../src/utils/aiMockInterviewAssignment.js';

const STUDENT_EMAIL = process.argv[2] || 'charansai82140@gmail.com';

const QUESTIONS = [
  {
    questionText: 'Tell me about yourself and your academic background.',
    notes: 'Focus on education, interests, and career goals.',
    prepTimeSeconds: 30,
    answerTimeSeconds: 120,
  },
  {
    questionText: 'Can you explain your final year project or the most significant project you have worked on?',
    notes: 'Look for role, tech stack, and outcomes.',
    prepTimeSeconds: 45,
    answerTimeSeconds: 180,
  },
  {
    questionText: 'What was the biggest technical challenge you faced in that project, and how did you solve it?',
    prepTimeSeconds: 30,
    answerTimeSeconds: 120,
  },
  {
    questionText: 'Describe a situation where you worked in a team. What was your contribution?',
    prepTimeSeconds: 30,
    answerTimeSeconds: 120,
  },
  {
    questionText: 'Where do you see yourself in the next three to five years, and how does this role align with your goals?',
    prepTimeSeconds: 30,
    answerTimeSeconds: 120,
  },
];

async function main() {
  const student = await prisma.student.findFirst({
    where: { email: { equals: STUDENT_EMAIL, mode: 'insensitive' } },
    select: { id: true, fullName: true, email: true, batch: true },
  });

  if (!student) {
    console.error(`No student found with email: ${STUDENT_EMAIL}`);
    process.exit(1);
  }

  const startDate = new Date();
  startDate.setMinutes(startDate.getMinutes() - 5);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);

  const title = `Guided AI Interview — ${student.fullName || student.email} (${new Date().toLocaleDateString()})`;

  const interview = await prisma.aiMockInterview.create({
    data: {
      title,
      description: 'Placement readiness guided AI interview with voice acknowledgements and proctoring.',
      interviewType: 'PLACEMENT_READINESS',
      instructions:
        'Answer each question clearly while looking at the camera. The AI interviewer will acknowledge your response before moving to the next question.',
      startDate,
      endDate,
      targetBatches: '[]',
      targetBranches: '[]',
      targetCenters: '[]',
      targetSchoolIds: '[]',
      targetStudentIds: JSON.stringify([student.id]),
      status: 'PUBLISHED',
    },
  });

  await prisma.aiMockInterviewQuestion.createMany({
    data: QUESTIONS.map((q, idx) => ({
      interviewId: interview.id,
      orderIndex: idx,
      questionText: q.questionText,
      notes: q.notes || null,
      prepTimeSeconds: q.prepTimeSeconds,
      answerTimeSeconds: q.answerTimeSeconds,
      mandatory: true,
    })),
  });

  const enrolled = await createEnrollmentsForInterview(interview.id, [student.id]);

  const full = await prisma.aiMockInterview.findUnique({
    where: { id: interview.id },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
      enrollments: { where: { studentId: student.id } },
    },
  });

  console.log('\n✅ AI Guided Interview created\n');
  console.log(`Interview ID:   ${interview.id}`);
  console.log(`Title:          ${title}`);
  console.log(`Student:        ${student.fullName} <${student.email}>`);
  console.log(`Questions:      ${full.questions.length}`);
  console.log(`Enrollments:    ${enrolled}`);
  console.log(`Window:         ${startDate.toISOString()} → ${endDate.toISOString()}`);
  console.log(`\nStudent URL:    http://localhost:5173/student/interviews/${interview.id}`);
  console.log(`Admin review:   http://localhost:5173/admin/mock-interviews/${interview.id}/review\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
