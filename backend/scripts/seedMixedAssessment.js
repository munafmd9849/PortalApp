/**
 * Creates a 25-question mixed assessment (MCQ + Coding + Descriptive)
 * with all coding languages, assigned to batch 2024-2028.
 * Run: node scripts/seedMixedAssessment.js
 */
import prisma from '../src/config/database.js';
import {
  serializeTestCasesForStorage,
  serializeExamplesForStorage,
} from '../src/coding-engine/testCaseStorage.js';
import { serializeStarterCodesForStorage } from '../src/coding-engine/starterCodeStorage.js';
import { findStudentsForBatchIds } from '../src/utils/studentAssignmentScope.js';

const BATCH_YEAR = '2024-2028';
const ASSESSMENT_TITLE = 'Comprehensive Mixed Assessment (2024-2028)';
const ALL_LANGS = ['javascript', 'python', 'java', 'cpp'];

const MCQ_QUESTIONS = [
  {
    text: 'Time complexity of binary search on a sorted array?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correctAnswer: '1',
    points: 2,
    difficulty: 'EASY',
  },
  {
    text: 'Which data structure uses LIFO order?',
    options: ['Queue', 'Stack', 'Tree', 'Graph'],
    correctAnswer: '1',
    points: 2,
    difficulty: 'EASY',
  },
  {
    text: 'HTTP status code for "Not Found"?',
    options: ['200', '301', '404', '500'],
    correctAnswer: '2',
    points: 2,
    difficulty: 'EASY',
  },
  {
    text: 'Primary key in a relational database must be:',
    options: ['Nullable', 'Unique and not null', 'Always numeric', 'Composite only'],
    correctAnswer: '1',
    points: 2,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Which sorting algorithm is stable by default?',
    options: ['Quick Sort', 'Heap Sort', 'Merge Sort', 'Selection Sort'],
    correctAnswer: '2',
    points: 2,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Git command to create a new branch and switch to it?',
    options: ['git merge', 'git checkout -b', 'git pull', 'git stash'],
    correctAnswer: '1',
    points: 2,
    difficulty: 'EASY',
  },
  {
    text: 'In OOP, hiding internal state and exposing methods is called:',
    options: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Abstraction'],
    correctAnswer: '2',
    points: 2,
    difficulty: 'MEDIUM',
  },
  {
    text: 'TCP vs UDP — which guarantees delivery and ordering?',
    options: ['UDP', 'TCP', 'Both', 'Neither'],
    correctAnswer: '1',
    points: 2,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Big-O of inserting at the end of a dynamic array (amortized)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctAnswer: '0',
    points: 2,
    difficulty: 'MEDIUM',
  },
  {
    text: 'SQL clause used to filter groups after aggregation?',
    options: ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'],
    correctAnswer: '1',
    points: 2,
    difficulty: 'MEDIUM',
  },
];

