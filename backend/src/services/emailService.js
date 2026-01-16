/**
 * Email Service
 * Reusable email service for SMTP-based email functionality
 * Uses nodemailer with configuration from .env
 */

import { sendEmail } from '../config/email.js';
import logger from '../config/logger.js';

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} Result
 */
export async function sendOTP(email, otp) {
  try {
    const subject = 'Your PWIOI Portal Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Hello,</p>
        <p>Your verification code for PWIOI Placement Portal is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #0066cc; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `Your verification code is: ${otp}. This code will expire in 5 minutes.`;

    const result = await sendEmail({ to: email, subject, html, text });
    
    logger.info(`OTP email sent to ${email}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send job posted notification to recruiter
 * @param {Object} job - Job object
 * @param {Object} recruiter - Recruiter object with user info
 * @returns {Promise<Object>} Result
 */
export async function sendJobPostedNotification(job, recruiter) {
  try {
    const recruiterEmail = recruiter.user?.email || recruiter.email;
    if (!recruiterEmail) {
      throw new Error('Recruiter email not found');
    }

    const subject = `Job Posted: ${job.jobTitle} at ${job.company?.name || 'Company'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Job Successfully Posted!</h2>
        <p>Hello,</p>
        <p>Your job posting has been approved and posted to the portal.</p>
        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
          <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
          <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
          <p><strong>Posted Date:</strong> ${new Date(job.postedAt).toLocaleDateString()}</p>
        </div>
        <p>Students matching your job criteria will be notified automatically.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `Your job posting "${job.jobTitle}" has been approved and posted. Students matching your criteria will be notified.`;

    const result = await sendEmail({ to: recruiterEmail, subject, html, text });
    
    logger.info(`Job posted notification sent to ${recruiterEmail} for job ${job.id}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send job posted notification:`, error);
    throw error;
  }
}

/**
 * Send application notification
 * Sends to both recruiter (new application) and applicant (confirmation)
 * @param {Object} applicant - Student/applicant object
 * @param {Object} job - Job object
 * @param {Object} recruiter - Recruiter object
 * @returns {Promise<Object>} Result
 */
export async function sendApplicationNotification(applicant, job, recruiter) {
  try {
    const results = [];

    // Email to recruiter - new application
    const recruiterEmail = recruiter?.user?.email || recruiter?.email;
    if (recruiterEmail) {
      const recruiterSubject = `New Application: ${applicant.fullName || applicant.email} applied for ${job.jobTitle}`;
      const recruiterHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Job Application</h2>
          <p>Hello,</p>
          <p>You have received a new application for your job posting.</p>
          <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
            <p><strong>Applicant:</strong> ${applicant.fullName || applicant.email}</p>
            <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
            <p><strong>Applied Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Please review the application in your dashboard.</p>
        </div>
      `;
      const recruiterText = `New application from ${applicant.fullName || applicant.email} for ${job.jobTitle}.`;

      const recruiterResult = await sendEmail({ 
        to: recruiterEmail, 
        subject: recruiterSubject, 
        html: recruiterHtml, 
        text: recruiterText 
      });
      results.push({ type: 'recruiter', ...recruiterResult });
      logger.info(`Application notification sent to recruiter ${recruiterEmail}`);
    }

    // Email to applicant - confirmation
    const applicantEmail = applicant.email;
    if (applicantEmail) {
      const applicantSubject = `Application Confirmation: ${job.jobTitle}`;
      const applicantHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Application Received</h2>
          <p>Hello ${applicant.fullName || 'Student'},</p>
          <p>Your application has been successfully submitted!</p>
          <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
            <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
            <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
            <p><strong>Applied Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>The recruiter will review your application and contact you if you're shortlisted.</p>
          <p>You can track your application status in your dashboard.</p>
        </div>
      `;
      const applicantText = `Your application for ${job.jobTitle} at ${job.company?.name || 'Company'} has been received.`;

      const applicantResult = await sendEmail({ 
        to: applicantEmail, 
        subject: applicantSubject, 
        html: applicantHtml, 
        text: applicantText 
      });
      results.push({ type: 'applicant', ...applicantResult });
      logger.info(`Application confirmation sent to applicant ${applicantEmail}`);
    }

    return { success: true, results };
  } catch (error) {
    logger.error(`Failed to send application notification:`, error);
    throw error;
  }
}

/**
 * Send new job notification to student
 * @param {Object} student - Student object with email
 * @param {Object} job - Job object
 * @returns {Promise<Object>} Result
 */
export async function sendNewJobNotification(student, job) {
  try {
    const studentEmail = student.email || student.user?.email;
    if (!studentEmail) {
      throw new Error('Student email not found');
    }

    const studentName = student.fullName || student.user?.displayName || 'Student';
    const companyName = job.company?.name || 'Company';
    const jobTitle = job.jobTitle || 'Position';
    const location = job.location || job.companyLocation || 'Not specified';
    const jobType = job.jobType || 'Full-time';
    const salary = job.salary || job.ctc || job.salaryRange || 'Competitive';
    const driveDate = job.driveDate ? new Date(job.driveDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : null;
    const deadline = job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : null;
    const postedDate = job.postedAt ? new Date(job.postedAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Clean description for email (remove HTML, limit length)
    let description = job.description || '';
    description = description.replace(/<[^>]*>/g, ''); // Remove HTML tags
    description = description.length > 300 ? description.substring(0, 300) + '...' : description;

    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    const jobUrl = `${frontendUrl}/dashboard/student?tab=jobs&jobId=${job.id}`;

    const subject = `New Opportunity: ${jobTitle} at ${companyName}`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Opportunity</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                New Job Opportunity
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">
                A position matching your profile has been posted
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #2d3748; font-size: 16px; line-height: 1.6;">
                Hello <strong style="color: #1a202c;">${studentName}</strong>,
              </p>
              <p style="margin: 15px 0 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                We're excited to inform you that a new job opportunity matching your profile has been posted on the placement portal. This could be your next career step!
              </p>
            </td>
          </tr>

          <!-- Job Details Card -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; color: #1a202c; font-size: 22px; font-weight: 600; line-height: 1.3;">
                      ${jobTitle}
                    </h2>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-size: 14px; width: 140px; vertical-align: top;">
                          <strong style="color: #2d3748;">Company:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1a202c; font-size: 14px; font-weight: 500;">
                          ${companyName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                          <strong style="color: #2d3748;">Location:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1a202c; font-size: 14px; font-weight: 500;">
                          ${location}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                          <strong style="color: #2d3748;">Job Type:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1a202c; font-size: 14px; font-weight: 500;">
                          ${jobType}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                          <strong style="color: #2d3748;">Compensation:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1a202c; font-size: 14px; font-weight: 500;">
                          ${salary}
                        </td>
                      </tr>
                      ${driveDate ? `
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                          <strong style="color: #2d3748;">Drive Date:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1a202c; font-size: 14px; font-weight: 500;">
                          ${driveDate}
                        </td>
                      </tr>
                      ` : ''}
                      ${deadline ? `
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                          <strong style="color: #2d3748;">Application Deadline:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 500;">
                          ${deadline}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Description -->
          ${description ? `
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background-color: #ffffff; border-left: 4px solid #667eea; padding: 20px; border-radius: 4px;">
                <h3 style="margin: 0 0 12px; color: #1a202c; font-size: 16px; font-weight: 600;">
                  Job Description
                </h3>
                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">
                  ${description}
                </p>
        </div>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 10px 40px 30px; text-align: center;">
              <a href="${jobUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                View Full Job Details & Apply
          </a>
            </td>
          </tr>

          <!-- Additional Info -->
          <tr>
            <td style="padding: 0 40px 25px;">
              <p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.6; text-align: center;">
                Don't miss this opportunity! Log in to your dashboard to view complete details and submit your application.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; border-top: 1px solid #e2e8f0; padding: 25px 40px; text-align: center;">
              <p style="margin: 0 0 8px; color: #718096; font-size: 12px; line-height: 1.5;">
                This is an automated notification from the <strong style="color: #4a5568;">PWIOI Placement Portal</strong>
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 11px;">
                Posted on ${postedDate}
              </p>
              <p style="margin: 12px 0 0; color: #cbd5e0; font-size: 11px;">
                If you believe this email was sent in error, please contact the placement office.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    
    const text = `
New Job Opportunity: ${jobTitle} at ${companyName}

Hello ${studentName},

A new job opportunity matching your profile has been posted on the placement portal.

Job Details:
- Position: ${jobTitle}
- Company: ${companyName}
- Location: ${location}
- Job Type: ${jobType}
- Compensation: ${salary}
${driveDate ? `- Drive Date: ${driveDate}` : ''}
${deadline ? `- Application Deadline: ${deadline}` : ''}

${description ? `\nDescription:\n${description}\n` : ''}

View full job details and apply: ${jobUrl}

Posted on ${postedDate}

This is an automated notification from PWIOI Placement Portal.
    `.trim();

    const result = await sendEmail({ to: studentEmail, subject, html, text });
    
    logger.info(`New job notification sent to student ${studentEmail} for job ${job.id}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send new job notification to student:`, error);
    throw error;
  }
}

/**
 * Send new job notifications to multiple students
 * @param {Object[]} students - Array of student objects
 * @param {Object} job - Job object
 * @returns {Promise<Object>} Results summary
 */
export async function sendBulkJobNotifications(students, job) {
  try {
    const results = await Promise.allSettled(
      students.map(student => sendNewJobNotification(student, job))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk job notifications sent: ${successful} successful, ${failed} failed for job ${job.id}`);

    return {
      success: true,
      total: students.length,
      successful,
      failed,
    };
  } catch (error) {
    logger.error(`Failed to send bulk job notifications:`, error);
    throw error;
  }
}

/**
 * Send application status update notification to student
 * @param {Object} student - Student object with email
 * @param {Object} job - Job object
 * @param {Object} application - Application object with status
 * @returns {Promise<Object>} Result
 */
export async function sendApplicationStatusUpdateNotification(student, job, application) {
  try {
    const studentEmail = student.email || student.user?.email;
    if (!studentEmail) {
      throw new Error('Student email not found');
    }

    const statusMessages = {
      'SHORTLISTED': {
        title: 'Congratulations! You\'ve been shortlisted! 🎉',
        message: 'Great news! Your application has been shortlisted. The recruiter will contact you soon for the next steps.',
        color: '#28a745',
      },
      'INTERVIEWED': {
        title: 'Interview Scheduled',
        message: 'Your interview has been scheduled. Please check your dashboard for details.',
        color: '#17a2b8',
      },
      'OFFERED': {
        title: 'Congratulations! You\'ve received an offer! 🎊',
        message: 'Congratulations! You have received an offer for this position. Please check your dashboard for details.',
        color: '#28a745',
      },
      'SELECTED': {
        title: 'Congratulations! You\'ve been selected! 🎊',
        message: 'Congratulations! You have been selected for this position. The recruiter will contact you with next steps.',
        color: '#28a745',
      },
      'REJECTED': {
        title: 'Application Update',
        message: 'Thank you for your interest. Unfortunately, your application has not been selected for this position. Keep applying to other opportunities!',
        color: '#dc3545',
      },
      'JOB_REMOVED': {
        title: 'Job Position Removed',
        message: 'The job position you applied for has been removed by the company.',
        color: '#ffc107',
      },
    };

    const statusInfo = statusMessages[application.status] || {
      title: 'Application Status Updated',
      message: `Your application status has been updated to ${application.status}.`,
      color: '#0066cc',
    };

    const subject = `${statusInfo.title} - ${job.jobTitle} at ${job.company?.name || 'Company'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${statusInfo.title}</h2>
        <p>Hello ${student.fullName || 'Student'},</p>
        <p>${statusInfo.message}</p>
        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid ${statusInfo.color};">
          <h3 style="margin-top: 0; color: #0066cc;">${job.jobTitle}</h3>
          <p><strong>Company:</strong> ${job.company?.name || 'N/A'}</p>
          <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
          <p><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${application.status}</span></p>
          ${application.interviewDate ? `<p><strong>Interview Date:</strong> ${new Date(application.interviewDate).toLocaleDateString()}</p>` : ''}
          ${application.appliedDate ? `<p><strong>Applied Date:</strong> ${new Date(application.appliedDate).toLocaleDateString()}</p>` : ''}
          ${application.notes ? `<p><strong>Notes:</strong> ${application.notes}</p>` : ''}
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/student" 
             style="background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Application Status
          </a>
        </div>
        <p>You can track your application status and view more details in your dashboard.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `${statusInfo.title}\n\nHello ${student.fullName || 'Student'},\n\n${statusInfo.message}\n\nJob: ${job.jobTitle}\nCompany: ${job.company?.name || 'N/A'}\nStatus: ${application.status}${application.interviewDate ? `\nInterview Date: ${new Date(application.interviewDate).toLocaleDateString()}` : ''}\n\nView your application status in your dashboard.`;

    const result = await sendEmail({ to: studentEmail, subject, html, text });
    
    logger.info(`Application status update notification sent to ${studentEmail} for application ${application.id}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send application status update notification:`, error);
    throw error;
  }
}

/**
 * Send password reset OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} Result
 */
export async function sendPasswordResetOTP(email, otp) {
  try {
    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    const resetPasswordUrl = `${frontendUrl}/reset-password?email=${encodeURIComponent(email)}`;
    
    const subject = 'Password Reset - PWIOI Portal';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested to reset your password for PWIOI Placement Portal.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetPasswordUrl}" 
             style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or use this code to reset your password:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #dc3545; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `You requested to reset your password. Click here to reset: ${resetPasswordUrl}\n\nOr use this code: ${otp}. This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.`;

    const result = await sendEmail({ to: email, subject, html, text });
    
    logger.info(`Password reset OTP email sent to ${email}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send password reset OTP email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send generic notification email
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML or plain text)
 * @returns {Promise<Object>} Result
 */
export async function sendGenericNotification(email, subject, message) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px;">
          ${message}
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;

    const result = await sendEmail({ to: email, subject, html, text: message });
    
    logger.info(`Generic notification sent to ${email}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send generic notification to ${email}:`, error);
    throw error;
  }
}

/**
 * Send endorsement magic link email to teacher
 * @param {Object} params - Email parameters
 * @param {string} params.teacherEmail - Teacher email address
 * @param {string} params.teacherName - Teacher name
 * @param {string} params.studentName - Student's name
 * @param {string} params.studentEnrollmentId - Student enrollment ID
 * @param {string} params.magicLink - Magic link URL
 * @param {Date} params.expiresAt - Expiration date
 * @returns {Promise<Object>} Result
 */
export async function sendEndorsementMagicLinkEmail({ teacherEmail, teacherName, studentName, studentEnrollmentId, magicLink, expiresAt }) {
  try {
    const subject = `Endorsement Request from ${studentName}`;
    
    // Format expiration date
    const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Endorsement Request</h2>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">Hello ${teacherName || 'there'},</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            <strong>${studentName}</strong> (Enrollment: ${studentEnrollmentId || 'N/A'}) has requested an endorsement letter from you for their placement portfolio.
          </p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            This endorsement will be used in their resume and placement applications.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Write Endorsement
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${magicLink}" style="color: #3b82f6; word-break: break-all;">${magicLink}</a>
          </p>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 12px;">
              <strong>Important:</strong> This link expires on ${expiresDate} (48 hours). Please complete the endorsement before it expires.
            </p>
          </div>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            <strong>What you'll need to provide:</strong>
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 10px 0;">
            <li>Your endorsement message</li>
            <li>Skills you're endorsing (optional)</li>
            <li>Strength rating (optional)</li>
          </ul>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 20px;">
            <strong>No account required.</strong> Simply click the link above to get started.
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated email from PWIOI Placement Portal. If you did not expect this request, please ignore this email.
          </p>
        </div>
      </div>
    `;
    
    const text = `
Endorsement Request from ${studentName}

${studentName} (Enrollment: ${studentEnrollmentId || 'N/A'}) has requested an endorsement letter from you for their placement portfolio.

This endorsement will be used in their resume and placement applications.

To provide your endorsement, please visit:
${magicLink}

What you'll need to provide:
- Your endorsement message
- Skills you're endorsing (optional)
- Strength rating (optional)

No account required. Simply click the link above to get started.

IMPORTANT: This link expires on ${expiresDate} (48 hours). Please complete the endorsement before it expires.

This is an automated email from PWIOI Placement Portal.
    `.trim();

    const result = await sendEmail({ to: teacherEmail, subject, html, text });
    
    logger.info(`Endorsement magic link email sent to ${teacherEmail} for student ${studentName}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send endorsement magic link email to ${teacherEmail}:`, error);
    throw error;
  }
}

/**
 * Send endorsement request email to teacher (legacy function - kept for compatibility)
 * @param {string} teacherEmail - Teacher email address
 * @param {string} studentName - Student's name
 * @param {string} endorsementLink - Unique link for endorsement submission
 * @param {string} studentMessage - Optional message from student
 * @returns {Promise<Object>} Result
 */
export async function sendEndorsementRequestEmail(teacherEmail, studentName, endorsementLink, studentMessage = null) {
  try {
    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    const fullLink = `${frontendUrl}${endorsementLink}`;
    
    const subject = `Endorsement Request from ${studentName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Endorsement Request</h2>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">Hello,</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            <strong>${studentName}</strong> has requested an endorsement letter from you through the PWIOI Placement Portal.
          </p>
          ${studentMessage ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-style: italic;">
              "${studentMessage}"
            </p>
            <p style="margin: 5px 0 0; color: #78350f; font-size: 12px;">— ${studentName}</p>
          </div>
          ` : ''}
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            To provide your endorsement, please click the button below. You will be able to:
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 15px 0;">
            <li>Fill in your name and details</li>
            <li>Write an endorsement message</li>
            <li>Sign the document digitally using a canvas</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${fullLink}" style="display: inline-block; background: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Complete Endorsement
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${fullLink}" style="color: #f97316; word-break: break-all;">${fullLink}</a>
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-size: 12px;">
              <strong>Note:</strong> This link will expire in 30 days. Please complete the endorsement as soon as possible.
            </p>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated email from PWIOI Placement Portal. If you did not expect this request, please ignore this email.
          </p>
        </div>
      </div>
    `;
    
    const text = `
Endorsement Request from ${studentName}

${studentName} has requested an endorsement letter from you.

${studentMessage ? `Message from student: "${studentMessage}"\n\n` : ''}To provide your endorsement, please visit:
${fullLink}

You will be able to fill in your details, write an endorsement message, and sign the document digitally.

This link will expire in 30 days.

This is an automated email from PWIOI Placement Portal.
    `.trim();

    const result = await sendEmail({ to: teacherEmail, subject, html, text });
    
    logger.info(`Endorsement request email sent to ${teacherEmail} for student ${studentName}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send endorsement request email to ${teacherEmail}:`, error);
    throw error;
  }
}

