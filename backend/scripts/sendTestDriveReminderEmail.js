/**
 * Send test drive reminder emails (7d / 3d / 24h template) to specified addresses
 * Usage: node scripts/sendTestDriveReminderEmail.js [7|3|24]
 *   Default: 7 (7-day reminder). Use 3 for 3-day, 24 for 24h reminder.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendDriveReminderRecruiterAdmin, sendDriveReminder24h } from '../src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const TEST_RECIPIENTS = [
  'mohammad.munaf.sot.2428@pwioi.com',
  'esha.bajaj.sot2428@pwioi.com',
  'mohammad.irfan.sot2428@pwioi.com',
  'charansai82140@gmail.com',
];

// Sample job for preview (same shape as real reminder)
const mockJob = {
  id: 'test-drive-reminder',
  jobTitle: 'Software Engineer (Sample)',
  companyName: 'Sample Tech Company',
  driveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  driveVenues: 'Main Campus – Block A, Hall 101',
  reportingTime: '9:00 AM',
};

async function main() {
  const type = (process.argv[2] || '7').toLowerCase();
  console.log('Sending test drive reminder email to:', TEST_RECIPIENTS.join(', '));

  if (type === '24') {
    // 24h: recruiter/admin version + applicant version (send applicant version to test addresses)
    await sendDriveReminder24h(mockJob, TEST_RECIPIENTS, TEST_RECIPIENTS);
    console.log('  ✓ Sent 24h reminder (recruiter/admin + applicant style) to all.');
  } else {
    const days = type === '3' ? 3 : 7;
    await sendDriveReminderRecruiterAdmin(mockJob, TEST_RECIPIENTS, days);
    console.log(`  ✓ Sent ${days}-day drive reminder to all.`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
