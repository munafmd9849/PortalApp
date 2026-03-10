/**
 * Email Configuration (Nodemailer)
 * Replaces Firebase Functions for email sending
 * Used with BullMQ for async email processing
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
// Note: Verification is non-blocking - server will start even if email fails
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  setImmediate(() => {
    transporter.verify((error, success) => {
      if (error) {
        // Only show error if it's not a network/DNS issue (which is common)
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
          console.warn('⚠️  Email transporter verification skipped: Cannot reach SMTP server');
          console.warn('   This is usually due to network/DNS issues and can be ignored during development');
          console.warn('   Email functionality will work when network is available');
        } else {
          console.error('❌ Email transporter verification failed:', error.message);
          console.error('   Check your EMAIL_USER and EMAIL_PASS in .env file');
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
    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASS must be set');
    }

    console.log(`Sending email to: ${to} via ${process.env.EMAIL_HOST}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'PWIOI Portal <noreply@pwioi.com>',
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
      message: error.message
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
  // For large lists, consider batching or using SES
  const results = await Promise.allSettled(
    recipients.map(email => sendEmail({ to: email, subject, html, text }))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return {
    total: recipients.length,
    successful,
    failed,
  };
}

export default transporter;
