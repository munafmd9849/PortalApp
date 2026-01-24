import prisma from '../config/database.js';
import { createNotification } from './notifications.js';
import { sendEndorsementRequestEmail } from '../services/emailService.js';
import crypto from 'crypto';
import logger from '../config/logger.js';

const QUERY_NOTIFICATION_TYPES = {
  question: 'question_request',
  cgpa: 'cgpa_request',
  calendar: 'calendar_request',
  backlog: 'backlog_request',
};

function normalizeType(type = 'question') {
  const normalized = (type || 'question').toLowerCase();
  if (['question', 'cgpa', 'calendar', 'endorsement', 'backlog'].includes(normalized)) {
    return normalized;
  }
  return 'question';
}

function buildReferenceId() {
  return `SQ-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0')}`;
}

function parseMetadata(metadata) {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch (error) {
    console.warn('Failed to parse student query metadata:', error);
    return {};
  }
}

function serializeMetadata(meta = {}) {
  try {
    return JSON.stringify(meta);
  } catch (error) {
    console.warn('Failed to stringify student query metadata:', error);
    return '{}';
  }
}

function formatQuery(query) {
  const metadata = parseMetadata(query.metadata);
  return {
    ...query,
    metadata,
    referenceId: metadata.referenceId,
  };
}

async function notifyAdminsAboutQuery(query, metadata, studentProfile) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    console.log(`[Query Notification] Found ${admins.length} active admin(s) to notify`);

    if (!admins.length) {
      console.warn('[Query Notification] No active admins found. Notification not sent.');
      return;
    }

    const notificationType =
      QUERY_NOTIFICATION_TYPES[query.type] || QUERY_NOTIFICATION_TYPES.question;

    const title = `New Student Query: ${query.subject}`;
    const body = `${studentProfile.fullName || 'Student'} submitted a ${query.type.toUpperCase()} query.`;

    const data = {
      queryId: query.id,
      referenceId: metadata.referenceId,
      queryType: query.type,
      studentId: query.studentId,
      studentName: studentProfile.fullName || studentProfile.displayName || '',
      enrollmentId: studentProfile.enrollmentId,
      center: studentProfile.center,
      school: studentProfile.school,
      batch: studentProfile.batch,
      message: query.message,
      jobId: metadata.jobId || null, // Include jobId for question type queries
      type: notificationType, // Store type in data for frontend to extract
      // Include CGPA and backlog values for CGPA/backlog update queries
      cgpa: metadata.cgpa || null,
      backlogs: metadata.backlogs || null,
      proofDocumentUrl: metadata.proofDocumentUrl || null, // Proof document URL if uploaded by student
    };

    console.log(`[Query Notification] Creating notifications for query ${query.id}, type: ${notificationType}`);

    const notificationResults = await Promise.allSettled(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          title,
          body,
          data,
        })
      )
    );

    // Log results
    const successful = notificationResults.filter(r => r.status === 'fulfilled').length;
    const failed = notificationResults.filter(r => r.status === 'rejected').length;
    
    console.log(`[Query Notification] Created ${successful} notification(s), ${failed} failed`);
    
    if (failed > 0) {
      notificationResults
        .filter(r => r.status === 'rejected')
        .forEach((result, index) => {
          console.error(`[Query Notification] Failed to notify admin ${admins[index].id}:`, result.reason);
        });
    }
  } catch (error) {
    console.error('[Query Notification] Error in notifyAdminsAboutQuery:', error);
    // Don't throw - we don't want to fail query creation if notification fails
  }
}