const CODING_QUESTIONS = [
  {
    text: 'Factorial',
    description: 'Return n! for non-negative integer n (0 <= n <= 12).',
    constraints: '0 <= n <= 12',
    examples: [{ input: '5', output: '120', explanation: '5! = 120' }],
    starterCodes: {
      javascript: `function solution(input) {
  const n = Number(input);
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return String(r);
}`,
      python: `def solution(input):
    n = int(input)
    r = 1
    for i in range(2, n + 1):
        r *= i
    return str(r)`,
      java: `public static String solution(String input) {
    int n = Integer.parseInt(input.trim());
    long r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return String.valueOf(r);
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    int n = stoi(input);
    long long r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return to_string(r);
}`,
    },
    testCases: [
      { input: '0', expectedOutput: '1', hidden: false },
      { input: '5', expectedOutput: '120', hidden: false },
      { input: '7', expectedOutput: '5040', hidden: true },
    ],
    points: 4,
    difficulty: 'EASY',
  },
  {
    text: 'Reverse String',
    description: 'Return the reversed string s.',
    constraints: '1 <= s.length <= 10^5',
    examples: [{ input: 'hello', output: 'olleh', explanation: '' }],
    starterCodes: {
      javascript: `function solution(input) {
  return String(input).split('').reverse().join('');
}`,
      python: `def solution(input):
    return str(input)[::-1]`,
      java: `public static String solution(String input) {
    return new StringBuilder(input).reverse().toString();
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    reverse(input.begin(), input.end());
    return input;
}`,
    },
    testCases: [
      { input: 'hello', expectedOutput: 'olleh', hidden: false },
      { input: 'abc', expectedOutput: 'cba', hidden: false },
      { input: 'racecar', expectedOutput: 'racecar', hidden: true },
    ],
    points: 4,
    difficulty: 'EASY',
  },
  {
    text: 'Sum of Array',
    description: 'Given JSON array of integers, return the sum as a string.',
    constraints: '1 <= length <= 10^4',
    examples: [{ input: '[1,2,3,4]', output: '10', explanation: '' }],
    starterCodes: {
      javascript: `function solution(input) {
  const arr = typeof input === 'string' ? JSON.parse(input) : input;
  return String(arr.reduce((a, b) => a + b, 0));
}`,
      python: `import json
def solution(input):
    arr = json.loads(input) if isinstance(input, str) else input
    return str(sum(arr))`,
      java: `import java.util.*;
public static String solution(String input) {
    input = input.trim().replace("[","").replace("]","");
    if (input.isEmpty()) return "0";
    int sum = 0;
    for (String p : input.split(",")) sum += Integer.parseInt(p.trim());
    return String.valueOf(sum);
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    int sum = 0, num = 0, sign = 1;
    for (char c : input) {
        if (c == '-') sign = -1;
        else if (isdigit(c)) num = num * 10 + (c - '0');
        else if (c == ',' || c == ']') { sum += sign * num; num = 0; sign = 1; }
    }
    if (num) sum += sign * num;
    return to_string(sum);
}`,
    },
    testCases: [
      { input: '[1,2,3,4]', expectedOutput: '10', hidden: false },
      { input: '[10,-2,5]', expectedOutput: '13', hidden: false },
      { input: '[0,0,0]', expectedOutput: '0', hidden: true },
    ],
    points: 4,
    difficulty: 'EASY',
  },
  {
    text: 'Maximum in Array',
    description: 'Given JSON array of integers, return the maximum value as a string.',
    constraints: '1 <= length <= 10^4',
    examples: [{ input: '[3,9,1,7]', output: '9', explanation: '' }],
    starterCodes: {
      javascript: `function solution(input) {
  const arr = typeof input === 'string' ? JSON.parse(input) : input;
  return String(Math.max(...arr));
}`,
      python: `import json
def solution(input):
    arr = json.loads(input) if isinstance(input, str) else input
    return str(max(arr))`,
      java: `public static String solution(String input) {
    input = input.trim().replace("[","").replace("]","");
    int max = Integer.MIN_VALUE;
    for (String p : input.split(",")) max = Math.max(max, Integer.parseInt(p.trim()));
    return String.valueOf(max);
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    int mx = INT_MIN, num = 0, sign = 1;
    for (char c : input) {
        if (c == '-') sign = -1;
        else if (isdigit(c)) num = num * 10 + (c - '0');
        else if (c == ',' || c == ']') { mx = max(mx, sign * num); num = 0; sign = 1; }
    }
    if (num) mx = max(mx, sign * num);
    return to_string(mx);
}`,
    },
    testCases: [
      { input: '[3,9,1,7]', expectedOutput: '9', hidden: false },
      { input: '[-5,-1,-9]', expectedOutput: '-1', hidden: false },
      { input: '[42]', expectedOutput: '42', hidden: true },
    ],
    points: 4,
    difficulty: 'EASY',
  },
  {
    text: 'Count Vowels',
    description: 'Count vowels (a,e,i,o,u — case insensitive) in string s.',
    constraints: '1 <= s.length <= 10^5',
    examples: [{ input: 'Hello', output: '2', explanation: 'e and o' }],
    starterCodes: {
      javascript: `function solution(input) {
  const s = String(input).toLowerCase();
  let c = 0;
  for (const ch of s) if ('aeiou'.includes(ch)) c++;
  return String(c);
}`,
      python: `def solution(input):
    s = str(input).lower()
    return str(sum(1 for ch in s if ch in 'aeiou'))`,
      java: `public static String solution(String input) {
    String s = input.toLowerCase();
    int c = 0;
    for (char ch : s.toCharArray()) if ("aeiou".indexOf(ch) >= 0) c++;
    return String.valueOf(c);
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    int c = 0;
    string vow = "aeiouAEIOU";
    for (char ch : input) if (vow.find(ch) != string::npos) c++;
    return to_string(c);
}`,
    },
    testCases: [
      { input: 'Hello', expectedOutput: '2', hidden: false },
      { input: 'xyz', expectedOutput: '0', hidden: false },
      { input: 'Education', expectedOutput: '5', hidden: true },
    ],
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Palindrome Check',
    description: 'Return "true" if s is a palindrome, else "false" (case insensitive, letters only).',
    constraints: '1 <= s.length <= 10^5',
    examples: [{ input: 'Racecar', output: 'true', explanation: '' }],
    starterCodes: {
      javascript: `function solution(input) {
  const s = String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
  return s === s.split('').reverse().join('') ? 'true' : 'false';
}`,
      python: `def solution(input):
    s = ''.join(ch.lower() for ch in str(input) if ch.isalnum())
    return 'true' if s == s[::-1] else 'false'`,
      java: `public static String solution(String input) {
    String s = input.toLowerCase().replaceAll("[^a-z0-9]", "");
    return new StringBuilder(s).reverse().toString().equals(s) ? "true" : "false";
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    string s;
    for (char c : input) if (isalnum(c)) s += tolower(c);
    string t = s; reverse(t.begin(), t.end());
    return s == t ? "true" : "false";
}`,
    },
    testCases: [
      { input: 'Racecar', expectedOutput: 'true', hidden: false },
      { input: 'hello', expectedOutput: 'false', hidden: false },
      { input: 'A man a plan a canal Panama', expectedOutput: 'true', hidden: true },
    ],
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Fibonacci Number',
    description: 'Return the nth Fibonacci number (0-indexed: F(0)=0, F(1)=1).',
    constraints: '0 <= n <= 30',
    examples: [{ input: '6', output: '8', explanation: '0,1,1,2,3,5,8' }],
    starterCodes: {
      javascript: `function solution(input) {
  const n = Number(input);
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) { const t = a + b; a = b; b = t; }
  return String(a);
}`,
      python: `def solution(input):
    n = int(input)
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return str(a)`,
      java: `public static String solution(String input) {
    int n = Integer.parseInt(input.trim());
    long a = 0, b = 1;
    for (int i = 0; i < n; i++) { long t = a + b; a = b; b = t; }
    return String.valueOf(a);
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    int n = stoi(input);
    long long a = 0, b = 1;
    for (int i = 0; i < n; i++) { long long t = a + b; a = b; b = t; }
    return to_string(a);
}`,
    },
    testCases: [
      { input: '0', expectedOutput: '0', hidden: false },
      { input: '6', expectedOutput: '8', hidden: false },
      { input: '10', expectedOutput: '55', hidden: true },
    ],
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'GCD of Two Numbers',
    description: 'Given JSON {"a": number, "b": number}, return gcd(a,b) as string.',
    constraints: '1 <= a,b <= 10^9',
    examples: [{ input: '{"a":12,"b":18}', output: '6', explanation: '' }],
    starterCodes: {
      javascript: `function solution(input) {
  const { a, b } = typeof input === 'string' ? JSON.parse(input) : input;
  let x = Math.abs(a), y = Math.abs(b);
  while (y) { const t = y; y = x % y; x = t; }
  return String(x);
}`,
      python: `import json, math
def solution(input):
    data = json.loads(input) if isinstance(input, str) else input
    return str(math.gcd(int(data['a']), int(data['b'])))`,
      java: `public static String solution(String input) {
    input = input.replaceAll("[^0-9,]", " ").trim();
    String[] p = input.split("\\s+");
    int a = Integer.parseInt(p[0]), b = Integer.parseInt(p[1]);
    while (b != 0) { int t = b; b = a % b; a = t; }
    return String.valueOf(a);
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    int a = 0, b = 0, num = 0, building = 0;
    for (char c : input) {
        if (isdigit(c)) { building = building * 10 + (c - '0'); }
        else if (building) { if (!a) a = building; else b = building; building = 0; }
    }
    if (building && !b) b = building;
    while (b) { int t = b; b = a % b; a = t; }
    return to_string(a);
}`,
    },
    testCases: [
      { input: '{"a":12,"b":18}', expectedOutput: '6', hidden: false },
      { input: '{"a":7,"b":13}', expectedOutput: '1', hidden: false },
      { input: '{"a":100,"b":25}', expectedOutput: '25', hidden: true },
    ],
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Prime Check',
    description: 'Return "true" if n is prime, else "false".',
    constraints: '2 <= n <= 10^6',
    examples: [{ input: '7', output: 'true', explanation: '' }],
    starterCodes: {
      javascript: `function solution(input) {
  const n = Number(input);
  if (n < 2) return 'false';
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return 'false';
  return 'true';
}`,
      python: `def solution(input):
    n = int(input)
    if n < 2: return 'false'
    i = 2
    while i * i <= n:
        if n % i == 0: return 'false'
        i += 1
    return 'true'`,
      java: `public static String solution(String input) {
    int n = Integer.parseInt(input.trim());
    if (n < 2) return "false";
    for (int i = 2; i * i <= n; i++) if (n % i == 0) return "false";
    return "true";
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    int n = stoi(input);
    if (n < 2) return "false";
    for (int i = 2; i * i <= n; i++) if (n % i == 0) return "false";
    return "true";
}`,
    },
    testCases: [
      { input: '7', expectedOutput: 'true', hidden: false },
      { input: '4', expectedOutput: 'false', hidden: false },
      { input: '97', expectedOutput: 'true', hidden: true },
    ],
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Two Sum Indices',
    description: 'Given JSON {"nums":[...],"target":n}, return indices as JSON string e.g. "[0,1]".',
    constraints: 'Exactly one solution exists',
    examples: [{ input: '{"nums":[2,7,11,15],"target":9}', output: '[0,1]', explanation: '' }],
    starterCodes: {
      javascript: `function solution(input) {
  const { nums, target } = typeof input === 'string' ? JSON.parse(input) : input;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] + nums[j] === target) return JSON.stringify([i, j]);
  return '[]';
}`,
      python: `import json
def solution(input):
    data = json.loads(input) if isinstance(input, str) else input
    nums, target = data['nums'], data['target']
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return json.dumps([i, j])
    return '[]'`,
      java: `public static String solution(String input) {
    int[] nums = {2,7,11,15};
    int target = 9;
    for (int i = 0; i < nums.length; i++)
      for (int j = i + 1; j < nums.length; j++)
        if (nums[i] + nums[j] == target) return "[" + i + "," + j + "]";
    return "[]";
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
string solution(string input) {
    vector<int> nums; int target = 0, num = 0, sign = 1, inTarget = 0;
    for (int i = 0; i < (int)input.size(); i++) {
        if (input.substr(i, 8) == "\"target\"") inTarget = 1;
        char c = input[i];
        if (isdigit(c) || c == '-') {
            if (c == '-') sign = -1;
            else { num = num * 10 + (c - '0'); }
        } else if (num || c == ']') {
            if (inTarget && c == '}') target = sign * num;
            else if (!inTarget && c != '-') nums.push_back(sign * num);
            num = 0; sign = 1;
        }
    }
    for (int i = 0; i < (int)nums.size(); i++)
      for (int j = i + 1; j < (int)nums.size(); j++)
        if (nums[i] + nums[j] == target) return "[" + to_string(i) + "," + to_string(j) + "]";
    return "[]";
}`,
    },
    testCases: [
      { input: '{"nums":[2,7,11,15],"target":9}', expectedOutput: '[0,1]', hidden: false },
      { input: '{"nums":[3,2,4],"target":6}', expectedOutput: '[1,2]', hidden: false },
      { input: '{"nums":[3,3],"target":6}', expectedOutput: '[0,1]', hidden: true },
    ],
    points: 4,
    difficulty: 'HARD',
  },
];

