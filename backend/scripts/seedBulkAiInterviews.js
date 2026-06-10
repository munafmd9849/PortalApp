/**
 * Create 10 guided AI interviews + 10 conversational AI interviews for all students.
 * Run: node scripts/seedBulkAiInterviews.js
 */
import prisma from '../src/config/database.js';
import { createEnrollmentsForInterview } from '../src/utils/aiMockInterviewAssignment.js';

const GUIDED_TEMPLATES = [
  {
    title: 'Placement Readiness — Introduction & Goals',
    interviewType: 'PLACEMENT_READINESS',
    instructions: 'Speak clearly and look at the camera. Answer each question in your own words.',
    questions: [
      { questionText: 'Tell me about yourself and your academic background.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'What are your short-term and long-term career goals?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Why are you interested in campus placements?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'What strengths would you bring to an employer?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'How do you handle feedback and setbacks?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
    ],
  },
  {
    title: 'Technical Interview — Projects & Problem Solving',
    interviewType: 'TECHNICAL',
    instructions: 'Explain your technical work with concrete examples. Mention tools, trade-offs, and outcomes.',
    questions: [
      { questionText: 'Walk me through your most significant technical project.', prepTimeSeconds: 45, answerTimeSeconds: 180 },
      { questionText: 'What was the hardest bug or issue you solved, and how?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Which programming languages or stacks are you most comfortable with?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'How do you approach learning a new technology quickly?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Describe how you would design a simple scalable web service.', prepTimeSeconds: 45, answerTimeSeconds: 150 },
    ],
  },
  {
    title: 'HR Interview — Communication & Teamwork',
    interviewType: 'HR',
    instructions: 'Use STAR-style answers where helpful. Be honest and professional.',
    questions: [
      { questionText: 'Describe a time you worked effectively in a team.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Tell me about a conflict with a teammate and how you resolved it.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'How do you prioritize tasks when deadlines overlap?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'What motivates you to do your best work?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'Why should we hire you over other candidates?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
    ],
  },
  {
    title: 'Behavioral Interview — Leadership & Ownership',
    interviewType: 'BEHAVIORAL',
    instructions: 'Share real examples from academics, projects, internships, or extracurriculars.',
    questions: [
      { questionText: 'Describe a situation where you took initiative without being asked.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Tell me about a time you failed and what you learned.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Have you ever led a group? What was your approach?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'How do you handle pressure before an important deadline?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'What value do you add beyond technical skills?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
    ],
  },
  {
    title: 'Mixed Round — Aptitude & Awareness',
    interviewType: 'MIXED',
    instructions: 'Balance technical clarity with professional communication.',
    questions: [
      { questionText: 'Summarize your resume in two minutes.', prepTimeSeconds: 20, answerTimeSeconds: 120 },
      { questionText: 'Explain a recent technology trend you follow and why it matters.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'What is your understanding of the role you are preparing for?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'How do you stay updated in your field?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'Any questions you would ask an interviewer about the company?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
    ],
  },
  {
    title: 'DSA & Logic — Fundamentals',
    interviewType: 'TECHNICAL',
    instructions: 'Think aloud. Explain approach before diving into details.',
    questions: [
      { questionText: 'Explain time and space complexity in your own words with an example.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'When would you use a hash map versus a tree structure?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Describe how you would check if a string is a palindrome.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'What is the difference between BFS and DFS? When use each?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'How do you test your code before submitting it?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
    ],
  },
  {
    title: 'Resume Deep Dive',
    interviewType: 'PLACEMENT_READINESS',
    instructions: 'Be ready to defend every line on your resume with examples.',
    questions: [
      { questionText: 'Walk me through the top three items on your resume.', prepTimeSeconds: 30, answerTimeSeconds: 150 },
      { questionText: 'Elaborate on one internship, certification, or achievement listed.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'What gap or weakness on your resume would you address?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'How does your coursework connect to industry roles?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'What would you add to your resume in the next six months?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
    ],
  },
  {
    title: 'Company & Role Fit',
    interviewType: 'HR',
    instructions: 'Research-minded answers are welcome. Show genuine interest.',
    questions: [
      { questionText: 'What type of company culture do you thrive in?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Are you open to relocation or hybrid work? Why?', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'What salary or role expectations do you have realistically?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'How do you evaluate whether a job offer is right for you?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Where do you see yourself three years after joining?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
    ],
  },
  {
    title: 'System Design Basics',
    interviewType: 'TECHNICAL',
    instructions: 'Focus on requirements, components, and trade-offs.',
    questions: [
      { questionText: 'How would you design a URL shortener at a high level?', prepTimeSeconds: 45, answerTimeSeconds: 150 },
      { questionText: 'What is caching and when would you use it?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Explain client-server architecture in simple terms.', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'How do APIs fit into modern applications?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'What security practices do you follow in projects?', prepTimeSeconds: 30, answerTimeSeconds: 120 },
    ],
  },
  {
    title: 'Final Mock — Comprehensive Round',
    interviewType: 'MIXED',
    instructions: 'Treat this as a full mock before real placements. Stay calm and structured.',
    questions: [
      { questionText: 'Give a crisp self-introduction for a placement interview.', prepTimeSeconds: 20, answerTimeSeconds: 90 },
      { questionText: 'Discuss your strongest project and your exact contribution.', prepTimeSeconds: 45, answerTimeSeconds: 150 },
      { questionText: 'One technical concept you are confident explaining — go ahead.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'One behavioral example that shows maturity.', prepTimeSeconds: 30, answerTimeSeconds: 120 },
      { questionText: 'Closing statement: why you are placement-ready now.', prepTimeSeconds: 20, answerTimeSeconds: 90 },
    ],
  },
];

const CONVERSATIONAL_TEMPLATES = [
  {
    title: 'Conversational — Career Goals & Motivation',
    interviewType: 'PLACEMENT_READINESS',
    conversationalTopic: 'Career goals, motivation, and placement readiness',
    conversationalMaxTurns: 8,
  },
  {
    title: 'Conversational — Technical Depth',
    interviewType: 'TECHNICAL',
    conversationalTopic: 'Technical projects, problem-solving approach, and stack preferences',
    conversationalMaxTurns: 8,
  },
  {
    title: 'Conversational — Teamwork & Communication',
    interviewType: 'HR',
    conversationalTopic: 'Teamwork, communication style, and handling conflict',
    conversationalMaxTurns: 7,
  },
  {
    title: 'Conversational — Leadership Stories',
    interviewType: 'BEHAVIORAL',
    conversationalTopic: 'Leadership, ownership, and learning from failure',
    conversationalMaxTurns: 8,
  },
  {
    title: 'Conversational — Resume & Experience',
    interviewType: 'PLACEMENT_READINESS',
    conversationalTopic: 'Resume highlights, internships, and skill evidence',
    conversationalMaxTurns: 7,
  },
  {
    title: 'Conversational — DSA & Coding Mindset',
    interviewType: 'TECHNICAL',
    conversationalTopic: 'Data structures, algorithms, and coding interview preparation',
    conversationalMaxTurns: 8,
  },
  {
    title: 'Conversational — Company Research',
    interviewType: 'HR',
    conversationalTopic: 'Company fit, work culture, and role expectations',
    conversationalMaxTurns: 6,
  },
  {
    title: 'Conversational — System Thinking',
    interviewType: 'TECHNICAL',
    conversationalTopic: 'System design intuition, scalability, and trade-offs',
    conversationalMaxTurns: 8,
  },
  {
    title: 'Conversational — Stress & Time Management',
    interviewType: 'BEHAVIORAL',
    conversationalTopic: 'Pressure, deadlines, and balancing academics with prep',
    conversationalMaxTurns: 7,
  },
  {
    title: 'Conversational — Final Placement Check-in',
    interviewType: 'MIXED',
    conversationalTopic: 'Overall placement readiness, gaps, and improvement plan',
    conversationalMaxTurns: 8,
  },
];

function buildWindow() {
  const startDate = new Date();
  startDate.setMinutes(startDate.getMinutes() - 5);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  return { startDate, endDate };
}

async function createGuidedInterview(template, studentIds, window) {
  const interview = await prisma.aiMockInterview.create({
    data: {
      title: template.title,
      description: `Guided AI mock interview — ${template.interviewType}. Assigned to all students.`,
      sessionMode: 'GUIDED',
      interviewType: template.interviewType,
      instructions: template.instructions,
      startDate: window.startDate,
      endDate: window.endDate,
      targetBatches: '[]',
      targetBranches: '[]',
      targetCenters: '[]',
      targetSchoolIds: '[]',
      targetStudentIds: JSON.stringify(studentIds),
      status: 'PUBLISHED',
    },
  });

  await prisma.aiMockInterviewQuestion.createMany({
    data: template.questions.map((q, idx) => ({
      interviewId: interview.id,
      orderIndex: idx,
      questionText: q.questionText,
      prepTimeSeconds: q.prepTimeSeconds,
      answerTimeSeconds: q.answerTimeSeconds,
      mandatory: true,
    })),
  });

  const enrolled = await createEnrollmentsForInterview(interview.id, studentIds);
  return { interview, enrolled, questionCount: template.questions.length };
}

async function createConversationalInterview(template, studentIds, window) {
  const interview = await prisma.aiMockInterview.create({
    data: {
      title: template.title,
      description: `Conversational AI mock interview — dynamic follow-ups on: ${template.conversationalTopic}`,
      sessionMode: 'CONVERSATIONAL',
      interviewType: template.interviewType,
      instructions:
        'The AI will adapt each question based on your previous answers. Answer naturally while looking at the camera.',
      conversationalTopic: template.conversationalTopic,
      conversationalMaxTurns: template.conversationalMaxTurns,
      startDate: window.startDate,
      endDate: window.endDate,
      targetBatches: '[]',
      targetBranches: '[]',
      targetCenters: '[]',
      targetSchoolIds: '[]',
      targetStudentIds: JSON.stringify(studentIds),
      status: 'PUBLISHED',
    },
  });

  const enrolled = await createEnrollmentsForInterview(interview.id, studentIds);
  return { interview, enrolled };
}

async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: 'asc' },
  });

  if (!students.length) {
    console.error('No students found in the database.');
    process.exit(1);
  }

  const studentIds = students.map((s) => s.id);
  const window = buildWindow();

  console.log(`\nSeeding interviews for ${students.length} student(s):`);
  students.forEach((s) => console.log(`  - ${s.fullName} <${s.email}>`));
  console.log(`Window: ${window.startDate.toISOString()} → ${window.endDate.toISOString()}\n`);

  const guided = [];
  for (const template of GUIDED_TEMPLATES) {
    const result = await createGuidedInterview(template, studentIds, window);
    guided.push(result);
    console.log(`✓ Guided: ${template.title} (${result.enrolled} enrollments, ${result.questionCount} questions)`);
  }

  const conversational = [];
  for (const template of CONVERSATIONAL_TEMPLATES) {
    const result = await createConversationalInterview(template, studentIds, window);
    conversational.push(result);
    console.log(`✓ Conversational: ${template.title} (${result.enrolled} enrollments)`);
  }

  const totalEnrollments =
    guided.reduce((n, g) => n + g.enrolled, 0) +
    conversational.reduce((n, c) => n + c.enrolled, 0);

  console.log('\n✅ Done\n');
  console.log(`Guided interviews:         ${guided.length}`);
  console.log(`Conversational interviews: ${conversational.length}`);
  console.log(`Total enrollments created: ${totalEnrollments}`);
  console.log(`Students per interview:    ${studentIds.length}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
