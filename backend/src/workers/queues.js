/**
 * BullMQ Queue Configuration
 * Replaces Firebase Functions for background job processing
 * Handles job distribution and email notifications
 * Lazy initialization to prevent Redis connection on import
 */

import { Queue, Worker } from 'bullmq';
import redis from '../config/redis.js';

// Lazy queue initialization to prevent Redis connection on import
let jobDistributionQueueInstance = null;
let emailNotificationQueueInstance = null;

/**
 * Get or create job distribution queue (lazy initialization)
 */
function getJobDistributionQueue() {
  if (!jobDistributionQueueInstance) {
    try {
      jobDistributionQueueInstance = new Queue('job-distribution', {
        connection: redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
    } catch (error) {
      console.error('❌ Failed to create job distribution queue:', error.message);
      return null;
    }
  }
  return jobDistributionQueueInstance;
}

/**
 * Get or create email notification queue (lazy initialization)
 */
function getEmailNotificationQueue() {
  if (!emailNotificationQueueInstance) {
    try {
      emailNotificationQueueInstance = new Queue('email-notifications', {
        connection: redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });
    } catch (error) {
      console.error('❌ Failed to create email notification queue:', error.message);
      return null;
    }
  }
  return emailNotificationQueueInstance;
}

// Export getters for direct queue access (for workers)
export { getJobDistributionQueue, getEmailNotificationQueue };

// For backward compatibility, export queue-like objects
export const jobDistributionQueue = {
  add: async (...args) => {
    const queue = getJobDistributionQueue();
    if (!queue) {
      console.warn('⚠️ Redis not available, job distribution queue disabled');
      return Promise.resolve();
    }
    return queue.add(...args);
  },
  close: async () => {
    const queue = jobDistributionQueueInstance;
    if (queue) return queue.close();
  },
};

export const emailNotificationQueue = {
  add: async (...args) => {
    const queue = getEmailNotificationQueue();
    if (!queue) {
      console.warn('⚠️ Redis not available, email notification queue disabled');
      return Promise.resolve();
    }
    return queue.add(...args);
  },
  close: async () => {
    const queue = emailNotificationQueueInstance;
    if (queue) return queue.close();
  },
};

/**
 * Add job distribution task to queue
 */
export async function addJobToQueue({ jobId, jobData, targeting }) {
  const queue = getJobDistributionQueue();
  if (!queue) {
    console.warn('⚠️ Redis not available, skipping job distribution');
    return;
  }
  await queue.add('distribute-job', {
    jobId,
    jobData,
    targeting,
  }, {
    priority: 1,
    jobId: `job-dist-${jobId}`,
  });
}

/**
 * Add email notification task to queue
 */
export async function addEmailToQueue({ jobId, recipients, subject, html, text }) {
  const queue = getEmailNotificationQueue();
  if (!queue) {
    console.warn('⚠️ Redis not available, skipping email queue');
    return;
  }
  await queue.add('send-email', {
    jobId,
    recipients,
    subject,
    html,
    text,
  });
}

// Export for use in controllers
// Queues are already exported above - no need to export again