export async function createStudentQuery(req, res) {
  try {
    const userId = req.userId;
    const userRole = req.user?.role || req.userRole;
    // Support both students and recruiters
    const studentId = userId; // For recruiters, we still use userId (field name is misleading but works)
    const {
      subject,
      message,
      type,
      cgpa,
      backlogs,
      startDate,
      endDate,
      timeSlot,
      reason,
      teacherEmail,
      endorsementMessage,
      jobId, // New field for job selection in question queries
    } = req.body;

    const normalizedType = normalizeType(type);
    const referenceId = buildReferenceId();

    // Validate CGPA if provided (for CGPA update queries)
    let validatedCgpa = null;
    if (normalizedType === 'cgpa' && cgpa) {
      const cgpaStr = String(cgpa).trim();
      // Validate CGPA format: 0.00 to 10.00 with EXACTLY 2 decimal places
      const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
      
      if (!cgpaRegex.test(cgpaStr)) {
        // Check if user entered value without 2 decimals
        if (/^\d+$/.test(cgpaStr)) {
          return res.status(400).json({ 
            error: 'Enter CGPA with 2 decimals (e.g., 9.00). Values like 9 or 9.0 are not accepted.' 
          });
        } else if (/^\d+\.\d?$/.test(cgpaStr)) {
          return res.status(400).json({ 
            error: 'Enter CGPA with 2 decimals (e.g., 9.00). Values like 9.0 are not accepted.' 
          });
        } else {
          return res.status(400).json({ 
            error: 'Invalid CGPA format. CGPA must be between 0.00 and 10.00 with exactly 2 decimal places (e.g., 9.00, 8.75)' 
          });
        }
      }
      
      // Validate range without using parseFloat to avoid rounding errors
      const parts = cgpaStr.split('.');
      const integerPart = parseInt(parts[0], 10);
      const decimalPart = parseInt(parts[1], 10);
      
      if (isNaN(integerPart) || isNaN(decimalPart)) {
        return res.status(400).json({ 
          error: 'Invalid CGPA format' 
        });
      }
      
      if (integerPart > 10 || (integerPart === 10 && decimalPart > 0)) {
        return res.status(400).json({ 
          error: 'CGPA must be between 0.00 and 10.00' 
        });
      }
      
      if (integerPart < 0) {
        return res.status(400).json({ 
          error: 'CGPA must be between 0.00 and 10.00' 
        });
      }
      
      // Store as string to preserve exact decimal value
      validatedCgpa = cgpaStr;
    }

    // Validate backlogs if provided (for backlog update queries)
    let validatedBacklogs = null;
    if (normalizedType === 'backlog' && backlogs !== undefined && backlogs !== null) {
      const backlogsStr = String(backlogs).trim();
      
      // Validate backlogs format: should be a non-negative integer or "0"
      if (backlogsStr === '' || backlogsStr === 'null' || backlogsStr === 'undefined') {
        return res.status(400).json({ 
          error: 'Backlogs count is required for backlog update queries' 
        });
      }

      // Allow formats: "0", "1", "2", "3+", etc.
      const backlogsRegex = /^(\d+|\d+\+)$/;
      if (!backlogsRegex.test(backlogsStr)) {
        return res.status(400).json({ 
          error: 'Invalid backlogs format. Backlogs must be a non-negative integer (e.g., 0, 1, 2, 3+)' 
        });
      }

      // Extract numeric value (remove + if present)
      const numericValue = parseInt(backlogsStr.replace('+', ''), 10);
      if (isNaN(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          error: 'Backlogs must be a non-negative integer' 
        });
      }

      // Store as string to preserve format (e.g., "3+")
      validatedBacklogs = backlogsStr;
    }

    // Get proof document URL if uploaded (from multer middleware)
    let proofDocumentUrl = null;
    if (req.file && req.file.url) {
      proofDocumentUrl = req.file.url;
      console.log('[Query Creation] Proof document uploaded:', proofDocumentUrl);
    }

    const metadata = {
      referenceId,
      cgpa: validatedCgpa,
      backlogs: validatedBacklogs,
      startDate: startDate || null,
      endDate: endDate || null,
      timeSlot: timeSlot || null,
      reason: reason || null,
      teacherEmail: teacherEmail || null,
      endorsementMessage: endorsementMessage || null,
      jobId: jobId || null, // Store jobId for question type queries
      proofDocumentUrl: proofDocumentUrl || null, // Store proof document URL if uploaded
    };

    // Get profile based on role
    let studentProfile = null;
    if (userRole === 'STUDENT' || userRole === 'student') {
      studentProfile = await prisma.student.findUnique({
        where: { userId },
        select: {
          fullName: true,
          enrollmentId: true,
          center: true,
          school: true,
          batch: true,
        },
      });
    } else if (userRole === 'RECRUITER' || userRole === 'recruiter') {
      // For recruiters, get recruiter profile
      const recruiterProfile = await prisma.recruiter.findFirst({
        where: { userId },
        select: {
          company: { select: { name: true } },
        },
      });
      // Create a compatible profile object
      studentProfile = recruiterProfile ? {
        fullName: null,
        enrollmentId: null,
        center: null,
        school: null,
        batch: null,
        companyName: recruiterProfile.company?.name,
      } : null;
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: studentId },
      select: { email: true, displayName: true },
    });

    const profileForNotification =
      studentProfile || {
        fullName:
          userProfile?.displayName || userProfile?.email || 'Student',
        enrollmentId: null,
        center: null,
        school: null,
        batch: null,
      };

    // For endorsement type, use a default message if none provided
    const queryMessage = normalizedType === 'endorsement' && !message?.trim()
      ? `Endorsement request sent to ${teacherEmail || 'teacher'}.`
      : message || '';

    const query = await prisma.studentQuery.create({
      data: {
        studentId: userId, // Works for both students and recruiters
        subject,
        message: queryMessage,
        type: normalizedType,
        metadata: serializeMetadata({
          ...metadata,
          studentEmail: userProfile?.email,
          studentName: studentProfile?.fullName || userProfile?.displayName,
        }),
      },
      select: {
        id: true,
        studentId: true,
        subject: true,
        message: true,
        status: true,
        type: true,
        metadata: true,
        response: true,
        respondedAt: true,
        respondedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`[Query Creation] Query created successfully: ${query.id}, userId: ${userId}, role: ${userRole}`);
    
    // Handle endorsement type - create endorsement record and send email
    if (normalizedType === 'endorsement' && teacherEmail) {
      try {
        // Generate unique token for endorsement link
        const token = crypto.randomBytes(32).toString('hex');
        
        // Calculate expiration date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        // Get profile for email (students only for endorsements)
        let studentProfileData = null;
        if (userRole === 'STUDENT' || userRole === 'student') {
          studentProfileData = await prisma.student.findUnique({
            where: { userId },
            select: { fullName: true },
          });
        }
        
        const studentName = studentProfileData?.fullName || userProfile?.displayName || userProfile?.email || 'Student';
        
        logger.info(`[Endorsement] Creating endorsement for student ${studentName}, sending to ${teacherEmail.trim()}`);
        
        // Create endorsement record
        const endorsement = await prisma.endorsement.create({
          data: {
            studentId: studentId,
            queryId: query.id,
            teacherEmail: teacherEmail.trim(),
            token: token,
            status: 'PENDING',
            studentMessage: endorsementMessage || null,
            expiresAt: expiresAt,
          },
        });
        
        logger.info(`[Endorsement] Endorsement record created: ${endorsement.id}`);
        
        // Send endorsement request email to teacher
        const endorsementLink = `/endorsement/${token}`;
        logger.info(`[Endorsement] Attempting to send email to ${teacherEmail.trim()} with link: ${endorsementLink}`);
        
        const emailResult = await sendEndorsementRequestEmail(
          teacherEmail.trim(),
          studentName,
          endorsementLink,
          endorsementMessage || null
        );
        
        logger.info(`[Endorsement] Email sent successfully to ${teacherEmail.trim()}. MessageId: ${emailResult.messageId || 'N/A'}`);
        logger.info(`[Endorsement] Created endorsement ${endorsement.id} and sent email to ${teacherEmail.trim()}`);
      } catch (endorsementError) {
        logger.error('[Endorsement] Error creating endorsement or sending email:', endorsementError);
        logger.error('[Endorsement] Error details:', {
          message: endorsementError.message,
          stack: endorsementError.stack,
          code: endorsementError.code,
          response: endorsementError.response,
        });
        // Don't fail the query creation if endorsement setup fails
        // The query is already created, we just log the error
        // But we should still inform the user that email might not have been sent
      }
    }
    
    // Notify admins about the new query (skip for endorsement as it's handled separately)
    if (normalizedType !== 'endorsement') {
      await notifyAdminsAboutQuery(query, metadata, {
        ...profileForNotification,
        displayName: userProfile?.displayName,
      });
    }

    res.status(201).json({
      query: formatQuery(query),
      referenceId,
    });
  } catch (error) {
    console.error('createStudentQuery error:', error);
    res
      .status(500)
      .json({ error: 'Failed to submit query', details: error.message });
  }
}

