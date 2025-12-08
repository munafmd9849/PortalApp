/**
 * Email Notification Worker
 * Processes email notifications asynchronously
 * Replaces Firebase Functions email sending
 */

import { Worker } from 'bullmq';
import redis, { isRedisAvailable } from '../config/redis.js';
import { sendEmail, sendBulkEmail } from '../config/email.js';
import prisma from '../config/database.js';

// Only create worker if Redis is available
let worker = null;

async function createWorker() {
  const available = await isRedisAvailable();
  if (!available) {
    console.warn('⚠️ Redis not available, email notification worker disabled');
    return null;
  }

  return new Worker(
    'email-notifications',
    async (job) => {
      const { jobId, recipients, subject, html, text } = job.data;

      console.log(`📧 Sending email notification to ${recipients.length} recipients`);

      try {
        // Update email notification status
        let emailNotification = null;
        if (jobId) {
          emailNotification = await prisma.emailNotification.create({
            data: {
              jobId,
              recipients,
              status: 'PENDING',
              subject,
              body: text || html,
            },
          });
        }

        // Send emails (batch for large lists)
        const result = await sendBulkEmail(recipients, subject, html, text);

        // Update status
        if (emailNotification) {
          await prisma.emailNotification.update({
            where: { id: emailNotification.id },
            data: {
              status: result.failed === 0 ? 'SENT' : 'FAILED',
              sentAt: new Date(),
            },
          });
        }

        console.log(`✅ Email sent: ${result.successful}/${result.total} successful`);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        console.error(`❌ Email sending failed:`, error);

        // Update status to failed
        if (jobId) {
          await prisma.emailNotification.updateMany({
            where: { jobId },
            data: {
              status: 'FAILED',
            },
          });
        }

        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 10, // Send 10 emails concurrently
    }
  );
}

// Initialize worker (will be null if Redis unavailable)
createWorker().then(w => {
  worker = w;
  if (worker) {
    worker.on('completed', (job) => {
      console.log(`✅ Email notification completed: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Email notification failed: ${job?.id}`, err);
    });
  }
});

export default worker;
