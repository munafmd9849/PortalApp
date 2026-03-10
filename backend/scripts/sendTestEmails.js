/**
 * Send test emails to specified addresses
 * Usage: node scripts/sendTestEmails.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendEmail } from '../src/config/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const TEST_RECIPIENTS = [
  'mohammad.munaf.sot.2428@pwioi.com',
  'esha.bajaj.sot2428@pwioi.com',
  'mohammad.irfan.sot2428@pwioi.com',
  'charansai82140@gmail.com',
];

const subject = 'PWIOI Portal – Test Email';
const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Test Email</h2>
    <p>Hello,</p>
    <p>This is a test email from the PWIOI Placement Portal to verify email delivery.</p>
    <p>If you received this, the portal email configuration is working correctly.</p>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #666; font-size: 12px;">PWIOI Placement Portal – automated test.</p>
  </div>
`;
const text = 'This is a test email from the PWIOI Placement Portal. If you received this, email configuration is working.';

async function main() {
  console.log('Sending test emails to:', TEST_RECIPIENTS.join(', '));
  for (const to of TEST_RECIPIENTS) {
    try {
      await sendEmail({ to, subject, html, text });
      console.log('  ✓ Sent to', to);
    } catch (err) {
      console.error('  ✗ Failed to send to', to, ':', err.message);
    }
  }
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
