import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Large-scale, production-grade seed data.
 * Deterministic seeding: controlled pseudo-randomness (seed string below).
 *
 * Run:
 *   npm run db:seed
 */

const SEED = 'production-seed-v1';

const STUDENT_COUNT = 60; // 50–70
const COMPANY_COUNT = 18; // 15–20
const JOB_COUNT = 55; // 50–60
const APPLICATION_TARGET_MIN = 300;
const APPLICATION_TARGET_MAX = 500;

// 20% incomplete profiles
const INCOMPLETE_PROFILE_RATIO = 0.2;

// Jobs distribution
const JOB_CLOSED_RATIO = 0.3;
const JOB_ACTIVE_RATIO = 0.5;
// remaining = upcoming

type RNG = {
  next: () => number; // [0,1)
  int: (min: number, max: number) => number;
  pick: <T>(arr: T[]) => T;
  shuffle: <T>(arr: T[]) => T[];
};

function hashSeedToUint32(seed: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function makeRng(seed: string): RNG {
  // Mulberry32
  let a = hashSeedToUint32(seed) || 1;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(next() * (hi - lo + 1)) + lo;
  };
  const pick = <T,>(arr: T[]) => arr[int(0, arr.length - 1)];
  const shuffle = <T,>(arr: T[]) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { next, int, pick, shuffle };
}

const rng = makeRng(SEED);

let uniqueTick = 0;
const now = new Date();

function uniqueDateInPast(daysAgoMin: number, daysAgoMax: number): Date {
  const daysAgo = rng.int(daysAgoMin, daysAgoMax);
  const d = new Date(now.getTime());
  d.setDate(d.getDate() - daysAgo);
  d.setHours(rng.int(8, 20), rng.int(0, 59), rng.int(0, 59), 0);
  d.setTime(d.getTime() + uniqueTick);
  uniqueTick += 137; // ensure unique timestamps
  return d;
}

function uniqueDateInFuture(daysAheadMin: number, daysAheadMax: number): Date {
  const daysAhead = rng.int(daysAheadMin, daysAheadMax);
  const d = new Date(now.getTime());
  d.setDate(d.getDate() + daysAhead);
  d.setHours(rng.int(8, 20), rng.int(0, 59), rng.int(0, 59), 0);
  d.setTime(d.getTime() + uniqueTick);
  uniqueTick += 137;
  return d;
}

function toJsonStringArray(values: string[]): string {
  return JSON.stringify(values);
}

function safeEmailLocalPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40);
}

function makePhone(): string {
  // 10-digit mobile numbers common in India (starting 6-9)
  const first = rng.pick(['6', '7', '8', '9']);
  let rest = '';
  for (let i = 0; i < 9; i += 1) rest += String(rng.int(0, 9));
  return `${first}${rest}`;
}

function makeCgpa(): Prisma.Decimal {
  const value = rng.int(620, 980) / 100; // 6.20–9.80
  return new Prisma.Decimal(value.toFixed(2));
}

function pickUnique<T>(pool: T[], count: number): T[] {
  const shuffled = rng.shuffle(pool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function weightedPick<T>(items: Array<{ item: T; weight: number }>): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  const r = rng.next() * total;
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (r <= acc) return it.item;
  }
  return items[items.length - 1].item;
}

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Aditya', 'Aisha', 'Akshara', 'Aman', 'Amara', 'Ananya', 'Anika', 'Arjun',
  'Bhavya', 'Chaitanya', 'Diya', 'Eshan', 'Farah', 'Gaurav', 'Ishaan', 'Ishita', 'Kabir', 'Kavya',
  'Krishna', 'Meera', 'Mohammed', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Rahul', 'Riya', 'Rohan',
  'Saanvi', 'Sahil', 'Sana', 'Sanjana', 'Shaurya', 'Shreya', 'Tanvi', 'Varun', 'Vedant', 'Zara',
  'Alex', 'Emma', 'Liam', 'Mia', 'Noah', 'Olivia', 'Sofia', 'Ethan', 'Ava', 'Isabella',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Reddy', 'Patel', 'Singh', 'Gupta', 'Nair', 'Desai', 'Khan',
  'Mehta', 'Joshi', 'Bose', 'Chopra', 'Kapoor', 'Agarwal', 'Saxena', 'Malhotra', 'Rao', 'Mukherjee',
  'Johnson', 'Brown', 'Miller', 'Davis', 'Garcia', 'Martinez', 'Wilson', 'Anderson',
];

const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'proton.me', 'icloud.com'];

const CENTERS = ['BANGALORE', 'NOIDA', 'LUCKNOW', 'PUNE', 'INDORE', 'HYDERABAD'];
const SCHOOLS = ['SOT', 'SOM', 'SOH'];
const BATCHES = ['23-27', '24-28', '25-29'];

const UNIVERSITIES = [
  'National Institute of Technology Surathkal',
  'Indian Institute of Technology Madras',
  'Indian Institute of Technology Bombay',
  'Delhi Technological University',
  'Anna University',
  'Pune Institute of Computer Technology',
  'Vellore Institute of Technology',
  'BITS Pilani',
];

const SKILL_POOL = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'Go', 'SQL', 'PostgreSQL', 'MongoDB',
  'React', 'Next.js', 'Node.js', 'Express', 'Spring Boot', 'Django', 'FastAPI', 'Docker', 'Kubernetes',
  'AWS', 'GCP', 'Azure', 'Redis', 'Kafka', 'Git', 'Linux', 'System Design', 'Data Structures',
  'Algorithms', 'Machine Learning', 'NLP', 'Computer Vision', 'Data Engineering', 'ETL',
  'Terraform', 'CI/CD', 'Testing', 'Cybersecurity', 'Networking', 'UI/UX', 'Product Analytics',
];

const ROLE_TITLES = [
  'Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'DevOps Engineer',
  'Data Analyst', 'Data Engineer', 'Machine Learning Engineer', 'Security Engineer', 'QA Engineer',
  'Cloud Engineer', 'Platform Engineer', 'Product Analyst', 'Business Analyst', 'Mobile Developer',
  'Site Reliability Engineer', 'Solutions Engineer', 'Associate Product Manager', 'AI Engineer',
];

