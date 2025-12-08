import prisma from '../config/database.js';
import { createNotification } from './notifications.js';

const QUERY_NOTIFICATION_TYPES = {
  question: 'question_request',
  cgpa: 'cgpa_request',
  calendar: 'calendar_request',
};

function normalizeType(type = 'question') {
  const normalized = (type || 'question').toLowerCase();
  if (['question', 'cgpa', 'calendar'].includes(normalized)) {
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
      type: notificationType, // Store type in data for frontend to extract
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
    const studentId = req.userId;
    const {
      subject,
      message,
      type,
      cgpa,
      startDate,
      endDate,
      timeSlot,
      reason,
    } = req.body;

    const normalizedType = normalizeType(type);
    const referenceId = buildReferenceId();

    const metadata = {
      referenceId,
      cgpa: cgpa ?? null,
      startDate: startDate || null,
      endDate: endDate || null,
      timeSlot: timeSlot || null,
      reason: reason || null,
    };

    const studentProfile = await prisma.student.findUnique({
      where: { userId: studentId },
      select: {
        fullName: true,
        enrollmentId: true,
        center: true,
        school: true,
        batch: true,
      },
    });

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

    const query = await prisma.studentQuery.create({
      data: {
        studentId,
        subject,
        message,
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

    console.log(`[Query Creation] Query created successfully: ${query.id}, studentId: ${studentId}`);
    
    // Notify admins about the new query
    await notifyAdminsAboutQuery(query, metadata, {
      ...profileForNotification,
      displayName: userProfile?.displayName,
    });

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
    const studentId = req.userId;

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

    const updatedQuery = await prisma.studentQuery.update({
      where: { id: queryId },
      data: {
        response: adminResponse,
        status: status || 'RESOLVED',
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

