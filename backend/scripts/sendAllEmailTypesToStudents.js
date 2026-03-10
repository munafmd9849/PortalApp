/**
 * Send all student-facing email types to all students using real data from the database.
 * Usage: node scripts/sendAllEmailTypesToStudents.js
 *
 * Sends: New Job Alert, Application Notification, Status Update, Drive Thank You,
 * Drive Reminder, Announcement, Generic Notification, Student Query Response
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import {
  sendNewJobNotification,
  sendApplicationNotification,
  sendApplicationStatusUpdateNotification,
  sendDriveThankYouEmail,
  sendDriveReminderStudent,
  sendAnnouncementEmail,
  sendGenericNotification,
  sendStudentQueryResponse,
} from '../src/services/emailService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📧 Sending all email types to students with real DB data...\n');

  // 1. Get all active students
  const students = await prisma.student.findMany({
    where: { user: { status: 'ACTIVE' } },
    include: { user: { select: { email: true, displayName: true } } },
    take: 50,
  });

  if (students.length === 0) {
    console.log('No active students found.');
    process.exit(1);
  }
  console.log(`Found ${students.length} students.\n`);

  // 2. Get a posted job
  const job = await prisma.job.findFirst({
    where: { isPosted: true },
    include: { company: true },
  });

  if (!job) {
    console.log('No posted job found. Some emails will use fallback data.');
  }

  const jobForEmail = job || {
    id: 'demo',
    jobTitle: 'Backend Developer',
    company: { name: 'PWIOI Partner' },
    companyName: 'PWIOI Partner',
    location: 'Bangalore',
    driveDate: new Date(Date.now() + 86400000 * 7),
    applicationDeadline: new Date(Date.now() + 86400000 * 3),
    driveVenues: '["PW IOI Campus, Bangalore"]',
    reportingTime: '9:00 AM',
    description: 'Sample role for testing.',
  };

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let totalSent = 0;
  let totalFailed = 0;

  const sendOne = async (fn, label) => {
    try {
      await fn();
      totalSent++;
      return true;
    } catch (err) {
      console.error(`   ❌ ${label}: ${err.message}`);
      totalFailed++;
      return false;
    }
  };

  // 3. New Job Alert (13) - to each student
  console.log('[1/8] New Job Alert (13)...');
  for (const student of students) {
    const ok = await sendOne(
      () => sendNewJobNotification(student, jobForEmail),
      `New Job Alert to ${student.email}`
    );
    if (ok) process.stdout.write('.');
  }
  console.log(` Done (${students.length} sent)\n`);

  // 4. Application Notification (03) - to students who have applications
  console.log('[2/8] Application Notification (03)...');
  const applications = await prisma.application.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    include: { student: true, job: { include: { company: true } } },
    take: 20,
  });
  const appStudents = [...new Set(applications.map((a) => a.student))];
  if (appStudents.length > 0) {
    for (const app of applications.slice(0, Math.min(10, applications.length))) {
      await sendOne(
        () => sendApplicationNotification(app.student, app.job),
        `Application confirmation to ${app.student.email}`
      );
    }
    console.log(` Done (${Math.min(10, applications.length)} sent)\n`);
  } else {
    // Send to first student with job for demo
    await sendOne(
      () => sendApplicationNotification(students[0], jobForEmail),
      'Application (demo)'
    );
    console.log(' Done (1 demo sent)\n');
  }

  // 5. Application Status Update (04)
  console.log('[3/8] Application Status Update (04)...');
  if (applications.length > 0) {
    for (const app of applications.slice(0, Math.min(5, applications.length))) {
      await sendOne(
        () =>
          sendApplicationStatusUpdateNotification(app.student, app.job, {
            ...app,
            status: app.status || 'SHORTLISTED',
            appliedDate: app.appliedDate,
            interviewDate: app.interviewDate,
            notes: app.notes || 'Good progress.',
          }),
        `Status update to ${app.student.email}`
      );
    }
    console.log(` Done\n`);
  } else {
    await sendOne(
      () =>
        sendApplicationStatusUpdateNotification(students[0], jobForEmail, {
          id: 'demo',
          status: 'SHORTLISTED',
          appliedDate: new Date(),
          interviewDate: new Date(Date.now() + 86400000 * 5),
          notes: 'Sample status update for testing.',
        }),
      'Status update (demo)'
    );
    console.log(' Done (1 demo sent)\n');
  }

  // 6. Drive Thank You (07)
  console.log('[4/8] Drive Thank You (07)...');
  for (const student of students) {
    await sendOne(
      () =>
        sendDriveThankYouEmail({
          to: student.email,
          recipientName: student.fullName || 'Student',
          jobTitle: jobForEmail.jobTitle,
          companyName: jobForEmail.company?.name || jobForEmail.companyName,
          addNoteUrl: `${frontendUrl}/dashboard`,
        }),
      `Drive thank you to ${student.email}`
    );
    if (students.indexOf(student) % 5 === 0) process.stdout.write('.');
  }
  console.log(` Done (${students.length} sent)\n`);

  // 7. Drive Reminder Student (08)
  console.log('[5/8] Drive Reminder (08)...');
  const studentEmails = students.map((s) => s.email);
  await sendOne(
    () => sendDriveReminderStudent(jobForEmail, studentEmails, 3),
    'Drive 3d reminder'
  );
  console.log(` Done (${students.length} sent)\n`);

  // 8. Announcement (12)
  console.log('[6/8] Announcement (12)...');
  for (const student of students) {
    await sendOne(
      () =>
        sendAnnouncementEmail(student.email, {
          title: 'Placement Portal Update – March 2026',
          description: 'Welcome to the placement season! Ensure your profile is complete and resume is uploaded. New opportunities are being posted regularly.',
          link: `${frontendUrl}/dashboard`,
          senderName: 'Office of Career Services',
        }),
      `Announcement to ${student.email}`
    );
    if (students.indexOf(student) % 5 === 0) process.stdout.write('.');
  }
  console.log(` Done (${students.length} sent)\n`);

  // 9. Generic Notification (14)
  console.log('[7/8] Generic Notification (14)...');
  for (const student of students) {
    await sendOne(
      () =>
        sendGenericNotification(student.email, 'Portal Updates', {
          userName: student.fullName || 'Student',
          message: 'Your placement dashboard has been updated with new features. Log in to explore job opportunities and track your applications.',
          actionText: 'Go to Dashboard',
          actionUrl: `${frontendUrl}/dashboard`,
        }),
      `Generic to ${student.email}`
    );
    if (students.indexOf(student) % 5 === 0) process.stdout.write('.');
  }
  console.log(` Done (${students.length} sent)\n`);

  // 10. Student Query Response (15)
  console.log('[8/8] Student Query Response (15)...');
  for (const student of students.slice(0, Math.min(5, students.length))) {
    await sendOne(
      () =>
        sendStudentQueryResponse({
          to: student.email,
          studentName: student.fullName || 'Student',
          querySubject: 'Placement Eligibility',
          ticketStatus: 'RESOLVED',
          adminResponseTime: new Date().toLocaleString(),
          adminResponseText: 'You are eligible for all drives matching your branch and batch. Keep your profile updated.',
          studentQueryText: 'Am I eligible for the upcoming placement drives?',
          conversationUrl: `${frontendUrl}/dashboard`,
          ticketId: 'TK-' + Date.now().toString(36).toUpperCase(),
        }),
      `Query response to ${student.email}`
    );
  }
  console.log(' Done\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Total sent: ${totalSent}`);
  if (totalFailed > 0) console.log(`❌ Failed: ${totalFailed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
