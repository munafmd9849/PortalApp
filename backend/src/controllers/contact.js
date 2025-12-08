/**
 * Contact Form Controller
 * Handles contact form submissions from landing page
 * Creates notifications for all admins
 */

import prisma from '../config/database.js';
import { createNotification } from './notifications.js';
import { getIO } from '../config/socket.js';
import logger from '../config/logger.js';

/**
 * Submit contact form
 * Public endpoint - no authentication required
 */
export async function submitContactForm(req, res) {
  try {
    const { companyName, contactNumber, email, message } = req.body;

    // Validation
    if (!companyName || !contactNumber || !email || !message) {
      return res.status(400).json({ 
        error: 'All fields are required',
        missing: {
          companyName: !companyName,
          contactNumber: !contactNumber,
          email: !email,
          message: !message,
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone number (basic validation - at least 10 digits)
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(contactNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid contact number format' });
    }

    // Store contact submission (optional - for history/analytics)
    // For now, we'll just create notifications without storing submissions
    // You can add a ContactSubmission model later if needed

    // Get all active admins
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
      },
      select: { id: true, email: true },
    });

    if (admins.length === 0) {
      logger.warn('No active admins found to notify about contact form submission');
      // Still return success to user
      return res.status(200).json({ 
        success: true, 
        message: 'Thank you for your inquiry! We will get back to you soon.' 
      });
    }

    // Create notification for each admin
    const notificationPromises = admins.map(admin =>
      createNotification({
        userId: admin.id,
        title: `New Recruiter Inquiry: ${companyName}`,
        body: `${companyName} submitted a contact form. Contact: ${contactNumber}, Email: ${email}`,
        data: {
          type: 'recruiter_inquiry',
          companyName,
          contactNumber,
          email,
          message,
          submittedAt: new Date().toISOString(),
        },
        sendEmail: false, // Set to true if you want email notifications
      })
    );

    await Promise.all(notificationPromises);

    // Emit Socket.IO event to all admins for real-time update
    const io = getIO();
    if (io) {
      io.to('admins').emit('notification:new', {
        type: 'recruiter_inquiry',
        companyName,
        contactNumber,
        email,
        message,
      });
      logger.info(`Contact form notification sent to ${admins.length} admins via Socket.IO`);
    }

    logger.info(`Contact form submitted: ${companyName} (${email}) - Notified ${admins.length} admins`);

    res.status(200).json({
      success: true,
      message: 'Thank you for your inquiry! We will get back to you soon.',
    });
  } catch (error) {
    logger.error('Contact form submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit contact form. Please try again later.' 
    });
  }
}

