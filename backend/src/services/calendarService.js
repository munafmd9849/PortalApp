/**
 * Calendar Service
 * Event creation services for admin, recruiter, and student roles
 */

import prisma from '../config/database.js';
import { getCalendarClient, createCalendarEvent } from '../utils/googleCalendar.js';
import logger from '../config/logger.js';

/**
 * Create event for admin to send to multiple students
 * Creates ONE event in admin's calendar with students as attendees
 * Students don't need to connect their calendars - they'll receive email invitations
 * @param {String} adminId - Admin user ID
 * @param {Array<String>} studentIds - Array of student IDs
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} - { createdFor: [...], failed: [...] }
 */
export async function createAdminToStudentsEvent(adminId, studentIds, eventData) {
  const results = {
    createdFor: [],
    failed: [],
  };

  // Validate event data
  if (!eventData.summary || !eventData.start || !eventData.end) {
    throw new Error('Event must have summary, start, and end times');
  }

  // Get admin profile to check calendar connection
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      userId: true,
    },
  });

  if (!admin) {
    throw new Error('Admin profile not found');
  }

  // Get admin's calendar token
  const adminToken = await prisma.googleCalendarToken.findUnique({
    where: { userId: admin.userId },
  });

  if (!adminToken) {
    throw new Error('Admin has not connected Google Calendar. Please connect your calendar first.');
  }

  // Get all students (we don't need their calendar connection status anymore)
  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  // Get student emails for attendees
  const studentEmails = students.map(s => s.email);

  try {
    // Get authenticated calendar client for admin
    const { calendar, updatedTokens } = await getCalendarClient({
      accessToken: adminToken.accessToken,
      refreshToken: adminToken.refreshToken,
      expiryDate: adminToken.expiryDate,
    });

    // Update admin tokens if refreshed
    if (updatedTokens) {
      await prisma.googleCalendarToken.update({
        where: { userId: admin.userId },
        data: {
          accessToken: updatedTokens.accessToken,
          refreshToken: updatedTokens.refreshToken,
          expiryDate: updatedTokens.expiryDate,
        },
      });
    }

    // Create ONE event in admin's calendar with all students as attendees
    // Google Calendar will automatically send email invitations to all attendees
    const event = await createCalendarEvent(
      calendar,
      eventData,
      studentEmails, // Add all students as attendees
      eventData.meetLink || false
    );

    // All students will receive email invitations
    results.createdFor = students.map(student => ({
      studentId: student.id,
      email: student.email,
      name: student.fullName,
      eventId: event.id,
      htmlLink: event.htmlLink,
      invited: true, // They'll receive email invitation
    }));

    logger.info(`Created calendar event in admin ${adminId}'s calendar with ${students.length} student attendees`);
  } catch (error) {
    logger.error(`Failed to create event for admin ${adminId}:`, error);
    // If event creation fails, mark all students as failed
    results.failed = students.map(student => ({
      studentId: student.id,
      email: student.email,
      name: student.fullName,
      reason: error.message || 'Failed to create event',
    }));
  }

  return results;
}

/**
 * Create event for recruiter to send to a student
 * @param {String} recruiterId - Recruiter user ID
 * @param {String} studentId - Student ID
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} - { success, event, failed }
 */
export async function createRecruiterToStudentEvent(recruiterId, studentId, eventData) {
  // Validate event data
  if (!eventData.summary || !eventData.start || !eventData.end) {
    throw new Error('Event must have summary, start, and end times');
  }

  // Get student info (we don't need their calendar connection status)
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Get recruiter with calendar connection
  const recruiter = await prisma.recruiter.findUnique({
    where: { id: recruiterId },
    select: {
      userId: true,
      googleCalendarConnected: true,
      googleCalendarAccessToken: true,
      googleCalendarRefreshToken: true,
      googleCalendarExpiryDate: true,
    },
    include: {
      user: {
        select: { email: true, displayName: true },
      },
    },
  });

  if (!recruiter) {
    throw new Error('Recruiter not found');
  }

  if (!recruiter.googleCalendarConnected || !recruiter.googleCalendarRefreshToken) {
    return {
      success: false,
      failed: {
        studentId: student.id,
        email: student.email,
        name: student.fullName,
        reason: 'Recruiter has not connected Google Calendar. Please connect your calendar first.',
      },
    };
  }

  try {
    // Get authenticated calendar client for recruiter
    const { calendar, updatedTokens } = await getCalendarClient({
      accessToken: recruiter.googleCalendarAccessToken,
      refreshToken: recruiter.googleCalendarRefreshToken,
      expiryDate: recruiter.googleCalendarExpiryDate,
    });

    // Update recruiter tokens if refreshed
    if (updatedTokens) {
      await prisma.recruiter.update({
        where: { id: recruiterId },
        data: {
          googleCalendarAccessToken: updatedTokens.accessToken,
          googleCalendarRefreshToken: updatedTokens.refreshToken,
          googleCalendarExpiryDate: updatedTokens.expiryDate,
        },
      });
    }

    // Create event in recruiter's calendar with student as attendee
    // Google Calendar will automatically send email invitation to student
    const event = await createCalendarEvent(
      calendar,
      eventData,
      [student.email], // Add student as attendee
      eventData.meetLink || false
    );

    logger.info(`Created calendar event in recruiter ${recruiterId}'s calendar with student ${student.id} as attendee`);

    return {
      success: true,
      event: {
        id: event.id,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
      },
      createdFor: {
        studentId: student.id,
        email: student.email,
        name: student.fullName,
      },
    };
  } catch (error) {
    logger.error(`Failed to create event for student ${student.id}:`, error);
    return {
      success: false,
      failed: {
        studentId: student.id,
        email: student.email,
        name: student.fullName,
        reason: error.message || 'Failed to create event',
      },
    };
  }
}