const LOCATIONS = [
  'Bengaluru', 'Hyderabad', 'Pune', 'Noida', 'Gurugram', 'Chennai', 'Mumbai', 'Indore', 'Lucknow',
];

const COMPANY_NAMES = [
  'ULICA Technologies',
  'Orion Systems',
  'NovaEdge Labs',
  'Vertex Solutions',
  'BluePeak Analytics',
  'AstraNova Digital',
  'NimbusWorks',
  'Crestline Software',
  'Solstice AI',
  'Evergreen Cloud',
  'Kinetic Dataworks',
  'Aurora Fintech',
  'Summit Robotics',
  'Prism Security',
  'Mariner Logistics Tech',
  'Helio Health Systems',
  'Quanta Commerce',
  'Atlas Product Studio',
];

type JobCategory = 'CLOSED' | 'ACTIVE' | 'UPCOMING';

type SeedJob = {
  id: string;
  category: JobCategory;
  recruiterEmail: string;
  companyId: string;
  companyName: string;
  createdAt: Date;
  postedAt: Date;
  deadline: Date;
  driveDate: Date;
};

type SeedRound = { id: string; roundNumber: number; status: 'LOCKED' | 'ACTIVE' | 'ENDED' };

type Stage =
  | 'APPLIED'
  | 'SCREENING_REJECTED'
  | 'SCREENING_PASSED'
  | 'INTERVIEW_ROUND_1'
  | 'INTERVIEW_ROUND_2'
  | 'FINAL_SELECTED'
  | 'FINAL_REJECTED';

function stageForApplication(jobCategory: JobCategory): Stage {
  // Keep plausible distribution across job lifecycle
  const weights: Array<{ item: Stage; weight: number }> =
    jobCategory === 'UPCOMING'
      ? [
          { item: 'APPLIED', weight: 0.45 },
          { item: 'SCREENING_REJECTED', weight: 0.15 },
          { item: 'SCREENING_PASSED', weight: 0.2 },
          { item: 'INTERVIEW_ROUND_1', weight: 0.12 },
          { item: 'INTERVIEW_ROUND_2', weight: 0.05 },
          { item: 'FINAL_SELECTED', weight: 0.015 },
          { item: 'FINAL_REJECTED', weight: 0.015 },
        ]
      : jobCategory === 'ACTIVE'
        ? [
            { item: 'APPLIED', weight: 0.25 },
            { item: 'SCREENING_REJECTED', weight: 0.2 },
            { item: 'SCREENING_PASSED', weight: 0.15 },
            { item: 'INTERVIEW_ROUND_1', weight: 0.18 },
            { item: 'INTERVIEW_ROUND_2', weight: 0.1 },
            { item: 'FINAL_SELECTED', weight: 0.07 },
            { item: 'FINAL_REJECTED', weight: 0.05 },
          ]
        : [
            { item: 'APPLIED', weight: 0.1 },
            { item: 'SCREENING_REJECTED', weight: 0.22 },
            { item: 'SCREENING_PASSED', weight: 0.1 },
            { item: 'INTERVIEW_ROUND_1', weight: 0.18 },
            { item: 'INTERVIEW_ROUND_2', weight: 0.14 },
            { item: 'FINAL_SELECTED', weight: 0.14 },
            { item: 'FINAL_REJECTED', weight: 0.12 },
          ];
  return weightedPick(weights);
}

function buildJobDescription(companyName: string, title: string): string {
  const statements = [
    `Join ${companyName} to build reliable systems used across campus hiring workflows.`,
    `You will collaborate with product, design, and engineering teams to deliver measurable improvements.`,
    `We value ownership, clear communication, and a strong engineering mindset.`,
    `You will contribute to quality through reviews, testing, and operational excellence.`,
  ];
  const responsibilities = [
    'Design and implement well-structured features with clear trade-offs.',
    'Work with APIs and data stores to ensure correctness and performance.',
    'Write maintainable code and participate in reviews.',
    'Instrument services and dashboards for operational visibility.',
  ];
  return [
    `${title} — Role Overview`,
    '',
    ...statements,
    '',
    'Key Responsibilities:',
    ...responsibilities.map((r) => `- ${r}`),
    '',
    'What We Look For:',
    '- Strong fundamentals in programming and problem solving.',
    '- Comfort with modern development practices (version control, reviews, CI).',
    '- Ability to learn quickly and deliver iteratively.',
  ].join('\n');
}

function requirementBullets(): string[] {
  const base = [
    'Strong programming fundamentals and data structures.',
    'Hands-on experience with at least one backend or frontend framework.',
    'Ability to write clean, testable code and debug systematically.',
    'Good communication and teamwork.',
  ];
  return rng.shuffle(base).slice(0, rng.int(3, 4));
}

function spocContacts(companyName: string): Array<{ fullName: string; email: string; phone: string }> {
  const names = [
    `Placement Office - ${companyName}`,
    `Campus Relations - ${companyName}`,
  ];
  return names.map((n) => ({
    fullName: n,
    email: `${safeEmailLocalPart(n)}@${safeEmailLocalPart(companyName).replace(/\./g, '')}.com`,
    phone: makePhone(),
  }));
}

function recruiterContacts(primaryEmail: string, primaryName: string): Array<{ email: string; name: string | null }> {
  const list: Array<{ email: string; name: string | null }> = [{ email: primaryEmail, name: primaryName }];
  if (rng.next() < 0.35) {
    const altEmail = primaryEmail.replace('@', `.${rng.int(2, 9)}@`);
    list.push({ email: altEmail, name: `${primaryName} (HR)` });
  }
  return list;
}

