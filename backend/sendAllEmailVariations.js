import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import {
    sendOTP,
    sendJobPostedNotification,
    sendApplicationNotification,
    sendApplicationStatusUpdateNotification,
    sendPasswordResetOTP,
    sendEndorsementMagicLinkEmail,
    sendEndorsementRequestEmail,
    sendDriveThankYouEmail,
    sendAdminDriveThankYou,
    sendDriveReminderRecruiterAdmin,
    sendDriveReminderStudent,
    sendScreeningRequestEmail,
    sendInterviewerInviteEmail,
    sendAnnouncementEmail,
    sendGenericNotification,
    sendStudentQueryResponse,
    sendNewJobNotification,
    generateGenericJobNotificationEmail
} from './src/services/emailService.js';
import { sendEmail } from './src/config/email.js';

const targetEmail = 'skillport24@gmail.com';

const dummyStudent = { email: targetEmail, fullName: 'Skillport Student' };
const dummyTeacher = { email: targetEmail, fullName: 'Prof. Skillport' };
const dummyRecruiter = { email: targetEmail, fullName: 'Skillport Recruiter', user: { email: targetEmail } };
const dummyAdmin = { email: targetEmail, fullName: 'Skillport Admin' };

const dummyJob = {
    id: 'test-job-789',
    jobTitle: 'Senior Full Stack Developer',
    company: { name: 'Ulica Technologies' },
    companyName: 'Ulica Technologies',
    location: 'Bangalore / Remote',
    jobType: 'Full-time',
    salary: '₹12 - ₹18 LPA',
    driveDate: new Date(Date.now() + 86400000 * 7),
    applicationDeadline: new Date(Date.now() + 86400000 * 3),
    description: 'Join our core engineering team to build the future of placement automation. Looking for experts in Node.js, React, and Redis.',
    remote: true
};

const dummyApplication = {
    id: 'test-app-456',
    appliedDate: new Date(),
    interviewDate: new Date(Date.now() + 86400000 * 10),
    notes: 'Candidate has strong problem-solving skills and great culture fit.'
};

