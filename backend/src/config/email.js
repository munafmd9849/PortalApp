/**
 * Email Configuration
 *
 * Two modes:
 * 1) Local / traditional: use Nodemailer SMTP directly (transporter.sendMail)
 * 2) Deployed on Vercel: call an external email worker over HTTPS (EMAIL_WORKER_URL)
 *
 * Required env vars for SMTP mode:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * Optional:
 *   SMTP_FROM (defaults to "PWIOI Portal <SMTP_USER>")
 *
 * Additional env vars for worker mode:
 *   EMAIL_WORKER_URL   - base URL of worker (e.g. https://email-worker-abc.onrender.com)
 *   EMAIL_WORKER_SECRET - shared secret for authentication
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (parent of src/)
dotenv.config({ path: join(__dirname, '../../.env') });

// Validate email credentials
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ Email credentials not configured. Email features will not work.');
  console.warn('Please set EMAIL_USER and EMAIL_PASS in your .env file');
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates (for development)
  }
});

  // Verify transporter on startup (async, don't block server)
  if (host && user && pass) {
    setImmediate(() => {
      transporter.verify((error, success) => {
        if (error) {
          if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.warn('⚠️  Email transporter verification skipped: Cannot reach SMTP server');
            console.warn('   This is usually due to network/DNS issues and can be ignored during development');
            console.warn('   Email functionality will work when network is available');
          } else {
            console.error('❌ Email transporter verification failed:', error.message);
            console.error('   Check your SMTP_HOST, SMTP_USER and SMTP_PASS in .env file');
            if (error.message.includes('Invalid login')) {
              console.error('   ⚠️  Gmail App Password might be incorrect or expired');
            }
          }
        } else {
          console.log('✅ Email transporter is ready');
        }
      });
    });
  }
} else {
  console.log('[Email] Using EMAIL_WORKER_URL for sending emails (no direct SMTP from this server).');
}

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject - Subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body
 * @param {Array} options.attachments - Optional [{ filename, href } or { filename, content }]
 * @returns {Promise<Object>} Email result
 */
export async function sendEmail({ to, subject, html, text, cc, bcc, attachments }) {
  try {
    const from =
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `PWIOI Portal <${process.env.SMTP_USER}>` : 'PWIOI Portal <noreply@pwioi.com>');

    const currentHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    console.log(`Sending email to: ${to} via ${currentHost}`);

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      cc,
      bcc,
    };
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    if (useWorker) {
      const workerUrl = process.env.EMAIL_WORKER_URL;
      const workerSecret = process.env.EMAIL_WORKER_SECRET;

      if (!workerUrl || !workerSecret) {
        throw new Error('Email worker configuration missing: EMAIL_WORKER_URL and EMAIL_WORKER_SECRET must be set');
      }

      console.log('[Email] Using worker to send email.');

      const response = await fetch(`${workerUrl.replace(/\/$/, '')}/internal/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': workerSecret,
        },
        body: JSON.stringify({
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text,
          from: mailOptions.from,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Email worker failed: ${response.status} ${bodyText}`);
      }

      console.log('[Email] Worker reported success.');

      return {
        success: true,
        messageId: 'worker-delegated',
      };
    } else {
      const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
      const user = process.env.SMTP_USER || process.env.EMAIL_USER;
      const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

      if (!host || !user || !pass) {
        throw new Error('Email configuration missing: SMTP_HOST/EMAIL_HOST, SMTP_USER/EMAIL_USER and SMTP_PASS/EMAIL_PASS must be set');
      }

      const result = await transporter.sendMail(mailOptions);

      console.log(`Email sent successfully. MessageId: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
      };
    }
  } catch (error) {
    console.error('Email send error:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      message: error.message,
    });
    throw error;
  }
}

/**
 * Send email to multiple recipients
 * @param {string[]} recipients - Email addresses
 * @param {string} subject - Subject
 * @param {string} html - HTML body
 * @param {string} text - Plain text body
 * @returns {Promise<Object>} Results
 */
export async function sendBulkEmail(recipients, subject, html, text) {
  const results = await Promise.allSettled(
    recipients.map((email) => sendEmail({ to: email, subject, html, text }))
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return {
    total: recipients.length,
    successful,
    failed,
  };
}

export default transporter;