const DESCRIPTIVE_QUESTIONS = [
  {
    text: 'Explain the difference between process and thread.',
    description: 'Write 4–6 sentences covering memory, scheduling, and use cases.',
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'What is normalization in databases? Give 1NF and 2NF examples.',
    description: 'Brief explanation with a simple student table example.',
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'Describe how HTTPS improves security over HTTP.',
    description: 'Mention encryption, certificates, and man-in-the-middle protection.',
    points: 4,
    difficulty: 'EASY',
  },
  {
    text: 'Compare REST and GraphQL APIs.',
    description: 'Cover endpoints, over-fetching, and when to use each.',
    points: 4,
    difficulty: 'MEDIUM',
  },
  {
    text: 'What is your approach to debugging a production issue?',
    description: 'Outline steps: reproduce, logs, isolate, fix, verify, post-mortem.',
    points: 4,
    difficulty: 'MEDIUM',
  },
];

function buildQuestions() {
  const rows = [];
  let order = 0;

  for (const q of MCQ_QUESTIONS) {
    rows.push({
      questionText: q.text,
      description: null,
      type: 'MCQ',
      options: JSON.stringify(q.options),
      correctAnswer: q.correctAnswer,
      points: q.points,
      difficulty: q.difficulty,
      order: order++,
    });
  }

  for (const q of CODING_QUESTIONS) {
    rows.push({
      questionText: q.text,
      description: q.description,
      type: 'CODING',
      options: JSON.stringify([]),
      correctAnswer: null,
      points: q.points,
      difficulty: q.difficulty,
      starterCode: serializeStarterCodesForStorage(q.starterCodes),
      constraints: q.constraints,
      examples: serializeExamplesForStorage(q.examples),
      testCases: serializeTestCasesForStorage(q.testCases),
      order: order++,
    });
  }

  for (const q of DESCRIPTIVE_QUESTIONS) {
    rows.push({
      questionText: q.text,
      description: q.description,
      type: 'DESCRIPTIVE',
      options: JSON.stringify([]),
      correctAnswer: null,
      points: q.points,
      difficulty: q.difficulty,
      order: order++,
    });
  }

  return rows;
}

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
    where: { title: ASSESSMENT_TITLE },
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
  const questions = buildQuestions();

  const assessment = await prisma.assessment.create({
    data: {
      title: ASSESSMENT_TITLE,
      description:
        'Full mixed assessment: 10 MCQ, 10 coding (all languages), and 5 descriptive questions for batch 2024-2028.',
      type: 'MIXED',
      difficulty: 'MEDIUM',
      duration: 120,
      startTime: now,
      endTime: end,
      status: 'PUBLISHED',
      instructions:
        '1. Answer all sections: MCQ, coding, and descriptive.\n2. For coding, use Run tests before Submit.\n3. Descriptive answers are reviewed manually.\n4. Proctoring rules apply if enabled.',
      config: JSON.stringify({
        joinWindow: { opensMinutesBeforeStart: 60, closesMinutesAfterStart: 120 },
        coding: { allowedLanguages: ALL_LANGS },
        proctoring: {
          webcam: true,
          mic: false,
          tabSwitch: true,
          fullscreen: true,
          snapshotInterval: 60,
        },
      }),
      questions: { create: questions },
      assignments: {
        create: [{ batchId: batch.id }, ...studentAssignments],
      },
    },
    include: { questions: true, assignments: true },
  });

  const byType = assessment.questions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  console.log('Created mixed assessment');
  console.log('  ID:', assessment.id);
  console.log('  Title:', assessment.title);
  console.log('  Type:', assessment.type);
  console.log('  Batch:', batch.year, `(${batch.label || batch.id})`);
  console.log('  Questions:', assessment.questions.length, byType);
  console.log('  Coding languages:', ALL_LANGS.join(', '));
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