async function runMasterTest() {
    console.log('\n🚀 Starting Comprehensive Email Variation Test');
    console.log(`📍 Recipient: ${targetEmail}\n`);

    const results = [];

    const testVariation = async (category, name, fn) => {
        process.stdout.write(`Sending [${category}] ${name}... `);
        try {
            await fn();
            console.log('✅');
            results.push({ category, name, status: 'success' });
        } catch (err) {
            console.log('❌');
            console.error(`   Error: ${err.message}`);
            results.push({ category, name, status: 'failed', error: err.message });
        }
    };

    // 1. Identity & Security
    await testVariation('Security', 'Standard OTP (01)', () =>
        sendOTP(targetEmail, '998877')
    );
    await testVariation('Security', 'Password Reset (05)', () =>
        sendPasswordResetOTP(targetEmail, '112233')
    );

    // 2. Job Notifications
    await testVariation('Jobs', 'Job Posted Alert (02)', () =>
        sendJobPostedNotification(dummyJob, dummyRecruiter)
    );
    await testVariation('Jobs', 'New Job Alert - Personalized (13)', () =>
        sendNewJobNotification(dummyStudent, dummyJob)
    );
    await testVariation('Jobs', 'New Job Alert - Bulk (13)', async () => {
        const { subject, html, text } = generateGenericJobNotificationEmail(dummyJob);
        return sendEmail({ to: targetEmail, subject, html, text });
    });

    // 3. Application Lifecycle
    await testVariation('Lifecycle', 'Confirmation (03)', () =>
        sendApplicationNotification(dummyStudent, dummyJob)
    );

    const statuses = ['SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'SELECTED', 'REJECTED', 'JOB_REMOVED'];
    for (const status of statuses) {
        await testVariation('Lifecycle', `Status Update: ${status} (04)`, () =>
            sendApplicationStatusUpdateNotification(dummyStudent, dummyJob, { ...dummyApplication, status })
        );
    }

    // 4. Drive Reminders
    const intervals = [7, 3, 1];
    for (const days of intervals) {
        await testVariation('Reminders', `Student ${days}d Reminder (08)`, () =>
            sendDriveReminderStudent(dummyJob, [targetEmail], days)
        );
        await testVariation('Reminders', `Admin/Recruiter ${days}d Reminder (17)`, () =>
            sendDriveReminderRecruiterAdmin(dummyJob, [targetEmail], days)
        );
    }

    // 5. Recruitment & Evaluation
    await testVariation('Recruitment', 'Screening Request (09)', () =>
        sendScreeningRequestEmail({
            recruiterEmail: targetEmail,
            recruiterName: 'Recruiter Name',
            jobTitle: dummyJob.jobTitle,
            companyName: dummyJob.companyName,
            applicationCount: 15,
            deadlineDate: dummyJob.applicationDeadline,
            screeningPortalUrl: 'http://localhost:5173/screening/test-token'
        })
    );
    await testVariation('Recruitment', 'Interviewer Invite (10)', () =>
        sendInterviewerInviteEmail({
            interviewerEmail: targetEmail,
            interviewerName: 'Panelist Name',
            jobTitle: dummyJob.jobTitle,
            companyName: dummyJob.companyName,
            magicLink: 'http://localhost:5173/eval/test-token'
        })
    );

    // 6. Endorsements
    await testVariation('Endorsements', 'Magic Link (06)', () =>
        sendEndorsementMagicLinkEmail({
            teacherEmail: targetEmail,
            teacherName: 'Professor Smith',
            studentName: 'Skillport Student',
            studentEnrollmentId: 'PW-2026-001',
            magicLink: 'http://localhost:5173/endorse/magic-link',
            expiresAt: new Date(Date.now() + 86400000 * 2)
        })
    );
    await testVariation('Endorsements', 'Legacy Request (06)', () =>
        sendEndorsementRequestEmail(targetEmail, 'Skillport Student', '/endorse/legacy-link', 'Please provide a recommendation.')
    );

    // 7. Post-Drive & General
    await testVariation('General', 'Drive Thank You - Student (07)', () =>
        sendDriveThankYouEmail({
            to: targetEmail,
            recipientName: 'Skillport Student',
            jobTitle: dummyJob.jobTitle,
            companyName: dummyJob.companyName,
            addNoteUrl: 'http://localhost:5173/feedback'
        })
    );
    await testVariation('General', 'Admin Drive Summary (11)', () =>
        sendAdminDriveThankYou({
            to: targetEmail,
            adminName: 'Skillport Admin',
            jobTitle: dummyJob.jobTitle,
            companyName: dummyJob.companyName,
            totalAttendees: 45,
            interviewsHeld: 12,
            feedbackStatus: 'Completed',
            reportUrl: 'http://localhost:5173/admin/reports/drive-123'
        })
    );
    await testVariation('General', 'Announcement (12)', () =>
        sendAnnouncementEmail(targetEmail, {
            title: 'Annual Hiring Fest 2026',
            recipientName: 'Skillport User',
            content: 'We are happy to invite you to our biggest hiring event of the year. Multiple Tier-1 companies are participating.',
            calloutText: 'Register before Friday',
            actionUrl: 'http://localhost:5173/events/fest-2026',
            actionText: 'Register Now',
            senderName: 'Placement Head'
        })
    );
    await testVariation('General', 'Support Response (15)', () =>
        sendStudentQueryResponse({
            to: targetEmail,
            studentName: 'Skillport Student',
            querySubject: 'Clarification on Shortlist Criteria',
            ticketStatus: 'RESOLVED',
            adminResponseTime: new Date().toLocaleString(),
            adminResponseText: 'The shortlist was based on the aggregate CGPA and technical test scores. You missed the cutoff by a small margin.',
            studentQueryText: 'I want to know why I was not shortlisted for the Google drive despite having 9 CGPA.',
            conversationUrl: 'http://localhost:5173/support/ticket/456',
            ticketId: 'TK-8892'
        })
    );
    await testVariation('General', 'Generic Alert (14)', () =>
        sendGenericNotification(targetEmail, 'System Maintenance', {
            userName: 'Skillport User',
            message: 'The portal will be down for scheduled maintenance tonight from 2 AM to 4 AM IST.',
            actionText: 'View Status Page'
        })
    );

    console.log('\n📊 Test Summary:');
    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${results.length - successCount}`);

    if (results.length - successCount > 0) {
        console.log('\nFailed Tests:');
        results.filter(r => r.status === 'failed').forEach(r => console.log(`- [${r.category}] ${r.name}: ${r.error}`));
    }

    console.log('\n🚀 Master Test Completed!\n');
    process.exit(0);
}

runMasterTest();