export async function getStudentQueries(req, res) {
  try {
    const userId = req.userId;
    // Support both students and recruiters
    const studentId = userId;

    const queries = await prisma.studentQuery.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        studentId: true,
        subject: true,
        message: true,
        status: true,
        type: true,
        metadata: true,
        response: true,
        respondedAt: true,
        respondedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(queries.map(formatQuery));
  } catch (error) {
    console.error('getStudentQueries error:', error);
    res
      .status(500)
      .json({ error: 'Failed to load queries', details: error.message });
  }
}

export async function getAllQueries(req, res) {
  try {
    const queries = await prisma.studentQuery.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
            student: {
              select: {
                fullName: true,
                enrollmentId: true,
                center: true,
                school: true,
                batch: true,
              },
            },
          },
        },
      },
    });

    const formatted = queries.map((query) => ({
      ...formatQuery(query),
      student: {
        email: query.user?.email,
        displayName: query.user?.displayName,
        fullName: query.user?.student?.fullName,
        enrollmentId: query.user?.student?.enrollmentId,
        center: query.user?.student?.center,
        school: query.user?.student?.school,
        batch: query.user?.student?.batch,
      },
    }));

    res.json(formatted);
  } catch (error) {
    console.error('getAllQueries error:', error);
    res.status(500).json({
      error: 'Failed to load student queries',
      details: error.message,
    });
  }
}

