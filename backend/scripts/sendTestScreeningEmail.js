/**
 * Script to send a test screening email to a specific email address
 * Usage: node scripts/sendTestScreeningEmail.js <email> [jobId]
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendEmail } from '../src/config/email.js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function generateScreeningToken(jobId, recruiterEmail) {
  return jwt.sign(
    { jobId, recruiterEmail, type: 'recruiter_screening' },
    JWT_SECRET,
    { expiresIn: '14d' }
  );
}

async function sendScreeningEmail(recipientEmail, jobId = null) {
  try {
    let job = null;
    let sessionToken = null;

    // If jobId provided, try to fetch job details (skip if quota exceeded)
    if (jobId) {
      try {
        job = await prisma.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            applicationDeadline: true,
            applications: {
              select: { id: true }
            }
          }
        });

        if (job) {
          // Get or create screening session - always generate a fresh token for testing
          try {
            let session = await prisma.recruiterScreeningSession.findUnique({
              where: { jobId: job.id }
            });

            // Always generate a fresh token for test emails
            const newToken = generateScreeningToken(job.id, recipientEmail);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 14);

            if (!session) {
              session = await prisma.recruiterScreeningSession.create({
                data: {
                  jobId: job.id,
                  token: newToken,
                  expiresAt
                }
              });
            } else {
              // Update existing session with new token
              session = await prisma.recruiterScreeningSession.update({
                where: { id: session.id },
                data: {
                  token: newToken,
                  expiresAt
                }
              });
            }

            sessionToken = session.token;
            
            // Verify token length is correct
            if (!sessionToken || sessionToken.length < 100) {
              console.warn(`⚠️  Warning: Token seems too short (${sessionToken?.length || 0} chars). Generating new one.`);
              sessionToken = newToken;
            }
          } catch (sessionError) {
            if (sessionError.message.includes('quota')) {
              console.log('⚠️  Database quota exceeded, generating token without creating session...');
              // Generate token anyway - backend will create session when accessed
              sessionToken = generateScreeningToken(job.id, recipientEmail);
            } else {
              throw sessionError;
            }
          }
        } else {
          console.log(`⚠️  Job ${jobId} not found, but proceeding to send email with provided job ID...`);
          job = {
            id: jobId,
            jobTitle: 'Job (ID: ' + jobId.substring(0, 8) + '...)',
            companyName: 'Company',
            applicationDeadline: new Date(),
            applications: []
          };
          sessionToken = generateScreeningToken(jobId, recipientEmail);
        }
      } catch (dbError) {
        if (dbError.message.includes('quota')) {
          console.log('⚠️  Database quota exceeded, sending email without fetching job details...');
          // Use provided job ID without validation
          job = {
            id: jobId,
            jobTitle: 'Job (ID: ' + jobId.substring(0, 8) + '...)',
            companyName: 'Company',
            applicationDeadline: new Date(),
            applications: []
          };
          sessionToken = generateScreeningToken(jobId, recipientEmail);
        } else {
          throw dbError;
        }
      }
    } else {
      throw new Error('Job ID is required. Usage: node scripts/sendTestScreeningEmail.js <email> <jobId>');
    }

    const screeningUrl = `${FRONTEND_URL}/recruiter/screening?token=${encodeURIComponent(sessionToken)}&jobId=${job.id}`;

    const emailSubject = `Application Deadline Passed: ${job.jobTitle} - ${job.companyName || 'Company'}`;
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Application Deadline Passed</h2>
            <p>Dear Recruiter,</p>
            <p>The application deadline for the following position has passed:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Job Title:</strong> ${job.jobTitle}</p>
              <p><strong>Company:</strong> ${job.companyName || 'N/A'}</p>
              <p><strong>Application Deadline:</strong> ${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleString() : 'N/A'}</p>
              ${job.applications && job.applications.length > 0 ? `<p><strong>Total Applications:</strong> ${job.applications.length}</p>` : ''}
            </div>
            <p>Please use the links below to access the screening portal and review applications:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${screeningUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px;">
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

    console.log(`📧 Sending screening email to: ${recipientEmail}`);
    console.log(`🔗 Screening URL: ${screeningUrl}\n`);

    await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody
    });

    console.log(`✅ Screening email sent successfully to ${recipientEmail}!`);
    return { success: true, email: recipientEmail, screeningUrl };

  } catch (error) {
    console.error(`❌ Error sending screening email:`, error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: Email address is required');
    console.log('\nUsage: node scripts/sendTestScreeningEmail.js <email> [jobId]');
    console.log('Example: node scripts/sendTestScreeningEmail.js charansai82140@gmail.com');
    console.log('Example: node scripts/sendTestScreeningEmail.js charansai82140@gmail.com <job-id>\n');
    process.exit(1);
  }

  const email = args[0];
  const jobId = args[1] || null;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`❌ Error: Invalid email format: ${email}`);
    process.exit(1);
  }

  try {
    await sendScreeningEmail(email, jobId);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
