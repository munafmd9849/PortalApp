/**
 * Email Configuration (Nodemailer)
 * Replaces Firebase Functions for email sending
 * Used with BullMQ for async email processing
 *
 * Required env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * Optional: SMTP_FROM (defaults to "PWIOI Portal <SMTP_USER>")
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

// Validate SMTP environment variables before creating transporter
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('⚠️ SMTP environment variables are not configured properly.');
  console.warn('   Required: SMTP_HOST, SMTP_USER, SMTP_PASS (SMTP_PORT optional, defaults to 587)');
}

const port = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates (for development)
  },
});

// Verify transporter on startup (async, don't block server)
// Note: Verification is non-blocking - server will start even if email fails
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
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
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Email configuration missing: SMTP_HOST, SMTP_USER and SMTP_PASS must be set');
    }

    const from =
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `PWIOI Portal <${process.env.SMTP_USER}>` : 'PWIOI Portal <noreply@pwioi.com>');

    console.log(`Sending email to: ${to} via ${process.env.SMTP_HOST}`);

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

    const result = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully. MessageId: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
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
