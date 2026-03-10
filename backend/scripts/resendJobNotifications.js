/**
 * Resend job notification emails for a specific job.
 * Usage: node scripts/resendJobNotifications.js [jobId|jobTitle] [--email=test@example.com]
 *
 * Examples:
 *   node scripts/resendJobNotifications.js "Backend Developer"
 *   node scripts/resendJobNotifications.js abc-123-uuid --email=skillport24@gmail.com
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { sendBulkJobNotifications } from '../src/services/emailService.js';

const prisma = new PrismaClient();

function parseTargeting(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith('--email='));
  const testEmail = emailArg ? emailArg.replace('--email=', '').trim() : null;
  const jobArg = args.find((a) => !a.startsWith('--'));

  if (!jobArg) {
    console.log('Usage: node scripts/resendJobNotifications.js <jobId|jobTitle> [--email=test@example.com]');
    console.log('Example: node scripts/resendJobNotifications.js "Backend Developer"');
    process.exit(1);
  }

  // Find job - by ID (UUID) or by jobTitle
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobArg);
  const job = isUuid
    ? await prisma.job.findUnique({
        where: { id: jobArg },
        include: { company: true },
      })
    : await prisma.job.findFirst({
        where: {
          jobTitle: { contains: jobArg, mode: 'insensitive' },
          isPosted: true,
        },
        include: { company: true },
        orderBy: { postedAt: 'desc' },
      });

  if (!job) {
    console.error(`Job not found: ${jobArg}`);
    process.exit(1);
  }

  console.log(`Found job: ${job.jobTitle} (${job.id})`);
  console.log(`Company: ${job.company?.name || job.companyName || 'N/A'}`);

  let students;

  if (testEmail) {
    // Send to single test email
    const student = await prisma.student.findFirst({
      where: { email: testEmail },
      include: { user: { select: { email: true, displayName: true } } },
    });
    if (student) {
      students = [student];
      console.log(`Sending to: ${testEmail} (student found)`);
    } else {
      // Create a dummy student object for testing
      students = [{ email: testEmail, fullName: 'Student', user: { email: testEmail, displayName: 'Student' } }];
      console.log(`Sending to: ${testEmail} (test recipient)`);
    }
  } else {
    // Get matching students based on job targeting
    const targetSchools = parseTargeting(job.targetSchools);
    const targetCenters = parseTargeting(job.targetCenters);
    const targetBatches = parseTargeting(job.targetBatches);

    const where = { user: { status: 'ACTIVE' } };
    if (targetSchools.length > 0 && !targetSchools.includes('ALL')) {
      where.school = { in: targetSchools };
    }
    if (targetCenters.length > 0 && !targetCenters.includes('ALL')) {
      where.center = { in: targetCenters };
    }
    if (targetBatches.length > 0 && !targetBatches.includes('ALL')) {
      where.batch = { in: targetBatches };
    }

    students = await prisma.student.findMany({
      where,
      include: { user: { select: { email: true, displayName: true } } },
      take: 500,
    });
    console.log(`Matching students: ${students.length}`);
  }

  if (students.length === 0) {
    console.log('No students to notify.');
    process.exit(0);
  }

  const result = await sendBulkJobNotifications(students, job);
  console.log(`Done. Sent: ${result.successful}, Failed: ${result.failed}`);
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