async function truncateAll(prisma: PrismaClient) {
  // All mapped tables from schema.prisma
  const tables = [
    'round_evaluations',
    'interview_rounds',
    'interviewer_invites',
    'interview_sessions',
    'recruiter_screening_sessions',
    'interview_activities',
    'interview_evaluations',
    'interviews',
    'applications',
    'job_tracking',
    'jobs',
    'recruiters',
    'companies',
    'endorsements',
    'endorsement_tokens',
    'coding_profiles',
    'certifications',
    'achievements',
    'projects',
    'experiences',
    'education',
    'skills',
    'student_resume_files',
    'resumes',
    'student_queries',
    'email_notifications',
    'notifications',
    'google_calendar_tokens',
    'admin_requests',
    'admins',
    'refresh_tokens',
    'otps',
    'students',
    'users',
  ];

  // PostgreSQL: Use TRUNCATE CASCADE to delete all data and handle foreign keys
  // CASCADE automatically truncates dependent tables
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (e) {
      console.warn(`⚠️  Could not truncate table ${table}, trying DELETE instead:`, e.message);
      // Fallback to DELETE if TRUNCATE fails (e.g., table doesn't exist)
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    }
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log(`[seed] Using seed: ${SEED}`);
    console.log('[seed] Truncating tables...');
    await truncateAll(prisma);

    // Admin user
    const adminCreatedAt = uniqueDateInPast(85, 88);
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@pwioi.in',
        passwordHash: '$2a$10$k3vQ9jvXG1uEw7QyWl9D1eGqg0Zp4fQ0nQ8vXh3zqZ1uYgVwZl2aS',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: adminCreatedAt,
        displayName: 'Platform Admin',
        createdAt: adminCreatedAt,
        updatedAt: adminCreatedAt,
        admin: {
          create: {
            name: 'Platform Admin',
            createdAt: adminCreatedAt,
            updatedAt: adminCreatedAt,
          },
        },
      },
      select: { id: true, email: true },
    });

    // Companies
    const companiesToCreate = rng.shuffle(COMPANY_NAMES).slice(0, COMPANY_COUNT);
    const companyRows = companiesToCreate.map((name) => {
      const createdAt = uniqueDateInPast(60, 85);
      return {
        name,
        location: rng.pick(LOCATIONS),
        description: `${name} builds software products across engineering, analytics, and platform operations.`,
        createdAt,
        updatedAt: createdAt,
      };
    });

    await prisma.company.createMany({ data: companyRows });
    const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
    const companyByName = new Map(companies.map((c) => [c.name, c]));

    // Recruiters (HR / recruiter emails)
    const recruiterUsers: Array<{ userId: string; recruiterId: string; email: string; name: string; companyId: string; companyName: string }> = [];
    for (const companyName of companiesToCreate) {
      const company = companyByName.get(companyName)!;
      const recruiterCount = rng.int(1, 2);
      for (let i = 0; i < recruiterCount; i += 1) {
        const first = rng.pick(FIRST_NAMES);
        const last = rng.pick(LAST_NAMES);
        const fullName = `${first} ${last}`;
        const local = safeEmailLocalPart(`${first}.${last}.${company.name}`);
        const domain = safeEmailLocalPart(company.name).replace(/\./g, '');
        const email = `${local}@${domain}.com`;
        const createdAt = uniqueDateInPast(50, 80);

        const user = await prisma.user.create({
          data: {
            email,
            passwordHash: '$2a$10$k3vQ9jvXG1uEw7QyWl9D1eGqg0Zp4fQ0nQ8vXh3zqZ1uYgVwZl2aS',
            role: 'RECRUITER',
            status: 'ACTIVE',
            emailVerified: true,
            emailVerifiedAt: createdAt,
            displayName: fullName,
            createdAt,
            updatedAt: createdAt,
            recruiter: {
              create: {
                companyId: company.id,
                companyName: company.name,
                location: company.location || null,
                relationshipType: rng.pick(['Partner Company', 'Hiring Partner', 'Strategic Partner']),
                zone: rng.pick(['North Zone', 'South Zone', 'West Zone', 'Central Zone']),
                createdAt,
                updatedAt: createdAt,
              },
            },
          },
          select: { id: true, recruiter: { select: { id: true } } },
        });

        recruiterUsers.push({
          userId: user.id,
          recruiterId: user.recruiter!.id,
          email,
          name: fullName,
          companyId: company.id,
          companyName: company.name,
        });
      }
    }

    // Students (users + profiles)
    const students: Array<{ userId: string; studentId: string; email: string; fullName: string; isIncomplete: boolean; batch: string; center: string; school: string }> = [];
    const usedStudentEmails = new Set<string>();

    for (let i = 0; i < STUDENT_COUNT; i += 1) {
      const first = rng.pick(FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);
      const fullName = `${first} ${last}`;
      const domain = rng.pick(EMAIL_DOMAINS);
      let local = safeEmailLocalPart(`${first}.${last}`);
      if (local.length < 4) local = `${local}${rng.int(10, 999)}`;
      let email = `${local}@${domain}`;
      while (usedStudentEmails.has(email)) {
        email = `${local}${rng.int(2, 99)}@${domain}`;
      }
      usedStudentEmails.add(email);

      const createdAt = uniqueDateInPast(30, 88);
      const batch = rng.pick(BATCHES);
      const center = rng.pick(CENTERS);
      const school = rng.pick(SCHOOLS);
      const isIncomplete = rng.next() < INCOMPLETE_PROFILE_RATIO;

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: '$2a$10$k3vQ9jvXG1uEw7QyWl9D1eGqg0Zp4fQ0nQ8vXh3zqZ1uYgVwZl2aS',
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: createdAt,
          displayName: fullName,
          createdAt,
          updatedAt: createdAt,
          student: {
            create: {
              fullName,
              email,
              phone: makePhone(),
              enrollmentId: rng.next() < 0.85 ? `PWIOI-${batch.replace('-', '')}-${String(i + 1).padStart(3, '0')}` : null,
              cgpa: rng.next() < 0.85 ? makeCgpa() : null,
              backlogs: rng.next() < 0.8 ? '0' : rng.pick(['1', '2', '3+']),
              batch,
              center,
              school,
              bio: rng.next() < 0.7 ? 'Driven learner with hands-on project experience and strong fundamentals.' : null,
              headline: rng.next() < 0.75 ? rng.pick(['Software Engineering', 'Data & Analytics', 'Cloud & DevOps', 'AI & ML']) : null,
              city: rng.pick(['Bengaluru', 'Hyderabad', 'Pune', 'Noida', 'Chennai', 'Mumbai']),
              stateRegion: rng.pick(['Karnataka', 'Telangana', 'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu', 'Delhi']),
              jobFlexibility: rng.pick(['Onsite', 'Hybrid', 'Remote']),
              publicProfileId: rng.next() < 0.7 ? cryptoRandomToken(24) : null,
              createdAt,
              updatedAt: createdAt,
            },
          },
        },
        select: { id: true, student: { select: { id: true } } },
      });

      students.push({
        userId: user.id,
        studentId: user.student!.id,
        email,
        fullName,
        isIncomplete,
        batch,
        center,
        school,
      });
    }

    // Skills, Education, Projects, Certifications, Achievements, Endorsements
    const skillRows: Array<{ studentId: string; skillName: string; rating: number; createdAt: Date; updatedAt: Date }> = [];
    const educationRows: Array<{ studentId: string; degree: string; institution: string; startYear?: number; endYear?: number; cgpa?: Prisma.Decimal; description?: string | null; createdAt: Date; updatedAt: Date }> = [];
    const projectRows: Array<{ studentId: string; title: string; description?: string | null; technologies: string; githubUrl?: string | null; liveUrl?: string | null; createdAt: Date; updatedAt: Date }> = [];
    const certificationRows: Array<{ studentId: string; title: string; description?: string | null; issuedDate?: Date | null; expiryDate?: Date | null; issuer?: string | null; certificateUrl?: string | null; createdAt: Date; updatedAt: Date }> = [];
    const achievementRows: Array<{ studentId: string; title: string; description?: string | null; date?: Date | null; hasCertificate: boolean; certificateUrl?: string | null; createdAt: Date; updatedAt: Date }> = [];
    const endorsementRows: Array<{
      studentId: string;
      endorserName: string;
      endorserEmail: string;
      endorserRole: string;
      organization: string;
      relationship: string;
      context?: string | null;
      message: string;
      skills: string;
      overallRating?: number | null;
      consent: boolean;
      verified: boolean;
      createdAt: Date;
      submittedAt: Date;
    }> = [];

    for (const s of students) {
      const createdAt = uniqueDateInPast(20, 88);
      const skillCount = rng.int(5, 10);
      const skills = pickUnique(SKILL_POOL, skillCount);
      for (const sk of skills) {
        const t = uniqueDateInPast(10, 88);
        skillRows.push({
          studentId: s.studentId,
          skillName: sk,
          rating: rng.int(3, 5),
          createdAt: t,
          updatedAt: t,
        });
      }

      const batchYearStart = 2000 + parseInt(s.batch.split('-')[0], 10);
      const batchYearEnd = 2000 + parseInt(s.batch.split('-')[1], 10);
      educationRows.push({
        studentId: s.studentId,
        degree: rng.pick(['B.Tech', 'B.E.', 'B.Sc (CS)', 'BCA']),
        institution: rng.pick(UNIVERSITIES),
        startYear: batchYearStart,
        endYear: batchYearEnd,
        cgpa: rng.next() < 0.8 ? makeCgpa() : undefined,
        description: rng.next() < 0.6 ? 'Focused on core CS subjects and applied learning through projects.' : null,
        createdAt,
        updatedAt: createdAt,
      });

      // Projects
      const projectCount = s.isIncomplete ? rng.int(0, 1) : rng.int(1, 3);
      for (let p = 0; p < projectCount; p += 1) {
        const t = uniqueDateInPast(5, 80);
        const tech = pickUnique(SKILL_POOL, rng.int(3, 6));
        projectRows.push({
          studentId: s.studentId,
          title: rng.pick([
            'Placement Tracker Dashboard',
            'Interview Scheduling Assistant',
            'Resume Insights Analyzer',
            'Campus Drive Management Portal',
            'Job Matching Engine',
            'Student Profile Builder',
            'Recruiter Screening Workspace',
          ]),
          description: rng.next() < 0.85 ? 'Built a feature-complete module with clean UI and reliable API integration.' : null,
          technologies: JSON.stringify(tech),
          githubUrl: null,
          liveUrl: null,
          createdAt: t,
          updatedAt: t,
        });
      }

      // Certifications & achievements (optional)
      const certCount = s.isIncomplete ? 0 : (rng.next() < 0.55 ? rng.int(0, 2) : 0);
      for (let c = 0; c < certCount; c += 1) {
        const issued = uniqueDateInPast(15, 85);
        certificationRows.push({
          studentId: s.studentId,
          title: rng.pick(['Cloud Fundamentals', 'Data Analytics Foundations', 'Backend Development', 'Machine Learning Essentials']),
          description: rng.next() < 0.6 ? 'Completed a structured program with hands-on assessments.' : null,
          issuedDate: issued,
          expiryDate: null,
          issuer: rng.pick(['Coursera', 'edX', 'Udacity', 'Google', 'Microsoft']),
          certificateUrl: null,
          createdAt: issued,
          updatedAt: issued,
        });
      }

      const achCount = rng.next() < 0.4 ? rng.int(0, 2) : 0;
      for (let a = 0; a < achCount; a += 1) {
        const dt = uniqueDateInPast(10, 88);
        achievementRows.push({
          studentId: s.studentId,
          title: rng.pick(['Hackathon Finalist', 'Open Source Contributor', 'Top Performer in Coursework', 'Technical Club Lead']),
          description: rng.next() < 0.7 ? 'Recognized for strong contribution and consistent performance.' : null,
          date: dt,
          hasCertificate: false,
          certificateUrl: null,
          createdAt: dt,
          updatedAt: dt,
        });
      }

      // Endorsements (1–4 per student for better coverage)
      const endCount = s.isIncomplete ? rng.int(0, 1) : rng.int(2, 4);
      const endSkills = pickUnique(skills, rng.int(2, Math.min(5, skills.length)));
      
      const endorsementMessages = [
        'Consistently demonstrated strong ownership, clear communication, and dependable execution. Delivered high-quality work with thoughtful trade-offs and attention to detail.',
        'Outstanding problem-solving skills and ability to work independently. Showed great initiative in taking on complex challenges and delivering results ahead of schedule.',
        'Excellent team player with strong leadership qualities. Collaborated effectively with peers and consistently contributed valuable insights during project discussions.',
        'Strong technical foundation with the ability to quickly learn new technologies. Demonstrated exceptional debugging skills and attention to code quality.',
        'Reliable and proactive student who consistently exceeded expectations. Great attention to detail and ability to see projects through from concept to completion.',
        'Impressive analytical thinking and ability to break down complex problems into manageable components. Highly recommended for any technical role.',
        'Showed exceptional growth during the course/project. Strong work ethic, excellent communication skills, and genuine passion for software development.',
        'Outstanding performance with demonstrated expertise in multiple technologies. Would confidently recommend for any challenging development position.',
        'Exceptional student with strong fundamentals and practical application skills. Consistently delivered innovative solutions and showed great potential.',
        'Demonstrated excellent code quality and best practices. Strong understanding of software engineering principles with practical implementation experience.',
      ];
      
      const relationships = ['Professor', 'Mentor', 'Manager', 'Team Lead', 'Supervisor', 'Instructor', 'Guide'];
      const contexts = ['Capstone Project', 'Internship', 'Coursework', 'Research Project', 'Industry Project', 'Hackathon', 'Competition', 'Thesis'];
      const roles = ['Professor', 'Mentor', 'Senior Software Engineer', 'Team Lead', 'CTO', 'Technical Manager', 'Course Instructor', 'Project Guide'];
      
      for (let e = 0; e < endCount; e += 1) {
        const dt = uniqueDateInPast(1, 60);
        const endFirst = rng.pick(FIRST_NAMES);
        const endLast = rng.pick(LAST_NAMES);
        const endorserName = e === 0 && rng.next() < 0.3 
          ? `Dr. ${endFirst} ${endLast}` // First endorsement often from a professor
          : `${endFirst} ${endLast}`;
        
        // Mix of academic and industry endorsers
        const isAcademic = e === 0 || rng.next() < 0.4;
        const org = isAcademic
          ? rng.pick([s.school === 'SOT' ? 'School of Technology' : s.school === 'SOM' ? 'School of Management' : 'School of Humanities', ...UNIVERSITIES.slice(0, 3)])
          : rng.pick([...companiesToCreate.slice(0, 5)]);
        
        const role = isAcademic ? rng.pick(['Professor', 'Associate Professor', 'Course Instructor', 'Research Guide']) : rng.pick(['Senior Software Engineer', 'Technical Manager', 'CTO', 'Team Lead', 'Engineering Manager']);
        const relationship = isAcademic ? rng.pick(['Professor', 'Mentor', 'Guide', 'Instructor']) : rng.pick(['Manager', 'Supervisor', 'Team Lead', 'Mentor']);
        
        // More diverse endorsement messages
        const message = rng.pick(endorsementMessages);
        
        endorsementRows.push({
          studentId: s.studentId,
          endorserName,
          endorserEmail: isAcademic 
            ? `${safeEmailLocalPart(endorserName)}@${safeEmailLocalPart(org).replace(/\./g, '').replace(/\s+/g, '')}.edu.in`
            : `${safeEmailLocalPart(endorserName)}@${safeEmailLocalPart(org).replace(/\./g, '').replace(/\s+/g, '')}.com`,
          endorserRole: role,
          organization: org,
          relationship: relationship,
          context: rng.next() < 0.65 ? rng.pick(contexts) : null,
          message: message,
          skills: JSON.stringify(endSkills),
          overallRating: rng.int(4, 5),
          consent: true,
          verified: true,
          createdAt: dt,
          submittedAt: dt,
        });
      }
    }

    // Skills have unique constraint on (studentId, skillName) - handle duplicates
    try {
      await prisma.skill.createMany({ data: skillRows });
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('[seed] Some skills already exist, skipping duplicates...');
      } else {
        throw error;
      }
    }
    
    await prisma.education.createMany({ data: educationRows });
    
    if (projectRows.length) {
      try {
        await prisma.project.createMany({ data: projectRows });
      } catch (error) {
        if (error.code === 'P2002') {
          console.log('[seed] Some projects already exist, skipping duplicates...');
        } else {
          throw error;
        }
      }
    }
    
    if (certificationRows.length) {
      try {
        await prisma.certification.createMany({ data: certificationRows });
      } catch (error) {
        if (error.code === 'P2002') {
          console.log('[seed] Some certifications already exist, skipping duplicates...');
        } else {
          throw error;
        }
      }
    }
    
    if (achievementRows.length) {
      try {
        await prisma.achievement.createMany({ data: achievementRows });
      } catch (error) {
        if (error.code === 'P2002') {
          console.log('[seed] Some achievements already exist, skipping duplicates...');
        } else {
          throw error;
        }
      }
    }
    
    if (endorsementRows.length) {
      try {
        await prisma.endorsement.createMany({ data: endorsementRows });
      } catch (error) {
        if (error.code === 'P2002') {
          console.log('[seed] Some endorsements already exist, skipping duplicates...');
        } else {
          throw error;
        }
      }
    }

    // Jobs
    const jobs: SeedJob[] = [];
    const recruitersByCompany = new Map<string, typeof recruiterUsers>();
    for (const r of recruiterUsers) {
      const list = recruitersByCompany.get(r.companyId) || [];
      list.push(r);
      recruitersByCompany.set(r.companyId, list);
    }

    const jobTitles = rng.shuffle(ROLE_TITLES);
    const jobCategories: JobCategory[] = [];
    const closedCount = Math.round(JOB_COUNT * JOB_CLOSED_RATIO);
    const activeCount = Math.round(JOB_COUNT * JOB_ACTIVE_RATIO);
    const upcomingCount = JOB_COUNT - closedCount - activeCount;
    jobCategories.push(...Array.from({ length: closedCount }, () => 'CLOSED'));
    jobCategories.push(...Array.from({ length: activeCount }, () => 'ACTIVE'));
    jobCategories.push(...Array.from({ length: upcomingCount }, () => 'UPCOMING'));
    const categories = rng.shuffle(jobCategories);

    for (let i = 0; i < JOB_COUNT; i += 1) {
      const category = categories[i]!;
      const company = rng.pick(companies);
      const companyRecruiters = recruitersByCompany.get(company.id);
      if (!companyRecruiters || companyRecruiters.length === 0) {
        console.warn(`[seed] Warning: Company ${company.name} has no recruiters, skipping job creation`);
        continue;
      }
      const recruiter = rng.pick(companyRecruiters);

      const createdAt = uniqueDateInPast(20, 70);
      const postedAt = uniqueDateInPast(10, 60);
      const driveDate =
        category === 'CLOSED'
          ? uniqueDateInPast(5, 25)
          : category === 'ACTIVE'
            ? uniqueDateInFuture(3, 20)
            : uniqueDateInFuture(10, 30);
      const deadline =
        category === 'CLOSED'
          ? uniqueDateInPast(5, 15)
          : category === 'ACTIVE'
            ? uniqueDateInFuture(5, 25)
            : uniqueDateInFuture(7, 20);

      const baseTitle = jobTitles[i % jobTitles.length] || rng.pick(ROLE_TITLES);
      const jobTitle = `${baseTitle} (${company.name})`;

      const requiredSkills = pickUnique(SKILL_POOL, rng.int(5, 9));
      const requirements = requirementBullets();

      const spocs = spocContacts(company.name);
      const recruiterContactsList = recruiterContacts(recruiter.email, recruiter.name);

      const jobStatus =
        category === 'CLOSED' ? 'ARCHIVED' : category === 'ACTIVE' ? 'ACTIVE' : 'POSTED';
      const isPosted = true;
      const isActive = category === 'ACTIVE';

      const jobRow = await prisma.job.create({
        data: {
          jobTitle,
          description: buildJobDescription(company.name, baseTitle),
          requirements: toJsonStringArray(requirements),
          requiredSkills: toJsonStringArray(requiredSkills),
          companyId: company.id,
          recruiterId: recruiter.recruiterId,
          companyName: company.name,
          recruiterEmail: recruiter.email, // mandatory for seed
          recruiterName: recruiter.name,
          recruiterEmails: JSON.stringify(recruiterContactsList),
          salary: rng.pick(['10–14 LPA', '12–16 LPA', '14–18 LPA', '18–24 LPA', '6–10 LPA']),
          salaryRange: null,
          ctc: null,
          location: rng.pick(LOCATIONS),
          companyLocation: company.location || null,
          driveDate,
          applicationDeadline: deadline,
          jobType: rng.pick(['Full-time', 'Internship']),
          experienceLevel: rng.pick(['Entry Level', 'Mid Level']),
          driveVenues: JSON.stringify([`${company.location || rng.pick(LOCATIONS)} Campus`, 'Virtual']),
          qualification: rng.pick(['B.Tech', 'B.E.', 'BCA', 'B.Sc (CS)']),
          specialization: rng.pick(['Computer Science', 'Information Technology', 'Electronics', 'Data Science']),
          yop: rng.pick(['2024', '2025', '2026', '2027']),
          minCgpa: rng.pick(['7.00', '7.50', '8.00', '8.50']),
          gapAllowed: rng.pick(['No', 'Yes']),
          gapYears: rng.pick(['0', '1', '2']),
          backlogs: rng.pick(['0', '0-1', '0-2']),
          spocs: JSON.stringify(spocs),
          status: jobStatus,
          isActive,
          isPosted,
          submittedAt: postedAt,
          postedAt,
          approvedAt: postedAt,
          createdAt,
          updatedAt: postedAt,
          targetSchools: JSON.stringify(rng.next() < 0.3 ? ['ALL'] : pickUnique(SCHOOLS, rng.int(1, 2))),
          targetCenters: JSON.stringify(rng.next() < 0.3 ? ['ALL'] : pickUnique(CENTERS, rng.int(2, 4))),
          targetBatches: JSON.stringify(rng.next() < 0.25 ? ['ALL'] : pickUnique(BATCHES, rng.int(1, 2))),
        },
        select: { id: true },
      });

      jobs.push({
        id: jobRow.id,
        category,
        recruiterEmail: recruiter.email,
        companyId: company.id,
        companyName: company.name,
        createdAt,
        postedAt,
        deadline,
        driveDate,
      });
    }

    // Interview sessions + rounds (2–3 rounds, one ACTIVE at a time)
    const jobToRounds = new Map<string, SeedRound[]>();
    for (const j of jobs) {
      const sessionCreatedAt = uniqueDateInPast(15, 60);
      const status =
        j.category === 'CLOSED'
          ? 'COMPLETED'
          : j.category === 'ACTIVE'
            ? (rng.next() < 0.55 ? 'ONGOING' : 'NOT_STARTED')
            : 'NOT_STARTED';

      const startedAt = status !== 'NOT_STARTED' ? uniqueDateInPast(1, 10) : null;
      const completedAt = status === 'COMPLETED' ? uniqueDateInPast(1, 5) : null;

      const session = await prisma.interviewSession.create({
        data: {
          jobId: j.id,
          companyId: j.companyId,
          status,
          createdBy: adminUser.id,
          createdAt: sessionCreatedAt,
          updatedAt: sessionCreatedAt,
          startedAt,
          completedAt,
        },
        select: { id: true },
      });

      const roundNames = ['Technical Round', 'Managerial Round', 'HR Round'];
      const roundCount = rng.next() < 0.2 ? 2 : 3;
      const selectedNames = roundNames.slice(0, roundCount);

      const rounds: SeedRound[] = [];
      for (let r = 0; r < selectedNames.length; r += 1) {
        const roundNumber = r + 1;
        let roundStatus: 'LOCKED' | 'ACTIVE' | 'ENDED' = 'LOCKED';
        let started: Date | null = null;
        let ended: Date | null = null;

        if (status === 'COMPLETED') {
          roundStatus = 'ENDED';
          started = uniqueDateInPast(5, 12);
          ended = uniqueDateInPast(1, 6);
        } else if (status === 'ONGOING') {
          // Exactly one ACTIVE round
          if (r === 0) {
            roundStatus = rng.next() < 0.7 ? 'ENDED' : 'ACTIVE';
          } else if (r === 1) {
            roundStatus = rounds[0]?.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
          } else {
            roundStatus = 'LOCKED';
          }
          if (roundStatus === 'ENDED') {
            started = uniqueDateInPast(5, 10);
            ended = uniqueDateInPast(1, 5);
          } else if (roundStatus === 'ACTIVE') {
            started = uniqueDateInPast(1, 3);
          }
        } else {
          roundStatus = 'LOCKED';
        }

        const roundCreatedAt = new Date(sessionCreatedAt.getTime() + roundNumber * 1000 + uniqueTick);
        uniqueTick += 137;

        const round = await prisma.interviewRound.create({
          data: {
            sessionId: session.id,
            roundNumber,
            name: selectedNames[r]!,
            status: roundStatus,
            startedAt: started,
            endedAt: ended,
            createdAt: roundCreatedAt,
            updatedAt: roundCreatedAt,
          },
          select: { id: true, roundNumber: true, status: true },
        });

        rounds.push({ id: round.id, roundNumber: round.roundNumber, status: round.status as SeedRound['status'] });
      }

      // Ensure exactly one ACTIVE round for ONGOING sessions
      if (status === 'ONGOING') {
        const actives = rounds.filter((x) => x.status === 'ACTIVE');
        if (actives.length === 0) {
          // activate round 1
          await prisma.interviewRound.update({
            where: { id: rounds[0]!.id },
            data: { status: 'ACTIVE', startedAt: uniqueDateInPast(1, 3) },
          });
          rounds[0]!.status = 'ACTIVE';
        } else if (actives.length > 1) {
          // keep first active, lock others
          for (let i = 1; i < actives.length; i += 1) {
            await prisma.interviewRound.update({
              where: { id: actives[i]!.id },
              data: { status: 'LOCKED', startedAt: null, endedAt: null },
            });
            const idx = rounds.findIndex((r) => r.id === actives[i]!.id);
            if (idx >= 0) rounds[idx]!.status = 'LOCKED';
          }
        }
      }

      jobToRounds.set(j.id, rounds);

      // Screening session token (for recruiter access)
      const screeningCreatedAt = uniqueDateInPast(7, 45);
      await prisma.recruiterScreeningSession.create({
        data: {
          jobId: j.id,
          token: cryptoRandomToken(40),
          expiresAt: uniqueDateInFuture(7, 14),
          createdAt: screeningCreatedAt,
        },
      });
    }

    // Applications generation
    const jobApplicantCount = new Map<string, number>(jobs.map((j) => [j.id, 0]));
    const studentAppCount = new Map<string, number>(students.map((s) => [s.studentId, 0]));
    const applicationPairs = new Set<string>(); // `${studentId}:${jobId}`

    const maxPerStudent = 8;
    const minPerStudent = 3;
    const maxPerJob = 15;
    const minPerJob = 5;

    // First pass: per-student target
    for (const s of students) {
      const target = rng.int(minPerStudent, maxPerStudent);
      const shuffledJobs = rng.shuffle(jobs);
      for (const j of shuffledJobs) {
        if ((studentAppCount.get(s.studentId) || 0) >= target) break;
        if ((jobApplicantCount.get(j.id) || 0) >= maxPerJob) continue;
        const key = `${s.studentId}:${j.id}`;
        if (applicationPairs.has(key)) continue;
        applicationPairs.add(key);
        studentAppCount.set(s.studentId, (studentAppCount.get(s.studentId) || 0) + 1);
        jobApplicantCount.set(j.id, (jobApplicantCount.get(j.id) || 0) + 1);
      }
    }

    // Second pass: ensure each job has at least minPerJob
    const shuffledStudents = rng.shuffle(students);
    for (const j of jobs) {
      while ((jobApplicantCount.get(j.id) || 0) < minPerJob) {
        const s = rng.pick(shuffledStudents);
        if ((studentAppCount.get(s.studentId) || 0) >= maxPerStudent) continue;
        const key = `${s.studentId}:${j.id}`;
        if (applicationPairs.has(key)) continue;
        applicationPairs.add(key);
        studentAppCount.set(s.studentId, (studentAppCount.get(s.studentId) || 0) + 1);
        jobApplicantCount.set(j.id, (jobApplicantCount.get(j.id) || 0) + 1);
      }
    }

    // If still below target applications, add more respecting caps
    let attempts = 0;
    while (applicationPairs.size < APPLICATION_TARGET_MIN && attempts < 200000) {
      attempts += 1;
      const s = rng.pick(students);
      const j = rng.pick(jobs);
      if ((studentAppCount.get(s.studentId) || 0) >= maxPerStudent) continue;
      if ((jobApplicantCount.get(j.id) || 0) >= maxPerJob) continue;
      const key = `${s.studentId}:${j.id}`;
      if (applicationPairs.has(key)) continue;
      applicationPairs.add(key);
      studentAppCount.set(s.studentId, (studentAppCount.get(s.studentId) || 0) + 1);
      jobApplicantCount.set(j.id, (jobApplicantCount.get(j.id) || 0) + 1);
    }

    // Avoid trimming to preserve per-job minimums; per-student and per-job caps prevent uncontrolled growth.

    const jobById = new Map(jobs.map((j) => [j.id, j]));

    const applicationRows: Array<Prisma.ApplicationCreateManyInput> = [];
    for (const pair of applicationPairs) {
      const [studentId, jobId] = pair.split(':');
      const job = jobById.get(jobId);
      if (!job) {
        console.warn(`[seed] Warning: Job ${jobId} not found, skipping application`);
        continue;
      }

      const stage = stageForApplication(job.category);
      const appliedDate =
        job.category === 'UPCOMING'
          ? uniqueDateInPast(2, 20)
          : job.category === 'ACTIVE'
            ? uniqueDateInPast(5, 45)
            : uniqueDateInPast(20, 80);

      let screeningStatus: string = 'APPLIED';
      let screeningRemarks: string | null = null;
      let screeningCompletedAt: Date | null = null;

      let status: string = 'APPLIED';
      let interviewStatus: string | null = null;
      let lastRoundReached = 0;
      let interviewDate: Date | null = null;

      if (stage === 'SCREENING_REJECTED') {
        screeningStatus = rng.next() < 0.55 ? 'RESUME_REJECTED' : 'TEST_REJECTED';
        screeningRemarks = 'Screening criteria not met for this role.';
        screeningCompletedAt = uniqueDateInPast(1, 20);
        status = 'REJECTED';
      } else if (stage === 'SCREENING_PASSED') {
        screeningStatus = rng.next() < 0.5 ? 'RESUME_SELECTED' : 'TEST_SELECTED';
        screeningRemarks = 'Qualified for interview.';
        screeningCompletedAt = uniqueDateInPast(1, 15);
        status = 'SHORTLISTED';
      } else if (stage === 'INTERVIEW_ROUND_1') {
        screeningStatus = 'TEST_SELECTED';
        screeningCompletedAt = uniqueDateInPast(2, 12);
        status = 'INTERVIEWED';
        lastRoundReached = 1;
        interviewDate = uniqueDateInPast(1, 5);
      } else if (stage === 'INTERVIEW_ROUND_2') {
        screeningStatus = 'TEST_SELECTED';
        screeningCompletedAt = uniqueDateInPast(3, 14);
        status = 'INTERVIEWED';
        lastRoundReached = 2;
        interviewDate = uniqueDateInPast(1, 5);
      } else if (stage === 'FINAL_SELECTED') {
        screeningStatus = 'TEST_SELECTED';
        screeningCompletedAt = uniqueDateInPast(5, 20);
        status = 'SELECTED';
        interviewStatus = 'SELECTED';
        lastRoundReached = rng.next() < 0.25 ? 2 : 3;
        interviewDate = uniqueDateInPast(1, 4);
      } else if (stage === 'FINAL_REJECTED') {
        screeningStatus = 'TEST_SELECTED';
        screeningCompletedAt = uniqueDateInPast(5, 20);
        status = 'REJECTED';
        lastRoundReached = rng.next() < 0.4 ? 2 : 3;
        interviewStatus = `REJECTED_IN_ROUND_${lastRoundReached}`;
        interviewDate = uniqueDateInPast(1, 4);
      } else {
        // APPLIED
        screeningStatus = rng.next() < 0.65 ? 'APPLIED' : 'RESUME_SELECTED';
        status = 'APPLIED';
      }

      applicationRows.push({
        studentId: studentId!,
        jobId,
        companyId: job.companyId,
        status,
        appliedDate,
        interviewDate,
        screeningStatus,
        screeningRemarks,
        screeningCompletedAt,
        interviewStatus,
        lastRoundReached,
        notes: null,
        createdAt: appliedDate,
      });
    }

    console.log(`[seed] Creating applications: ${applicationRows.length}`);
    // Applications have unique constraint on (studentId, jobId) - handle duplicates
    try {
      await prisma.application.createMany({ data: applicationRows });
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('[seed] Some applications already exist, skipping duplicates...');
      } else {
        throw error;
      }
    }

    // Round evaluations
    const apps = await prisma.application.findMany({
      select: { id: true, jobId: true, screeningStatus: true, lastRoundReached: true, interviewStatus: true, status: true },
    });

    const evaluationRows: Array<Prisma.RoundEvaluationCreateManyInput> = [];
    for (const app of apps) {
      if (app.screeningStatus !== 'TEST_SELECTED') continue;
      const rounds = jobToRounds.get(app.jobId) || [];
      const maxRound = Math.min(app.lastRoundReached || 0, rounds.length);
      if (maxRound <= 0) continue;

      for (let r = 1; r <= maxRound; r += 1) {
        const round = rounds.find((x) => x.roundNumber === r);
        if (!round) continue;

        // If the round is ACTIVE, keep some evaluations pending (null status)
        const isActiveRound = round.status === 'ACTIVE';
        const shouldBePending = isActiveRound && rng.next() < 0.55;
        const status = shouldBePending
          ? null
          : app.status === 'REJECTED' && (app.interviewStatus || '').includes(`ROUND_${r}`)
            ? 'REJECTED'
            : rng.next() < 0.82
              ? 'SELECTED'
              : 'ON_HOLD';

        evaluationRows.push({
          roundId: round.id,
          applicationId: app.id,
          interviewerEmail: jobById.get(app.jobId)?.recruiterEmail || 'interviewer@pwioi.in',
          status,
          remarks: status
            ? status === 'REJECTED'
              ? 'Did not meet the evaluation criteria for this round.'
              : status === 'ON_HOLD'
                ? 'Potential fit; needs further review.'
                : 'Strong performance with clear reasoning and good communication.'
            : null,
          createdAt: uniqueDateInPast(1, 5),
        });
      }
    }

    if (evaluationRows.length) {
      console.log(`[seed] Creating round evaluations: ${evaluationRows.length}`);
      // PostgreSQL supports skipDuplicates
      try {
        await prisma.roundEvaluation.createMany({ 
          data: evaluationRows,
          skipDuplicates: true 
        });
      } catch (error) {
        if (error.code === 'P2002') {
          console.log('[seed] Some round evaluations already exist, skipping duplicates...');
        } else {
          throw error;
        }
      }
    }

    // Basic verification counts
    const [studentsCount, jobsCount, applicationsCount] = await Promise.all([
      prisma.student.count(),
      prisma.job.count(),
      prisma.application.count(),
    ]);

    console.log('[seed] Done.');
    console.log(`[seed] Students: ${studentsCount}`);
    console.log(`[seed] Jobs: ${jobsCount}`);
    console.log(`[seed] Applications: ${applicationsCount}`);

    if (studentsCount < 50) throw new Error('Seed failed: students < 50');
    if (jobsCount < 50) throw new Error('Seed failed: jobs < 50');
    if (applicationsCount < 300) throw new Error('Seed failed: applications < 300');
  } finally {
    await prisma.$disconnect();
  }
}

function cryptoRandomToken(len: number): string {
  // Deterministic token using seeded RNG (not cryptographic; suitable for seed data)
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += alphabet[rng.int(0, alphabet.length - 1)];
  }
  return out;
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exitCode = 1;
});