export async function respondToStudentQuery(req, res) {
  try {
    const { queryId } = req.params;
    const { response: adminResponse, status } = req.body;
    const adminId = req.userId;

    const query = await prisma.studentQuery.findUnique({
      where: { id: queryId },
    });

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    const queryMetadata = parseMetadata(query.metadata);
    const finalStatus = status || 'RESOLVED';

    // If query is resolved and it's a CGPA or backlog update query, update student profile
    if (finalStatus === 'RESOLVED' || finalStatus === 'resolved') {
      if (query.type === 'cgpa' && queryMetadata.cgpa) {
        // Update student CGPA
        const student = await prisma.student.findUnique({
          where: { userId: query.studentId },
        });

        if (student) {
          await prisma.student.update({
            where: { id: student.id },
            data: { cgpa: queryMetadata.cgpa },
          });
          logger.info(`Updated CGPA for student ${student.id} to ${queryMetadata.cgpa} via query ${queryId}`);
        }
      } else if (query.type === 'backlog' && queryMetadata.backlogs !== undefined && queryMetadata.backlogs !== null) {
        // Update student backlogs
        const student = await prisma.student.findUnique({
          where: { userId: query.studentId },
        });

        if (student) {
          await prisma.student.update({
            where: { id: student.id },
            data: { backlogs: String(queryMetadata.backlogs) },
          });
          logger.info(`Updated backlogs for student ${student.id} to ${queryMetadata.backlogs} via query ${queryId}`);
        }
      }
    }

    const updatedQuery = await prisma.studentQuery.update({
      where: { id: queryId },
      data: {
        response: adminResponse,
        status: finalStatus,
        respondedBy: adminId,
        respondedAt: new Date(),
      },
      select: {
        id: true,
        studentId: true,
        subject: true,
        message: true,
        status: true,
        type: true,
        metadata: true,
        response: true,
        respondedAt: true,
        respondedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createNotification({
      userId: query.studentId,
      title: 'Query Updated',
      body: 'An admin responded to your query.',
      data: {
        queryId: updatedQuery.id,
        type: 'student_query',
      },
    });

    res.json(formatQuery(updatedQuery));
  } catch (error) {
    console.error('respondToStudentQuery error:', error);
    res.status(500).json({
      error: 'Failed to update query',
      details: error.message,
    });
  }
}

