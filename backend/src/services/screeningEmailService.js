/**
 * Screening Email Service
 * Sends recruiter screening links after application deadline
 */

import prisma from '../config/database.js';
import { sendEmail } from '../config/email.js';
import jwt from 'jsonwebtoken';
import { loadTemplate } from '../utils/templateLoader.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function generateScreeningToken(jobId, recruiterEmail) {
  return jwt.sign(
    { jobId, recruiterEmail, type: 'recruiter_screening' },
    JWT_SECRET,
    { expiresIn: '14d' }
  );
}

/**
 * Check for jobs with passed deadlines and send recruiter screening emails
 * EMAIL TRIGGER RULE:
 * - Trigger email based ONLY on applicationDeadline (NOT driveDate)
 * - Send when: currentTime >= applicationDeadline AND applicationDeadlineMailSent == false AND job.status == POSTED
 * - Must be idempotent (send only once per job)
 */
export async function checkAndSendScreeningEmails() {
  try {
    const now = new Date();

    // Find jobs where:
    // 1. Application deadline has passed (currentTime >= applicationDeadline)
    // 2. Email not sent yet (applicationDeadlineMailSent == false)
    // 3. Job is POSTED (status == POSTED)
    // 4. recruiterEmail is set
    // 5. requiresScreening OR requiresTest is true (EMAIL ONLY SENT IF SCREENING/TEST REQUIRED)
    // NOTE: Do NOT check driveDate - this is only based on applicationDeadline
    let jobs;
    try {
      jobs = await prisma.job.findMany({
        where: {
          applicationDeadline: {
            lte: now, // Deadline has passed (currentTime >= applicationDeadline)
            // Note: lte already implies field is not null - cannot compare null with Date
          },
          applicationDeadlineMailSent: false, // Email not sent yet (idempotency)
          status: 'POSTED', // Only POSTED jobs (NOT ACTIVE or other statuses)
          isPosted: true, // Additional check for posted jobs
          // CRITICAL: Only send email if screening or test is required
          OR: [
            { requiresScreening: true },
            { requiresTest: true }
          ],
          // Must have recruiter email
          AND: [
            {
              OR: [
                { recruiterEmail: { not: null } },
                { recruiterEmails: { not: null } }
              ]
            }
          ]
        },
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          recruiterEmail: true,
          recruiterName: true,
          recruiterEmails: true, // Include new field for multiple emails
          applicationDeadline: true,
          requiresScreening: true, // Include pre-interview requirement flags
          requiresTest: true,
          applications: {
            select: { id: true }
          },
          screeningSession: {
            select: {
              id: true,
              expiresAt: true
            }
          }
        },
        orderBy: {
          applicationDeadline: 'asc' // Process oldest deadlines first
        }
      });
    } catch (dbError) {
      // Handle database quota exceeded gracefully
      if (dbError.message && dbError.message.includes('quota')) {
        console.warn(`⚠️ [Deadline Email] Database quota exceeded. Skipping check at ${now.toISOString()}. Will retry when quota resets.`);
        return {
          success: false,
          skipped: true,
          reason: 'database_quota_exceeded',
          message: 'Database quota exceeded. Email checks will resume when quota resets.',
          processed: 0,
          results: []
        };
      }
      // Re-throw other database errors
      throw dbError;
    }

    const results = [];

    for (const job of jobs) {
      // Validate that deadline has actually passed (double-check for safety)
      const deadline = new Date(job.applicationDeadline);
      if (deadline > now) {
        // This shouldn't happen due to query filter, but safety check
        console.warn(`⚠️ Job ${job.id} deadline not yet passed, skipping`);
        continue;
      }

      // TRIGGER LOGIC: 
      // IF currentTime >= applicationDeadline
      // AND applicationDeadlineMailSent == false (already filtered in query)
      // AND job.status == POSTED (already filtered in query)
      // AND (requiresScreening == true OR requiresTest == true) (already filtered in query)
      // THEN: Send email immediately and mark as sent

      // Note: Email is ONLY sent if screening or test is required
      // If both are false, no email is sent and interviews can start immediately

      // Create or get screening session for the links
      let session = await prisma.recruiterScreeningSession.findUnique({
        where: { jobId: job.id }
      });

      if (!session) {
        // Create new session
        const newToken = generateScreeningToken(job.id, job.recruiterEmail || '');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        session = await prisma.recruiterScreeningSession.create({
          data: {
            jobId: job.id,
            token: newToken,
            expiresAt
          }
        });
      } else {
        // Check if expired, regenerate if needed
        if (new Date(session.expiresAt) < now) {
          const newToken = generateScreeningToken(job.id, job.recruiterEmail || '');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 14);

          session = await prisma.recruiterScreeningSession.update({
            where: { id: session.id },
            data: {
              token: newToken,
              expiresAt
            }
          });
        }
      }

      // FRONTEND_URL is validated at startup, so it's guaranteed to exist
      const screeningUrl = `${process.env.FRONTEND_URL}/recruiter/screening?token=${encodeURIComponent(session.token)}&jobId=${job.id}`;
      // TODO: Add QA/Test results page link (if it exists)
      // const qaTestResultsUrl = `${process.env.FRONTEND_URL}/recruiter/qa-results?token=${encodeURIComponent(session.token)}&jobId=${job.id}`;

      // Get all recruiter emails (support both new array format and old single email)
      let recruiterEmailsList = [];
      if (job.recruiterEmails) {
        try {
          recruiterEmailsList = typeof job.recruiterEmails === 'string'
            ? JSON.parse(job.recruiterEmails)
            : job.recruiterEmails;
          // Ensure it's an array and extract emails
          if (Array.isArray(recruiterEmailsList)) {
            recruiterEmailsList = recruiterEmailsList
              .map(rec => rec?.email?.trim())
              .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
          } else {
            recruiterEmailsList = [];
          }
        } catch (parseError) {
          console.warn(`Failed to parse recruiterEmails for job ${job.id}:`, parseError);
          recruiterEmailsList = [];
        }
      }

      // Fallback to single recruiterEmail if array is empty (backward compatibility)
      if (recruiterEmailsList.length === 0 && job.recruiterEmail) {
        recruiterEmailsList = [job.recruiterEmail];
      }

      // Send email to all recruiter emails
      const emailResults = [];
      for (const recruiterEmail of recruiterEmailsList) {
        try {
          const recruiterName = job.recruiterName ||
            (job.recruiterEmails && typeof job.recruiterEmails === 'string'
              ? (() => {
                try {
                  const parsed = JSON.parse(job.recruiterEmails);
                  const found = Array.isArray(parsed) ? parsed.find(r => r?.email === recruiterEmail) : null;
                  return found?.name || null;
                } catch {
                  return null;
                }
              })()
              : null) || 'Recruiter';

          const emailSubject = `Application Deadline Passed: ${job.jobTitle} - ${job.companyName || 'Company'}`;
          const html = loadTemplate('09-screening-request', {
            recruiterName,
            jobTitle: job.jobTitle,
            companyName: job.companyName || 'N/A',
            applicationCount: job.applications?.length || 0,
            deadlineDate: job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleString() : 'N/A',
            screeningPortalUrl: screeningUrl,
            expiryDays: 14
          });

          const text = `Application Deadline Passed: ${job.jobTitle}\n\nDear ${recruiterName},\n\nThe deadline for ${job.jobTitle} at ${job.companyName || 'N/A'} has passed. Review candidates here: ${screeningUrl}`;

          await sendEmail({
            to: recruiterEmail,
            subject: emailSubject,
            html,
            text
          });

          emailResults.push({ email: recruiterEmail, status: 'sent' });
          console.log(`✅ Deadline email sent for job ${job.id} (${job.jobTitle}) to ${recruiterEmail} at ${now.toISOString()}`);
        } catch (emailError) {
          console.error(`❌ Failed to send deadline email for job ${job.id} to ${recruiterEmail}:`, emailError);
          emailResults.push({ email: recruiterEmail, status: 'failed', error: emailError.message });
        }
      }

      // Mark email as sent ONLY if at least one email was successfully sent
      // This ensures idempotency - email won't be sent twice
      const hasSuccessfulEmail = emailResults.some(r => r.status === 'sent');
      if (hasSuccessfulEmail) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            applicationDeadlineMailSent: true
          }
        });
        console.log(`✅ Marked job ${job.id} as email sent (applicationDeadlineMailSent = true) at ${now.toISOString()}`);
      }

      results.push({
        jobId: job.id,
        jobTitle: job.jobTitle,
        applicationDeadline: job.applicationDeadline,
        deadlinePassedAt: now.toISOString(),
        recruiterEmails: recruiterEmailsList,
        emailResults,
        status: emailResults.some(r => r.status === 'sent') ? 'sent' : 'failed',
        emailSentFlag: hasSuccessfulEmail,
        applicationsCount: job.applications ? job.applications.length : 0
      });
    }

    return {
      success: true,
      processed: results.length,
      results
    };
  } catch (error) {
    // Handle database quota exceeded gracefully
    if (error.message && error.message.includes('quota')) {
      console.warn(`⚠️ [Deadline Email] Database quota exceeded. Skipping check. Will retry when quota resets.`);
      return {
        success: false,
        skipped: true,
        reason: 'database_quota_exceeded',
        message: 'Database quota exceeded. Email checks will resume when quota resets.',
        processed: 0,
        results: []
      };
    }
    console.error('Error in checkAndSendScreeningEmails:', error);
    throw error;
  }
}

/**
 * Manual trigger endpoint (for testing or admin use)
 * POST /api/admin/screening/send-emails
 */
export async function manualTriggerScreeningEmails(req, res) {
  try {
    const result = await checkAndSendScreeningEmails();
    res.json({
      success: true,
      message: `Processed ${result.processed} job(s)`,
      ...result
    });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({
      error: 'Failed to send screening emails',
      details: error.message
    });
  }
}