/**
 * Create event for student (self-event)
 * @param {String} studentId - Student ID
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} - { success, event }
 */
export async function createStudentSelfEvent(studentId, eventData) {
  // Validate event data
  if (!eventData.summary || !eventData.start || !eventData.end) {
    throw new Error('Event must have summary, start, and end times');
  }

  // Get student with calendar connection
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      email: true,
      googleCalendarConnected: true,
      googleCalendarAccessToken: true,
      googleCalendarRefreshToken: true,
      googleCalendarExpiryDate: true,
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  if (!student.googleCalendarConnected || !student.googleCalendarRefreshToken) {
    throw new Error('Google Calendar not connected. Please connect your calendar first.');
  }

  try {
    // Get authenticated calendar client
    const { calendar, updatedTokens } = await getCalendarClient({
      accessToken: student.googleCalendarAccessToken,
      refreshToken: student.googleCalendarRefreshToken,
      expiryDate: student.googleCalendarExpiryDate,
    });

    // Update tokens if refreshed
    if (updatedTokens) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          googleCalendarAccessToken: updatedTokens.accessToken,
          googleCalendarRefreshToken: updatedTokens.refreshToken,
          googleCalendarExpiryDate: updatedTokens.expiryDate,
        },
      });
    }

    // Create event (no additional attendees for self-event)
    const event = await createCalendarEvent(
      calendar,
      eventData,
      [],
      eventData.meetLink || false
    );

    logger.info(`Created self-event for student ${student.id}`);

    return {
      success: true,
      event: {
        id: event.id,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
      },
    };
  } catch (error) {
    logger.error(`Failed to create self-event for student ${student.id}:`, error);
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

/**
 * Create event for recruiter (self-event)
 * @param {String} recruiterId - Recruiter ID
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} - { success, event }
 */
export async function createRecruiterSelfEvent(recruiterId, eventData) {
  // Validate event data
  if (!eventData.summary || !eventData.start || !eventData.end) {
    throw new Error('Event must have summary, start, and end times');
  }

  // Get recruiter with calendar connection
  const recruiter = await prisma.recruiter.findUnique({
    where: { id: recruiterId },
    include: {
      user: {
        select: {
          email: true,
          googleCalendarConnected: true,
          googleCalendarAccessToken: true,
          googleCalendarRefreshToken: true,
          googleCalendarExpiryDate: true,
        },
      },
    },
  });

  if (!recruiter) {
    throw new Error('Recruiter not found');
  }

  // Recruiters don't have direct calendar fields, check via User if needed
  // For now, we'll store in recruiter model
  if (!recruiter.googleCalendarConnected || !recruiter.googleCalendarRefreshToken) {
    throw new Error('Google Calendar not connected. Please connect your calendar first.');
  }

  try {
    // Get authenticated calendar client
    const { calendar, updatedTokens } = await getCalendarClient({
      accessToken: recruiter.googleCalendarAccessToken,
      refreshToken: recruiter.googleCalendarRefreshToken,
      expiryDate: recruiter.googleCalendarExpiryDate,
    });

    // Update tokens if refreshed
    if (updatedTokens) {
      await prisma.recruiter.update({
        where: { id: recruiter.id },
        data: {
          googleCalendarAccessToken: updatedTokens.accessToken,
          googleCalendarRefreshToken: updatedTokens.refreshToken,
          googleCalendarExpiryDate: updatedTokens.expiryDate,
        },
      });
    }

    // Create event
    const event = await createCalendarEvent(
      calendar,
      eventData,
      [],
      eventData.meetLink || false
    );

    logger.info(`Created self-event for recruiter ${recruiter.id}`);

    return {
      success: true,
      event: {
        id: event.id,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
      },
    };
  } catch (error) {
    logger.error(`Failed to create self-event for recruiter ${recruiter.id}:`, error);
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}











