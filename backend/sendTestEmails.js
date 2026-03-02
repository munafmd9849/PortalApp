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
    sendDriveThankYouEmail,
    sendDriveReminderRecruiterAdmin,
    sendDriveReminderStudent,
    sendDriveReminder24h,
    sendScreeningRequestEmail,
    sendInterviewerInviteEmail,
    sendAnnouncementEmail,
    sendGenericNotification
} from './src/services/emailService.js';
import { sendEmail } from './src/config/email.js';

const targetEmail = 'charansai07136@gmail.com';

const dummyStudent = { email: targetEmail, fullName: 'Charan Sai (Student)' };
const dummyRecruiter = { email: targetEmail, user: { email: targetEmail }, fullName: 'Charan Sai (Recruiter)' };
const dummyJob = {
    id: 'test-job-123',
    jobTitle: 'Software Engineer Intern',
    company: { name: 'Google' },
    companyName: 'Google',
    location: 'Hyderabad',
    postedAt: new Date(),
    driveDate: new Date(Date.now() + 86400000 * 5)
};
const dummyApplication = {
    id: 'test-app-123',
    status: 'SHORTLISTED',
    interviewDate: new Date(Date.now() + 86400000 * 7),
    appliedDate: new Date()
};

async function testEmails() {
    console.log(`Starting email tests to: ${targetEmail}`);

    try {
        console.log('1. Sending OTP...');
        await sendOTP(targetEmail, '123456');

        console.log('2. Sending Job Posted Notification...');
        await sendJobPostedNotification(dummyJob, dummyRecruiter);

        console.log('3. Sending Application Notification (Applicant & Recruiter)...');
        await sendApplicationNotification(dummyStudent, dummyJob, dummyRecruiter);

        console.log('4. Sending Application Status Update (SHORTLISTED)...');
        await sendApplicationStatusUpdateNotification(dummyStudent, dummyJob, dummyApplication);

        console.log('5. Sending Password Reset OTP...');
        await sendPasswordResetOTP(targetEmail, '654321');

        console.log('6. Sending Endorsement Magic Link...');
        await sendEndorsementMagicLinkEmail({
            teacherEmail: targetEmail,
            teacherName: 'Prof. John Doe',
            studentName: 'Charan Sai',
            studentEnrollmentId: 'ENR-2026',
            magicLink: 'http://localhost:5173/endorse/magic-link',
            expiresAt: new Date(Date.now() + 86400000 * 2)
        });

        console.log('7. Sending Drive Thank You Email...');
        await sendDriveThankYouEmail({
            to: targetEmail,
            recipientName: 'Charan Sai',
            jobTitle: 'Software Engineer Intern',
            companyName: 'Google',
            addNoteUrl: 'http://localhost:5173/admin/notes'
        });

        console.log('8. Sending Drive Reminder Email...');
        await sendDriveReminderRecruiterAdmin(dummyJob, [targetEmail], 5);

        console.log('9. Sending Screening Request Email...');
        await sendScreeningRequestEmail({
            recruiterEmail: targetEmail,
            recruiterName: 'Charan Sai (Recruiter)',
            jobTitle: 'Software Engineer Intern',
            companyName: 'Google',
            applicationCount: 42,
            deadlineDate: new Date(),
            screeningPortalUrl: 'http://localhost:5173/screening/test-token',
            expiryDays: 7
        });

        console.log('10. Sending Interviewer Invite Email...');
        await sendInterviewerInviteEmail({
            interviewerEmail: targetEmail,
            interviewerName: 'John Interviewer',
            jobTitle: 'Software Engineer Intern',
            companyName: 'Google',
            magicLink: 'http://localhost:5173/interviewer/test-token',
            expiryDays: 7
        });

        console.log('11. Sending Announcement Email...');
        await sendAnnouncementEmail(targetEmail, {
            title: 'Welcome to the Placement Season 2026',
            recipientName: 'Charan Sai',
            content: 'We are excited to announce the commencement of the placement season.',
            calloutText: 'Register before March 1st',
            actionUrl: 'http://localhost:5173/placements',
            actionText: 'View Openings',
            validityPeriod: 'March 1st - June 1st',
            quote: 'Opportunities don\'t happen, you create them.',
            senderName: 'Placement Head',
            organization: 'PWIOI'
        });

        console.log('12. Sending Generic Notification...');
        await sendGenericNotification(targetEmail, 'Urgent Update', {
            title: 'Schedule Change',
            userName: 'Charan Sai',
            message: 'Your interview has been rescheduled.',
            panelMessage: 'New Time: 10:00 AM tomorrow',
            actionUrl: 'http://localhost:5173/dashboard',
            actionText: 'Confirm Availability'
        });

        console.log('13. Sending 3-Day Drive Reminder (Admin)...');
        await sendDriveReminderRecruiterAdmin(dummyJob, [targetEmail], 3);

        console.log('14. Sending 3-Day Drive Reminder (Student)...');
        await sendDriveReminderStudent(dummyJob, [targetEmail], 3);

        console.log('✅ All emails sent successfully!');
    } catch (error) {
        console.error('❌ Error sending emails:', error);
    }
    process.exit(0);
}

testEmails();
