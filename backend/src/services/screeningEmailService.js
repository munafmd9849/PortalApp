/**
 * Screening Email Service
 * Sends recruiter screening links after application deadline
 */

import prisma from '../config/database.js';
import { sendEmail } from '../config/email.js';
import jwt from 'jsonwebtoken';

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
 * This should be called by a cron job or scheduled task
 */
export async function checkAndSendScreeningEmails() {
  try {
    const now = new Date();
    
    // Find jobs where:
    // 1. Application deadline has passed
    // 2. recruiterEmail is set
    // 3. No screening session exists yet (or session expired)
    // 4. Job has applications
    const jobs = await prisma.job.findMany({
      where: {
        applicationDeadline: {
          lte: now, // Deadline has passed
          not: null // Must have applicationDeadline set
        },
        OR: [
          { recruiterEmail: { not: null } },
          { recruiterEmails: { not: null } }
        ],
        status: {
          in: ['POSTED', 'ACTIVE']
        },
        isPosted: true
      },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        recruiterEmail: true,
        recruiterName: true,
        recruiterEmails: true, // Include new field for multiple emails
        applicationDeadline: true,
        applications: {
          select: { id: true }
        },
        screeningSession: {
          select: {
            id: true,
            expiresAt: true
          }
        }
      }
    });

    const results = [];

    for (const job of jobs) {
      // Skip if no applications
      if (!job.applications || job.applications.length === 0) {
        continue;
      }

      // Check if screening session already exists and is valid
      if (job.screeningSession) {
        const expiresAt = new Date(job.screeningSession.expiresAt);
        if (expiresAt > now) {
          // Valid session exists, skip
          continue;
        }
      }

      // Create or get screening session
      let session = await prisma.recruiterScreeningSession.findUnique({
        where: { jobId: job.id }
      });

      if (!session) {
        // Create new session
        const newToken = generateScreeningToken(job.id, job.recruiterEmail);
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
          const newToken = generateScreeningToken(job.id, job.recruiterEmail);
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

          const emailSubject = `Screening Required: ${job.jobTitle} - ${job.companyName || 'Company'}`;
          const emailBody = `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">Screening Required</h2>
                  <p>Dear ${recruiterName},</p>
                  <p>The application deadline for the following position has passed:</p>
                  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Job Title:</strong> ${job.jobTitle}</p>
                    <p><strong>Company:</strong> ${job.companyName || 'N/A'}</p>
                    <p><strong>Total Applications:</strong> ${job.applications.length}</p>
                    <p><strong>Application Deadline:</strong> ${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <p>Please use the link below to access the screening portal and review applications:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${screeningUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Access Screening Portal
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
                    <strong>Note:</strong> This link will expire in 14 days. If you need a new link, please contact the admin.
                  </p>
                  <p style="font-size: 12px; color: #6b7280;">
                    If the button doesn't work, copy and paste this URL into your browser:<br>
                    <span style="word-break: break-all;">${screeningUrl}</span>
                  </p>
                </div>
              </body>
            </html>
          `;

          await sendEmail({
            to: recruiterEmail,
            subject: emailSubject,
            html: emailBody
          });

          emailResults.push({ email: recruiterEmail, status: 'sent' });
          console.log(`✅ Screening email sent for job ${job.id} (${job.jobTitle}) to ${recruiterEmail}`);
        } catch (emailError) {
          console.error(`❌ Failed to send screening email for job ${job.id} to ${recruiterEmail}:`, emailError);
          emailResults.push({ email: recruiterEmail, status: 'failed', error: emailError.message });
        }
      }

      results.push({
        jobId: job.id,
        jobTitle: job.jobTitle,
        recruiterEmails: recruiterEmailsList,
        emailResults,
        status: emailResults.some(r => r.status === 'sent') ? 'sent' : 'failed',
        applicationsCount: job.applications.length
      });
    }

    return {
      success: true,
      processed: results.length,
      results
    };
  } catch (error) {
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
