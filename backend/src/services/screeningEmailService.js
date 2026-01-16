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
          lte: now // Deadline has passed
        },
        recruiterEmail: {
          not: null
        },
        status: {
          in: ['POSTED', 'ACTIVE']
        },
        isPosted: true
      },
      include: {
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
      const screeningUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/recruiter/screening?token=${encodeURIComponent(session.token)}&jobId=${job.id}`;

      // Send email to recruiter
      try {
        const emailSubject = `Screening Required: ${job.jobTitle} - ${job.companyName || 'Company'}`;
        const emailBody = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Screening Required</h2>
                <p>Dear ${job.recruiterName || 'Recruiter'},</p>
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
          to: job.recruiterEmail,
          subject: emailSubject,
          html: emailBody
        });

        results.push({
          jobId: job.id,
          jobTitle: job.jobTitle,
          recruiterEmail: job.recruiterEmail,
          status: 'sent',
          applicationsCount: job.applications.length
        });

        console.log(`✅ Screening email sent for job ${job.id} (${job.jobTitle}) to ${job.recruiterEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send screening email for job ${job.id}:`, emailError);
        results.push({
          jobId: job.id,
          jobTitle: job.jobTitle,
          recruiterEmail: job.recruiterEmail,
          status: 'failed',
          error: emailError.message
        });
      }
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
