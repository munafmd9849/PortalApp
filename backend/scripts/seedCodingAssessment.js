/**
 * Creates a coding assessment with sample questions and assigns batch 2024-2028.
 * Run: node scripts/seedCodingAssessment.js
 */
import prisma from '../src/config/database.js';
import {
  serializeTestCasesForStorage,
  serializeExamplesForStorage,
} from '../src/coding-engine/testCaseStorage.js';
import { serializeStarterCodesForStorage } from '../src/coding-engine/starterCodeStorage.js';
import { findStudentsForBatchIds } from '../src/utils/studentAssignmentScope.js';

const BATCH_YEAR = '2024-2028';

const QUESTIONS = [
  {
    text: 'Factorial',
    description:
      'Given a non-negative integer n, return n! (factorial of n).\n\nThe factorial of n is the product of all positive integers less than or equal to n.',
    constraints: '0 <= n <= 12',
    examples: [
      { input: '5', output: '120', explanation: '5! = 5 × 4 × 3 × 2 × 1 = 120' },
      { input: '0', output: '1', explanation: '0! is defined as 1' },
    ],
    starterCode: `function solution(input) {
  const n = Number(input);
  if (n < 0) return '0';
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return String(result);
}
`,
    testCases: [
      { input: '0', expectedOutput: '1', hidden: false },
      { input: '5', expectedOutput: '120', hidden: false },
      { input: '7', expectedOutput: '5040', hidden: true },
    ],
    points: 10,
    difficulty: 'EASY',
  },
  {
    text: 'Reverse String',
    description:
      'Given a string s, return the reversed string.\n\nYou may assume s contains only printable ASCII characters.',
    constraints: '1 <= s.length <= 10^5',
    examples: [
      { input: 'hello', output: 'olleh', explanation: '' },
      { input: 'PWIOI', output: 'IOIWP', explanation: '' },
    ],
    starterCode: `function solution(input) {
  const s = String(input);
  return s.split('').reverse().join('');
}
`,
    testCases: [
      { input: 'hello', expectedOutput: 'olleh', hidden: false },
      { input: 'abc', expectedOutput: 'cba', hidden: false },
      { input: 'racecar', expectedOutput: 'racecar', hidden: true },
    ],
    points: 10,
    difficulty: 'EASY',
  },
  {
    text: 'Two Sum',
    description:
      'Given an array of integers nums and an integer target, return the indices (0-based) of the two numbers that add up to target.\n\nReturn the answer as a JSON array string, e.g. "[0,1]". Exactly one solution exists.',
    constraints:
      '2 <= nums.length <= 10^4\n-10^9 <= nums[i], target <= 10^9',
    examples: [
      {
        input: '{"nums":[2,7,11,15],"target":9}',
        output: '[0,1]',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
      },
    ],
    starterCode: `function solution(input) {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  const { nums, target } = data;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return JSON.stringify([i, j]);
      }
    }
  }
  return '[]';
}
`,
    testCases: [
      {
        input: '{"nums":[2,7,11,15],"target":9}',
        expectedOutput: '[0,1]',
        hidden: false,
      },
      {
        input: '{"nums":[3,2,4],"target":6}',
        expectedOutput: '[1,2]',
        hidden: false,
      },
      {
        input: '{"nums":[3,3],"target":6}',
        expectedOutput: '[0,1]',
        hidden: true,
      },
    ],
    points: 20,
    difficulty: 'MEDIUM',
  },
];

async function main() {
  const batch = await prisma.batch.findFirst({
    where: {
      OR: [
        { year: BATCH_YEAR },
        { label: { contains: '24-28', mode: 'insensitive' } },
      ],
    },
  });

  if (!batch) {
    console.error(`Batch "${BATCH_YEAR}" not found. Create it in Admin → Batches first.`);
    process.exit(1);
  }

  const existing = await prisma.assessment.findFirst({
    where: {
      title: 'Coding Practice Assessment (2024-2028)',
      type: 'CODING_TEST',
    },
  });

  if (existing) {
    console.log('Assessment already exists:', existing.id);
    console.log('Title:', existing.title);
    process.exit(0);
  }

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 30);

  const batchStudents = await findStudentsForBatchIds([batch.id]);
  const studentAssignments = batchStudents.map((s) => ({ studentId: s.id }));

  const assessment = await prisma.assessment.create({
    data: {
      title: 'Coding Practice Assessment (2024-2028)',
      description:
        'Practice coding problems with automated test cases. Use solution(input) in JavaScript/Python or static solution in Java.',
      type: 'CODING_TEST',
      difficulty: 'MEDIUM',
      duration: 60,
      startTime: now,
      endTime: end,
      instructions:
        '1. Read each problem in the left panel.\n2. Implement solution(input).\n3. Use Run tests before Submit.\n4. Fullscreen and camera proctoring apply if enabled.',
      config: JSON.stringify({
        joinWindow: { opensMinutesBeforeStart: 60, closesMinutesAfterStart: 120 },
        coding: { allowedLanguages: ['javascript', 'python'] },
      }),
      questions: {
        create: QUESTIONS.map((q, index) => ({
          questionText: q.text,
          description: q.description,
          type: 'CODING',
          options: JSON.stringify([]),
          correctAnswer: null,
          points: q.points,
          difficulty: q.difficulty,
          starterCode: serializeStarterCodesForStorage({ javascript: q.starterCode }),
          constraints: q.constraints,
          examples: serializeExamplesForStorage(q.examples),
          testCases: serializeTestCasesForStorage(q.testCases),
          order: index,
        })),
      },
      assignments: {
        create: [
          { batchId: batch.id },
          ...studentAssignments,
        ],
      },
    },
    include: { questions: true, assignments: true },
  });

  console.log('Created coding assessment');
  console.log('  ID:', assessment.id);
  console.log('  Title:', assessment.title);
  console.log('  Batch:', batch.year, `(${batch.label || batch.id})`);
  console.log('  Questions:', assessment.questions.length);
  console.log('  Assignments:', assessment.assignments.length);
  console.log('  Students in batch:', batchStudents.length);
  console.log('  Window:', now.toISOString(), '→', end.toISOString());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
