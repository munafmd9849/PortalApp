/**
 * Calendar Event Controllers
 * Handles event creation for admin, recruiter, and student roles
 */

import { authenticate } from '../middleware/auth.js';
import {
  createAdminToStudentsEvent,
  createRecruiterToStudentEvent,
  createStudentSelfEvent,
  createRecruiterSelfEvent,
} from '../services/calendarService.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Create event - Admin to Students (bulk)
 * POST /calendar/admin/create
 */
export const createAdminEventController = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { studentIds, eventData } = req.body;

    // Validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array is required' });
    }

    if (!eventData) {
      return res.status(400).json({ error: 'eventData is required' });
    }

    if (!eventData.summary || !eventData.start || !eventData.end) {
      return res.status(400).json({ 
        error: 'eventData must have summary, start, and end fields' 
      });
    }

    // Get admin profile
    const admin = await prisma.admin.findUnique({
      where: { userId: req.user.id },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin profile not found' });
    }

    // Create events
    const results = await createAdminToStudentsEvent(
      admin.id,
      studentIds,
      eventData
    );

    res.json({
      success: true,
      createdFor: results.createdFor,
      failed: results.failed,
      message: results.failed.length > 0
        ? `Event created successfully. ${results.createdFor.length} student(s) will receive email invitations. ${results.failed.length} student(s) could not be invited.`
        : `Event created successfully. ${results.createdFor.length} student(s) will receive email invitations. Students don't need to connect their calendars - they'll receive email invitations and can accept from there.`,
    });
  } catch (error) {
    logger.error('Error in createAdminEventController:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create admin events' 
    });
  }
};

/**
 * Create event - Recruiter to Student
 * POST /calendar/recruiter/create
 */
export const createRecruiterEventController = async (req, res) => {
  try {
    // Check if user is recruiter
    if (req.user.role !== 'RECRUITER') {
      return res.status(403).json({ error: 'Recruiter access required' });
    }

    const { studentId, eventData } = req.body;

    // Validation
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    if (!eventData) {
      return res.status(400).json({ error: 'eventData is required' });
    }

    if (!eventData.summary || !eventData.start || !eventData.end) {
      return res.status(400).json({ 
        error: 'eventData must have summary, start, and end fields' 
      });
    }

    // Get recruiter profile
    const recruiter = await prisma.recruiter.findUnique({
      where: { userId: req.user.id },
    });

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    // Create event
    const result = await createRecruiterToStudentEvent(
      recruiter.id,
      studentId,
      eventData
    );

    if (!result.success) {
      return res.json({
        success: false,
        failed: result.failed,
        message: result.failed?.reason || 'Failed to create event. Please check if your calendar is connected.',
      });
    }

    res.json({
      success: true,
      event: result.event,
      createdFor: result.createdFor,
      message: 'Event created successfully',
    });
  } catch (error) {
    logger.error('Error in createRecruiterEventController:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create recruiter event' 
    });
  }
};

/**
 * Create event - Student (self-event)
 * POST /calendar/student/create
 */
export const createStudentEventController = async (req, res) => {
  try {
    // Check if user is student
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Student access required' });
    }

    const { eventData } = req.body;

    // Validation
    if (!eventData) {
      return res.status(400).json({ error: 'eventData is required' });
    }

    if (!eventData.summary || !eventData.start || !eventData.end) {
      return res.status(400).json({ 
        error: 'eventData must have summary, start, and end fields' 
      });
    }

    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Create event
    const result = await createStudentSelfEvent(student.id, eventData);

    res.json({
      success: true,
      event: result.event,
      message: 'Event created successfully',
    });
  } catch (error) {
    logger.error('Error in createStudentEventController:', error);
    
    if (error.message.includes('not connected')) {
      return res.status(400).json({ 
        error: error.message,
        message: 'Please connect your Google Calendar first to create events.',
      });
    }

    res.status(500).json({ 
      error: error.message || 'Failed to create student event' 
    });
  }
};

/**
 * Create event - Recruiter (self-event)
 * POST /calendar/recruiter/self-create
 */
export const createRecruiterSelfEventController = async (req, res) => {
  try {
    // Check if user is recruiter
    if (req.user.role !== 'RECRUITER') {
      return res.status(403).json({ error: 'Recruiter access required' });
    }

    const { eventData } = req.body;

    // Validation
    if (!eventData) {
      return res.status(400).json({ error: 'eventData is required' });
    }

    if (!eventData.summary || !eventData.start || !eventData.end) {
      return res.status(400).json({ 
        error: 'eventData must have summary, start, and end fields' 
      });
    }

    // Get recruiter profile
    const recruiter = await prisma.recruiter.findUnique({
      where: { userId: req.user.id },
    });

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    // Create event
    const result = await createRecruiterSelfEvent(recruiter.id, eventData);

    res.json({
      success: true,
      event: result.event,
      message: 'Event created successfully',
    });
  } catch (error) {
    logger.error('Error in createRecruiterSelfEventController:', error);
    
    if (error.message.includes('not connected')) {
      return res.status(400).json({ 
        error: error.message,
        message: 'Please connect your Google Calendar first to create events.',
      });
    }

    res.status(500).json({ 
      error: error.message || 'Failed to create recruiter self-event' 
    });
  }
};











