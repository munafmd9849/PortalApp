/**
 * Email Service
 * Reusable email service for SMTP-based email functionality
 * Uses nodemailer with configuration from .env
 */

import { sendEmail } from '../config/email.js';
import logger from '../config/logger.js';
import { loadTemplate } from '../utils/templateLoader.js';
import path from 'path';

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} Result
 */
export async function sendOTP(email, otp) {
  try {
    const subject = 'Your PWIOI Portal Verification Code';
    const html = loadTemplate('01-otp-verification', { otp });
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
    const html = loadTemplate('02-job-posted-notification', {
      recruiterName: recruiter.fullName || 'Recruiter',
      jobTitle: job.jobTitle,
      companyName: job.company?.name || 'Company',
      location: job.location || 'N/A',
      salary: job.salary || job.ctc || job.salaryRange || 'Competitive',
      jobType: job.jobType || 'Full-time',
      postedDate: new Date(job.postedAt).toLocaleDateString(),
      viewJobUrl: `${process.env.FRONTEND_URL}/dashboard/recruiter?tab=jobs&jobId=${job.id}`
    });
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
export async function sendApplicationNotification(applicant, job) {
  try {
    // Email to applicant - confirmation
    const applicantEmail = applicant.email;
    if (!applicantEmail) {
      throw new Error('Applicant email not found');
    }

    const applicantSubject = `Application Confirmation: ${job.jobTitle}`;
    const html = loadTemplate('03-application-notification', {
      userName: applicant.fullName || 'Student',
      companyName: job.company?.name || 'Company',
      jobTitle: job.jobTitle,
      location: job.location || 'N/A',
      appliedDate: new Date().toLocaleDateString(),
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/student?tab=applications`
    });
    const text = `Your application for ${job.jobTitle} at ${job.company?.name || 'Company'} has been received.`;

    const result = await sendEmail({
      to: applicantEmail,
      subject: applicantSubject,
      html,
      text
    });

    logger.info(`Application confirmation sent to applicant ${applicantEmail}`);
    return { success: true, result };
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

    const html = loadTemplate('13-new-job-alert-student', {
      studentName,
      jobTitle,
      companyName,
      jobType,
      remoteType: job.remote ? 'Remote' : 'On-site',
      location,
      salary,
      deadlineDate: deadline || 'N/A',
      driveDate: driveDate || '',
      description: description || '',
      jobUrl
    });

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
 * Generate a generic un-personalized email template for bulk queue distribution
 * @param {Object} job - Job object
 * @returns {Object} { subject, html, text }
 */
export function generateGenericJobNotificationEmail(job) {
  const jobTitle = job.jobTitle || 'New Position';
  const companyName = job.company?.name || 'Partner Company';
  const location = job.location || 'Not specified';
  const jobType = job.jobType ? job.jobType.replace('_', ' ') : 'Not specified';

  // Format salary
  let salary = 'Not specified';
  if (job.minSalary && job.maxSalary) {
    salary = `₹${job.minSalary} - ₹${job.maxSalary} LPA`;
  } else if (job.minSalary) {
    salary = `₹${job.minSalary} LPA`;
  } else if (job.maxSalary) {
    salary = `Up to ₹${job.maxSalary} LPA`;
  }

  // Format dates
  const driveDate = job.driveDate ? new Date(job.driveDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : null;

  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : null;

  const postedDate = job.postedAt ? new Date(job.postedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Clean description for email (remove HTML, limit length)
  let description = job.description || '';
  description = description.replace(/<[^>]*>/g, ''); // Remove HTML tags
  description = description.length > 300 ? description.substring(0, 300) + '...' : description;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const jobUrl = `${frontendUrl}/dashboard/student?tab=jobs&jobId=${job.id}`;
  const subject = `New Opportunity: ${jobTitle} at ${companyName}`;

  const html = loadTemplate('13-new-job-alert-student', {
    studentName: 'Student',
    jobTitle,
    companyName,
    jobType,
    remoteType: job.remote ? 'Remote' : 'On-site',
    location,
    salary,
    deadlineDate: deadline || 'N/A',
    driveDate: driveDate || '',
    description: description || '',
    jobUrl
  });

  const text = `
New Job Opportunity: ${jobTitle} at ${companyName}

Hello Student,

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

  return { subject, html, text };
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
    const html = loadTemplate('04-application-status-update', {
      statusTitle: statusInfo.title,
      statusSubtitle: statusInfo.message,
      studentName: student.fullName || 'Student',
      jobTitle: job.jobTitle,
      companyName: job.company?.name || 'Company',
      statusBadge: application.status,
      appliedDate: application.appliedDate ? new Date(application.appliedDate).toLocaleDateString() : 'N/A',
      interviewDate: application.interviewDate ? new Date(application.interviewDate).toLocaleDateString() : 'N/A',
      recruiterNotes: application.notes || 'No specific notes from the recruiter.',
      portalUrl: `${process.env.FRONTEND_URL}/student`
    });
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
    const html = loadTemplate('05-password-reset', {
      resetPasswordUrl,
      otp
    });
    const text = `Your password reset code is: ${otp}. Use this link to reset: ${resetPasswordUrl}`;
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
export async function sendGenericNotification(email, subject, options = {}) {
  try {
    const {
      title = subject,
      message,
      userName = 'User',
      notificationType = 'Notification',
      panelMessage = '',
      actionText = 'View in Dashboard',
      actionUrl = `${process.env.FRONTEND_URL}/dashboard`,
      iconText = 'N'
    } = options;

    const html = loadTemplate('14-generic-notification', {
      notificationType,
      date: new Date().toLocaleDateString(),
      title,
      userName,
      message,
      panelMessage,
      actionText,
      actionUrl,
      iconText,
      supportUrl: `${process.env.FRONTEND_URL}/support`,
      privacyUrl: `${process.env.FRONTEND_URL}/privacy`
    });

    const text = `${title}\n\nHello ${userName},\n\n${message}\n\nView details here: ${actionUrl}`;

    const result = await sendEmail({ to: email, subject, html, text });

    logger.info(`Generic notification sent to ${email}: ${subject}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send generic notification to ${email}:`, error);
    throw error;
  }
}

/**
 * Send screening request email to recruiter when application deadline is reached
 * @param {Object} params - Email parameters
 */
export async function sendScreeningRequestEmail({ recruiterEmail, recruiterName, jobTitle, companyName, applicationCount, deadlineDate, screeningPortalUrl, expiryDays = 7 }) {
  try {
    const subject = `Action Required: Screening for ${jobTitle} at ${companyName}`;
    const html = loadTemplate('09-screening-request', {
      recruiterName: recruiterName || 'Recruiter',
      jobTitle,
      companyName,
      applicationCount,
      deadlineDate: new Date(deadlineDate).toLocaleDateString(),
      screeningPortalUrl,
      expiryDays
    });

    const text = `
The application window for ${jobTitle} at ${companyName} has closed. 
${applicationCount} applications are ready for your review.

Access the screening portal here:
${screeningPortalUrl}

This link will expire in ${expiryDays} days.
    `.trim();

    const result = await sendEmail({ to: recruiterEmail, subject, html, text });
    logger.info(`Screening request email sent to ${recruiterEmail} for job ${jobTitle}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send screening request email to ${recruiterEmail}:`, error);
    throw error;
  }
}

/**
 * Send interviewer invitation email with magic link
 * @param {Object} params - Email parameters
 */
export async function sendInterviewerInviteEmail({ interviewerEmail, interviewerName, jobTitle, companyName, magicLink, expiryDays = 7 }) {
  try {
    const subject = `Invitation: Interview session for ${jobTitle} at ${companyName}`;
    const html = loadTemplate('10-interviewer-invite', {
      interviewerName: interviewerName || 'Interviewer',
      jobTitle,
      companyName,
      magicLink,
      expiryDays
    });

    const text = `
You have been invited to participate as an interviewer for ${jobTitle} at ${companyName}.
Access the session details and evaluate candidates here:
${magicLink}

This link will expire in ${expiryDays} days.
    `.trim();

    const result = await sendEmail({ to: interviewerEmail, subject, html, text });
    logger.info(`Interviewer invite email sent to ${interviewerEmail} for job ${jobTitle}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send interviewer invite email to ${interviewerEmail}:`, error);
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
    const expiresDateStr = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = loadTemplate('06-endorsement-request', {
      teacherName: teacherName || 'Professor',
      studentName,
      studentEnrollmentId: studentEnrollmentId || 'N/A',
      magicLink,
      expiresAt: expiresDateStr
    });

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

IMPORTANT: This link expires on ${expiresDateStr} (48 hours). Please complete the endorsement before it expires.

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
    const frontendUrl = process.env.FRONTEND_URL;
    const fullLink = endorsementLink.startsWith('http') ? endorsementLink : `${frontendUrl}${endorsementLink}`;

    const subject = `Endorsement Request from ${studentName}`;
    const html = loadTemplate('06-endorsement-request', {
      teacherName: 'Professor',
      studentName,
      studentEnrollmentId: 'N/A',
      magicLink: fullLink,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString()
    });

    const text = `Endorsement Request from ${studentName}\n\n${studentMessage ? `Message: "${studentMessage}"\n\n` : ''}Provide endorsement at: ${fullLink}`;

    const result = await sendEmail({ to: teacherEmail, subject, html, text });

    logger.info(`Endorsement request email sent to ${teacherEmail} for student ${studentName}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send endorsement request email to ${teacherEmail}:`, error);
    throw error;
  }
}

/**
 * Send thank-you email after placement drive (interview session) ends.
 * @param {Object} params
 */
export async function sendDriveThankYouEmail({ to, recipientName, jobTitle, companyName, addNoteUrl }) {
  try {
    const subject = `Thank you for conducting the placement drive – ${companyName}`;

    const html = loadTemplate('07-drive-thank-you', {
      recipientName,
      jobTitle,
      companyName,
      driveDate: new Date().toLocaleDateString(),
      addNoteUrl
    });

    const text = `
Thank you for conducting this placement drive with us.

Drive: ${jobTitle || 'N/A'} at ${companyName || 'N/A'}

Please add a short note about this drive (feedback, observations, or any remarks).

Add your note: ${addNoteUrl}

This is an automated email from PWIOI Placement Portal.
    `.trim();

    const result = await sendEmail({ to, subject, html, text });
    logger.info(`Drive thank-you email sent to ${to} for job ${jobTitle}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send drive thank-you email to ${to}:`, error);
    throw error;
  }
}

/**
 * Send announcement email to a student
 */
export async function sendAnnouncementEmail(to, announcement, attachments = []) {
  try {
    const { title, description, link } = announcement;
    const subject = `📢 ${title}`;

    const html = loadTemplate('12-announcement-email', {
      announcementTitle: title,
      recipientName: 'Student',
      announcementContent: description || '',
      calloutPoint: 'Important update from the placement portal.',
      actionText: link ? 'Check Full Details' : 'Go to Dashboard',
      actionUrl: link || `${process.env.FRONTEND_URL}/dashboard`,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      announcementQuote: 'Your career journey is our priority.',
      senderName: announcement.senderName || 'Office of Career Services',
      senderOrg: 'PW Institute of Innovation'
    });

    const text = `${title}\n\n${(description || '').replace(/<[^>]*>/g, '')}\n\n— PWIOI Placement Portal`;

    const result = await sendEmail({ to, subject, html, text, attachments });
    logger.info(`Announcement email sent to ${to}: ${title}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send announcement email to ${to}:`, error);
    throw error;
  }
}

/** Format drive date for email display */
function formatDriveDateForEmail(driveDate) {
  if (!driveDate) return 'TBD';
  const d = new Date(driveDate);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Send drive reminder to recruiter(s) and admin(s)
 */
export async function sendDriveReminderRecruiterAdmin(job, recipientEmails, daysUntil) {
  if (!recipientEmails?.length) return { success: false, message: 'No recipients' };
  const companyName = job.companyName || job.company?.name || 'Company';
  const driveDateStr = formatDriveDateForEmail(job.driveDate);
  const subject = `Reminder: Drive in ${daysUntil} days – ${job.jobTitle} at ${companyName}`;

  const html = loadTemplate('17-drive-reminder-admin', {
    recipientName: 'Administrator',
    daysUntil,
    jobTitle: job.jobTitle,
    companyName,
    driveDate: driveDateStr,
    applicationCount: 'Check Portal',
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
  });

  const text = `Reminder: Drive in ${daysUntil} days – ${job.jobTitle} at ${companyName}. Drive date: ${driveDateStr}.`;
  const to = recipientEmails.filter(Boolean);
  const result = await sendEmail({ to, subject, html, text });
  logger.info(`Drive ${daysUntil}d reminder sent to ${to.length} recipient(s) for job ${job.id}`);
  return { success: true, ...result };
}

/**
 * Send drive reminder to students who applied
 */
export async function sendDriveReminderStudent(job, applicantEmails, daysUntil) {
  if (!applicantEmails?.length) return { success: false, message: 'No recipients' };

  const companyName = job.companyName || job.company?.name || 'Company';
  const driveDateStr = formatDriveDateForEmail(job.driveDate);
  const venueInfo = job.driveVenues ? (typeof job.driveVenues === 'string' ? job.driveVenues : (Array.isArray(job.driveVenues) ? job.driveVenues.join(', ') : '')) : 'Check portal';
  const reportingTime = job.reportingTime || 'N/A';

  const timeUntilTitle = daysUntil === 1 ? 'Tomorrow!' : `in ${daysUntil} days`;
  const timeUntilLowercase = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;

  const subject = daysUntil === 1
    ? `Reminder: Your placement drive is tomorrow – ${job.jobTitle} at ${companyName}`
    : `Reminder: Drive in ${daysUntil} days – ${job.jobTitle} at ${companyName}`;

  for (const email of applicantEmails) {
    try {
      const html = loadTemplate('08-drive-reminder', {
        studentName: 'Student',
        companyName,
        jobTitle: job.jobTitle,
        reportingTime,
        venue: venueInfo,
        timeUntilTitle,
        timeUntilLowercase
      });

      const text = `Your drive for ${job.jobTitle} at ${companyName} is ${timeUntilLowercase} (${driveDateStr}). Reporting: ${reportingTime}. Venue: ${venueInfo}`;
      await sendEmail({ to: email, subject, html, text });
    } catch (err) {
      logger.error(`Failed to send ${daysUntil}d reminder to applicant ${email}:`, err);
    }
  }

  logger.info(`Drive ${daysUntil}d reminder sent to ${applicantEmails.length} applicant(s) for job ${job.id}`);
  return { success: true };
}

/**
 * Send 24-hour drive reminder
 */
export async function sendDriveReminder24h(job, recruiterAdminEmails, applicantEmails) {
  const results = [];

  // Recruiter/Admin reminder (1 day until)
  if (recruiterAdminEmails?.length) {
    const res = await sendDriveReminderRecruiterAdmin(job, recruiterAdminEmails, 1);
    results.push({ type: 'recruiterAdmin', ...res });
  }

  // Student reminder (1 day until)
  if (applicantEmails?.length) {
    const res = await sendDriveReminderStudent(job, applicantEmails, 1);
    results.push({ type: 'student', ...res });
  }

  return { success: true, results };
}

/**
 * Send admin drive summary and thank you email
 */
export async function sendAdminDriveThankYou({ to, adminName, jobTitle, companyName, totalAttendees, interviewsHeld, feedbackStatus, reportUrl }) {
  try {
    const subject = `Drive Summary: ${jobTitle} at ${companyName}`;
    const html = loadTemplate('11-admin-drive-thank-you', {
      adminName: adminName || 'Administrator',
      companyName,
      jobTitle,
      totalAttendees,
      interviewsHeld,
      feedbackStatus,
      reportUrl
    });

    const text = `The placement drive for ${jobTitle} at ${companyName} has concluded. Total Attendees: ${totalAttendees}, Interviews Held: ${interviewsHeld}, Feedback: ${feedbackStatus}. Review report: ${reportUrl}`;

    const result = await sendEmail({ to, subject, html, text });
    logger.info(`Admin drive thank you email sent to ${to} for job ${jobTitle}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send admin drive thank you email to ${to}:`, error);
    throw error;
  }
}

/**
 * Send student query response email
 */
export async function sendStudentQueryResponse({ to, studentName, querySubject, ticketStatus, adminResponseTime, adminResponseText, studentQueryText, conversationUrl, ticketId }) {
  try {
    const subject = `Response to your query: ${querySubject}`;
    const html = loadTemplate('15-student-query-response', {
      studentName: studentName || 'Student',
      querySubject,
      ticketStatus: ticketStatus || 'Resolved',
      adminResponseTime,
      adminResponseText,
      studentQueryText,
      conversationUrl,
      ticketId
    });

    const text = `Your query "${querySubject}" (ID: #${ticketId}) has a response: "${adminResponseText}". View full conversation: ${conversationUrl}`;

    const result = await sendEmail({ to, subject, html, text });
    logger.info(`Student query response email sent to ${to} for ticket #${ticketId}`);
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Failed to send student query response email to ${to}:`, error);
    throw error;
  }
}
