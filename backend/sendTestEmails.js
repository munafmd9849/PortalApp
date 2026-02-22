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
    sendDriveReminderRecruiterAdmin
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

        console.log('✅ All emails sent successfully!');
    } catch (error) {
        console.error('❌ Error sending emails:', error);
    }
    process.exit(0);
}

testEmails();
