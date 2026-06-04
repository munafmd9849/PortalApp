import prisma from '../config/database.js';
import { sendBulkAssessmentNotifications } from '../services/emailService.js';
import { mcqAnswersMatch } from '../utils/mcqGrading.js';
import {
  findStudentsForBatchIds,
  resolveStudentAssignmentScope,
} from '../utils/studentAssignmentScope.js';
import { gradeCodingAnswer } from '../coding-engine/index.js';
import {
  serializeTestCasesForStorage,
  serializeExamplesForStorage,
} from '../coding-engine/testCaseStorage.js';
import {
  normalizeStoredScore,
  pointsToPercent,
  totalQuestionPoints,
  withNormalizedScore,
} from '../utils/assessmentScoring.js';
import {
  getAssessmentEntryStatus,
  mergeJoinWindowIntoConfig,
  parseAssessmentDateInput,
} from '../utils/assessmentEntryWindow.js';
import multer from 'multer';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { signedScreenshotUrl } from '../utils/proctoringScreenshots.js';

/**
 * ASSESSMENT ENGINE CONTROLLER
 * Handles Mock Tests, Mock Interviews, and Proctoring Sessions
 */

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB (client should compress)
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Invalid screenshot mime type'), ok);
  },
});

function computeRiskLevel(count) {
  if (count >= 7) return 'HIGH';
  if (count >= 3) return 'MEDIUM';
  return 'LOW';
}

function emitProctoringLiveUpdate(assessmentId, payload) {
  if (!assessmentId) return;
  import('../config/socket.js')
    .then(({ getIO }) => {
      getIO().to(`proctoring:assessment:${assessmentId}`).emit('proctoring:update', payload);
    })
    .catch(() => {});
}

// --- ADMIN MODULES ---

// Create Assessment
export async function createAssessment(req, res) {
  try {
    const {
      title,
      description,
      type,
      difficulty,
      duration,
      startTime,
      endTime,
      instructions,
      config,
      questions,
      targetBatchIds,
      targetStudentIds,
      scheduledAtMap,
      joinOpensMinutesBeforeStart,
      joinClosesMinutesAfterStart,
    } = req.body;
    const mergedConfig = mergeJoinWindowIntoConfig(config, {
      opensMinutesBeforeStart: joinOpensMinutesBeforeStart,
      closesMinutesAfterStart: joinClosesMinutesAfterStart,
    });

    // Prepare assignments data
    const batchAssignments = (targetBatchIds || []).map((batchId) => ({ batchId }));

    // Resolve studentIds from studentUserIds (passed from frontend)
    let studentAssignments = [];
    if (targetStudentIds && targetStudentIds.length > 0) {
      const targetStudents = await prisma.student.findMany({
        where: { userId: { in: targetStudentIds } },
        select: { id: true, userId: true },
      });

      studentAssignments = targetStudents.map((s) => ({
        studentId: s.id,
        scheduledAt: scheduledAtMap?.[s.userId]
          ? new Date(scheduledAtMap[s.userId])
          : null,
      }));
    }

    // Also assign each student in targeted batches (covers profiles with batch string only)
    if (targetBatchIds?.length) {
      const batchStudents = await findStudentsForBatchIds(targetBatchIds);
      const seen = new Set(studentAssignments.map((a) => a.studentId));
      for (const s of batchStudents) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        studentAssignments.push({
          studentId: s.id,
          scheduledAt: scheduledAtMap?.[s.userId]
            ? new Date(scheduledAtMap[s.userId])
            : null,
        });
      }
    }

    const assessment = await prisma.assessment.create({
      data: {
        title,
        description,
        type,
        difficulty: difficulty || 'MEDIUM',
        duration: parseInt(duration),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        instructions,
        config: JSON.stringify(mergedConfig),
        questions: {
          create: (questions || []).map((q, index) => ({
            questionText: q.text,
            description: q.description,
            type: q.type,
            options: JSON.stringify(q.options || []),
            correctAnswer: q.correctAnswer,
            points: parseInt(q.points) || 1,
            difficulty: q.difficulty || 'MEDIUM',
            starterCode: q.starterCode || null,
            constraints: q.constraints || null,
            examples: serializeExamplesForStorage(q.examples || []),
            testCases: serializeTestCasesForStorage(q.testCases || []),
            order: index
          }))
        },
        assignments: {
          create: [...batchAssignments, ...studentAssignments]
        }
      }
    });

    // --- NOTIFICATION LOGIC ---
    try {
      const { getIO } = await import('../config/socket.js');
      const io = getIO();
      
      const batchStudents = targetBatchIds?.length
        ? await findStudentsForBatchIds(targetBatchIds)
        : [];
      const individualStudents =
        targetStudentIds?.length
          ? await prisma.student.findMany({
              where: { userId: { in: targetStudentIds } },
              include: { user: { select: { email: true } } },
            })
          : [];
      const byUserId = new Map();
      [...batchStudents, ...individualStudents].forEach((s) => {
        byUserId.set(s.userId, s);
      });
      const students = [...byUserId.values()];

      // Create persistent notifications in DB
      await prisma.notification.createMany({
        data: students.map(s => ({
          userId: s.userId,
          title: 'New Assessment Assigned',
          body: `You have been assigned a new ${type.replace('_', ' ').toLowerCase()}: ${title}`,
          type: 'ASSESSMENT',
          link: `/student?tab=assessments`
        }))
      });

      // Emit real-time socket events
      students.forEach(s => {
        io.to(`user:${s.userId}`).emit('notification', {
          title: 'New Assessment',
          message: `A new ${type.replace('_', ' ').toLowerCase()} has been assigned to you.`,
          type: 'ASSESSMENT'
        });
      });

      // Dispatch Email Notifications
      const studentEmailData = students.map(s => ({
        ...s,
        email: s.user?.email,
        fullName: s.fullName || 'Student'
      }));
      
      sendBulkAssessmentNotifications(studentEmailData, assessment).catch(err => 
        console.error('Email notification background error:', err)
      );

    } catch (notificationError) {
      console.error('Multi-channel notification failed:', notificationError);
    }

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create Assessment Error:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
}

// Get All Assessments (Admin)
export async function getAssessments(req, res) {
  try {
    console.log('[DEBUG] Fetching all assessments...');
    const assessments = await prisma.assessment.findMany({
      include: {
        sessions: { select: { id: true, studentId: true, status: true, score: true } },
        questions: { select: { id: true } },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
                user: { select: { displayName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[DEBUG] Found ${assessments.length} assessments`);
    res.json(assessments);
  } catch (error) {
    console.error('[ERROR] getAssessments failed:', error);
    res.status(500).json({ error: 'Failed to fetch assessments', details: error.message });
  }
}

// Get Assessment Details
export async function getAssessmentDetails(req, res) {
  try {
    const { id } = req.params;
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { questions: true }
    });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
}

export async function updateAssessment(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      duration,
      startTime,
      endTime,
      joinOpensMinutesBeforeStart,
      joinClosesMinutesAfterStart,
    } = req.body;
    const existing = await prisma.assessment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Assessment not found' });

    const parsedStart = parseAssessmentDateInput(startTime);
    const parsedEnd = parseAssessmentDateInput(endTime);
    if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const joinTouched =
      joinOpensMinutesBeforeStart !== undefined || joinClosesMinutesAfterStart !== undefined;
    const nextConfig = joinTouched
      ? mergeJoinWindowIntoConfig(existing.config, {
          opensMinutesBeforeStart: joinOpensMinutesBeforeStart,
          closesMinutesAfterStart: joinClosesMinutesAfterStart,
        })
      : undefined;

    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        ...(title !== undefined && title !== '' && { title }),
        ...(duration !== undefined && duration !== '' && { duration: parseInt(duration, 10) }),
        ...(startTime !== undefined && { startTime: parsedStart }),
        ...(endTime !== undefined && { endTime: parsedEnd }),
        ...(nextConfig && { config: JSON.stringify(nextConfig) }),
      },
    });

    res.json({ message: 'Assessment updated successfully', assessment });
  } catch (error) {
    console.error(`[ERROR] Failed to update assessment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
}

export async function deleteAssessment(req, res) {
  try {
    const { id } = req.params;

    await prisma.assessment.delete({
      where: { id }
    });

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error(`[ERROR] Failed to delete assessment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
}

// --- STUDENT MODULES ---

// Get Assigned Assessments for Student
export async function getStudentAssessments(req, res) {
  try {
    const userId = req.userId || req.user?.id;
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found. Please complete your onboarding.',
      });
    }

    const { assignmentMatch } = await resolveStudentAssignmentScope(student);

    const assessments = await prisma.assessment.findMany({
      where: {
        assignments: {
          some: { OR: assignmentMatch },
        },
      },
      include: {
        sessions: {
          where: { studentId: student.id },
        },
        assignments: {
          where: { OR: assignmentMatch },
          select: { scheduledAt: true, studentId: true, batchId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(assessments);
  } catch (error) {
    console.error('getStudentAssessments error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned assessments' });
  }
}

// Start Assessment Session
export async function startSession(req, res) {
  try {
    const { assessmentId } = req.params;
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, startTime: true, endTime: true, title: true, config: true },
    });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const entry = getAssessmentEntryStatus(assessment);
    if (entry.status === 'TOO_EARLY') {
      return res.status(403).json({
        error: 'Assessment entry has not opened yet',
        entryOpensAt: entry.entryOpensAt,
        entryClosesAt: entry.entryClosesAt,
        joinWindow: entry.joinWindow,
      });
    }
    if (entry.status === 'TOO_LATE') {
      return res.status(403).json({
        error: 'Assessment entry window has closed',
        entryClosesAt: entry.entryClosesAt,
        joinWindow: entry.joinWindow,
      });
    }

    const student = await prisma.student.findUnique({ 
      where: { userId: req.userId || req.user.id } 
    });

    if (!student) {
      console.error(`❌ startSession failed: Student profile not found for userId ${req.userId || req.user.id}`);
      return res.status(404).json({ error: 'Student profile not found. Please complete your onboarding.' });
    }

    // SECURITY: one active attempt per student (across assessments)
    const otherActive = await prisma.assessmentSession.findFirst({
      where: {
        studentId: student.id,
        status: 'IN_PROGRESS',
        assessmentId: { not: assessmentId },
      },
      select: { id: true, assessmentId: true, startTime: true },
    });
    if (otherActive) {
      return res.status(409).json({
        error: 'Another assessment attempt is already active',
        activeSessionId: otherActive.id,
        activeAssessmentId: otherActive.assessmentId,
      });
    }

    let session = await prisma.assessmentSession.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId: student.id } }
    });

    if (session) {
      if (session.status !== 'IN_PROGRESS') {
        return res.status(403).json({ error: 'Assessment already completed' });
      }
      return res.json(session);
    }

    try {
      session = await prisma.assessmentSession.create({
        data: {
          assessmentId,
          studentId: student.id,
          status: 'IN_PROGRESS'
        }
      });
    } catch (createError) {
      // Handle React 18 Strict Mode double-mounting race condition
      if (createError.code === 'P2002') {
        session = await prisma.assessmentSession.findUnique({
          where: { assessmentId_studentId: { assessmentId, studentId: student.id } }
        });
      } else {
        throw createError;
      }
    }

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
  }
}

// Submit Violation
export async function logViolation(req, res) {
  try {
    const { sessionId } = req.params;
    const { type, details, meta } = req.body || {};

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { student: { select: { userId: true, fullName: true } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.student?.userId !== (req.userId || req.user?.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.assessmentViolation.create({
      data: {
        sessionId,
        type,
        details: details || null,
        meta: meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : null,
      }
    });

    // Increment violation count in session
    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        violationsCount: { increment: 1 }
      }
    });

    // Risk engine (server-side single source of truth)
    await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { riskLevel: computeRiskLevel(updated.violationsCount) },
    });

    const latest = await prisma.assessmentViolation.findFirst({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      select: { id: true, type: true, timestamp: true },
    });

    emitProctoringLiveUpdate(session.assessmentId, {
      assessmentId: session.assessmentId,
      kind: 'violation',
      sessionId,
      violation: latest,
      violationsCount: updated.violationsCount,
    });

    res.json({ success: true, violation: latest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log violation' });
  }
}

export async function uploadScreenshot(req, res) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { userId: true, fullName: true } },
        assessment: { select: { id: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.student?.userId !== (req.userId || req.user?.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    screenshotUpload.single('screenshot')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      if (!req.file?.buffer) return res.status(400).json({ error: 'No screenshot provided' });

      const flags = (() => {
        try {
          return req.body?.flags ? JSON.parse(req.body.flags) : null;
        } catch {
          return null;
        }
      })();
      const faceCount = req.body?.faceCount ? Number(req.body.faceCount) : null;
      const captureType = ['PERIODIC', 'EVENT'].includes(req.body?.captureType)
        ? req.body.captureType
        : 'PERIODIC';
      const event = req.body?.event ? String(req.body.event).slice(0, 255) : null;
      const riskFlag =
        req.body?.riskFlag === 'true' ||
        req.body?.riskFlag === true ||
        req.body?.riskFlag === '1';
      const violationId = req.body?.violationId ? String(req.body.violationId) : null;

      const folder = `proctoring/assessments/${session.assessmentId}/sessions/${sessionId}/screenshots`;
      const uploaded = await uploadToCloudinary(req.file.buffer, {
        folder,
        resource_type: 'image',
      });

      const row = await prisma.assessmentScreenshot.create({
        data: {
          sessionId,
          imageUrl: uploaded.url,
          publicId: uploaded.public_id,
          captureType,
          event,
          riskFlag,
          violationId: violationId || null,
          flags: flags ? JSON.stringify(flags) : null,
          faceCount: Number.isFinite(faceCount) ? faceCount : null,
          bytes: uploaded.bytes ?? null,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
          format: uploaded.format ?? null,
        },
      });

      const signedUrl = signedScreenshotUrl(row);
      emitProctoringLiveUpdate(session.assessment.id, {
        assessmentId: session.assessment.id,
        kind: 'screenshot',
        sessionId,
        studentName: session.student?.fullName,
        screenshot: {
          id: row.id,
          url: signedUrl,
          timestamp: row.timestamp,
          captureType: row.captureType,
          event: row.event,
          riskFlag: row.riskFlag,
          faceCount: row.faceCount,
        },
      });

      res.status(201).json(row);
    });
  } catch (error) {
    console.error('uploadScreenshot error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
}

export async function getProctoringSessionDetails(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { id: true, fullName: true, enrollmentId: true, batch: true, center: true, school: true } },
        violations: { orderBy: { timestamp: 'asc' } },
        screenshots: { orderBy: { timestamp: 'asc' } },
        assessment: { select: { id: true, title: true, type: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    console.error('getProctoringSessionDetails error:', error);
    res.status(500).json({ error: 'Failed to fetch proctoring details' });
  }
}

export async function getSignedScreenshotUrl(req, res) {
  try {
    const { screenshotId } = req.params;
    const row = await prisma.assessmentScreenshot.findUnique({
      where: { id: screenshotId },
      select: { id: true, publicId: true, imageUrl: true },
    });
    if (!row) return res.status(404).json({ error: 'Screenshot not found' });
    const url = signedScreenshotUrl(row);
    res.json({ url, expiresAt: Math.floor(Date.now() / 1000) + 60 * 5 });
  } catch (error) {
    console.error('getSignedScreenshotUrl error:', error);
    res.status(500).json({ error: 'Failed to generate screenshot URL' });
  }
}

// Upload Proctoring Media
export async function uploadMedia(req, res) {
  try {
    const { sessionId } = req.params;
    const { type, url } = req.body;

    const media = await prisma.assessmentMedia.create({
      data: {
        sessionId,
        type,
        url
      }
    });

    res.status(201).json(media);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload media' });
  }
}

// Complete Assessment & Auto-Grader Engine
export async function completeAssessment(req, res) {
  try {
    const { sessionId } = req.params;
    const { answers: rawAnswers } = req.body;
    const answers = JSON.parse(rawAnswers || '{}');

    // Fetch session and questions for auto-grading
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { assessment: { include: { questions: true } } }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    let calculatedScore = 0;
    let hasDescriptive = false;
    let executionLogs = {}; // Store test case results
    const questions = session.assessment.questions;

    // The Grading Pipeline
    for (const q of questions) {
      const studentAnswer = answers[q.id];
      if (!studentAnswer) continue;

      if (q.type === 'MCQ') {
        if (mcqAnswersMatch(studentAnswer, q.correctAnswer, q.options)) {
          calculatedScore += q.points;
        }
      } 
      else if (q.type === 'CODING') {
        try {
          const graded = await gradeCodingAnswer(q, studentAnswer);
          calculatedScore += graded.pointsEarned;
          executionLogs[q.id] = {
            passed: graded.passed,
            total: graded.total,
            logs: graded.results,
            language: graded.language,
          };
        } catch (e) {
          console.error(`Coding evaluation failed for Q${q.id}:`, e);
          executionLogs[q.id] = { error: 'Evaluation Engine Failure' };
        }
      } 
      else if (q.type === 'DESCRIPTIVE') {
        hasDescriptive = true;
      }
    }

    const maxPoints = totalQuestionPoints(questions);
    const scorePercent = pointsToPercent(calculatedScore, questions);

    const updatedSession = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status: hasDescriptive ? 'PENDING_REVIEW' : 'COMPLETED',
        endTime: new Date(),
        score: scorePercent,
        responses: JSON.stringify({
          rawAnswers: answers,
          executionLogs,
          pointsEarned: calculatedScore,
          maxPoints,
        }),
      },
    });

    res.json(
      withNormalizedScore({
        ...updatedSession,
        assessment: session.assessment,
      }),
    );
  } catch (error) {
    console.error('Complete Assessment Error:', error);
    res.status(500).json({ error: 'Failed to complete assessment' });
  }
}

// --- REVIEW MODULE ---

// Get Session Results (Admin)
export async function getSessionResults(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        assessment: { include: { questions: true } },
        violations: true,
        media: true
      }
    });
    res.json(withNormalizedScore(session));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session results' });
  }
}

// Get All Assessment Results (Leaderboard)
export async function getAssessmentResults(req, res) {
  try {
    const { id } = req.params;
    
    // Fetch the assessment and all its sessions
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        questions: true,
        sessions: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                enrollmentId: true,
                batch: true
              }
            },
            violations: true
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!assessment) {
      console.log(`[DEBUG] getAssessmentResults: Assessment not found for id ${id}`);
      return res.status(404).json({ error: 'Assessment not found' });
    }
    const questions = assessment.questions || [];
    const sessions = (assessment.sessions || []).map((s) => ({
      ...s,
      score: normalizeStoredScore(s.score, questions),
    }));
    console.log(`[DEBUG] getAssessmentResults: Successfully fetched leaderboard for ${id}`);
    res.json({ ...assessment, sessions });
  } catch (error) {
    console.error(`[ERROR] Failed to fetch assessment leaderboard for ${req.params.id}:`, error);
    console.error('Failed to fetch assessment leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch assessment leaderboard' });
  }
}

// Get Live Sessions for Monitor
export async function getLiveAssessmentSessions(req, res) {
  try {
    const { id } = req.params;
    
    const activeSessions = await prisma.assessmentSession.findMany({
      where: { 
        assessmentId: id,
        status: 'IN_PROGRESS'
      },
      include: {
        student: { select: { fullName: true } },
        violations: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        screenshots: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            id: true,
            imageUrl: true,
            publicId: true,
            timestamp: true,
            captureType: true,
            event: true,
            riskFlag: true,
          },
        },
        _count: {
          select: { screenshots: true }
        }
      }
    });

    const formatted = activeSessions.map(session => {
      // Calculate last ping based on last violation or startTime
      const lastActivity = session.violations.length > 0 
        ? session.violations[0].timestamp 
        : session.startTime;
      
      const secondsAgo = Math.floor((new Date() - new Date(lastActivity)) / 1000);
      let lastPing = 'Just now';
      if (secondsAgo > 60) lastPing = `${Math.floor(secondsAgo / 60)}m ago`;

      const latest = session.screenshots?.[0] || null;
      return {
        id: session.id,
        studentName: session.student.fullName,
        status: session.riskLevel || (session.violationsCount > 3 ? 'CRITICAL' : session.violationsCount > 0 ? 'WARNING' : 'ACTIVE'),
        violations: session.violationsCount,
        screenshots: session._count?.screenshots || 0,
        lastPing,
        lastViolation: session.violations.length > 0 ? session.violations[0].type.replace(/_/g, ' ') : null,
        latestScreenshot: latest
          ? {
              id: latest.id,
              url: signedScreenshotUrl(latest),
              timestamp: latest.timestamp,
              captureType: latest.captureType,
              event: latest.event,
              riskFlag: latest.riskFlag,
            }
          : null,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Failed to fetch live sessions:', error);
    res.status(500).json({ error: 'Failed to fetch live sessions' });
  }
}

// Evaluate Candidate (Admin)
export async function evaluateAssessmentCandidate(req, res) {
  try {
    const { assessmentId, studentId } = req.params;
    const { marks, remarks, status } = req.body;

    // Find or Create session for this student-assessment pair
    let session = await prisma.assessmentSession.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId } }
    });

    if (!session) {
      session = await prisma.assessmentSession.create({
        data: {
          assessmentId,
          studentId,
          status: status || 'COMPLETED',
          score: marks ? parseFloat(marks) : null,
          endTime: new Date()
        }
      });
    } else {
      session = await prisma.assessmentSession.update({
        where: { id: session.id },
        data: {
          score: marks ? parseFloat(marks) : null,
          status: status || 'COMPLETED',
          endTime: new Date()
        }
      });
    }

    // Save remarks/feedback - we can store this in a new model or as JSON in config
    // For now, let's just update the session score and status.
    
    res.json(session);
  } catch (error) {
    console.error('Evaluation Error:', error);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
}

// Get All Candidates for an Assessment (Admin)
export async function getAssessmentCandidates(req, res) {
  try {
    const { assessmentId } = req.params;

    // Get all assignments for this assessment
    const assignments = await prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      include: {
        student: {
          include: { user: { select: { email: true, displayName: true } } }
        }
      }
    });

    // Get all sessions to see who has started/completed
    const sessions = await prisma.assessmentSession.findMany({
      where: { assessmentId },
      include: {
        violations: true
      }
    });

    // Merge data
    const candidates = assignments.map(asn => {
      const session = sessions.find(s => s.studentId === asn.studentId);
      return {
        student: {
          id: asn.studentId,
          fullName: asn.student.fullName || asn.student.user?.displayName,
          email: asn.student.email || asn.student.user?.email,
          enrollmentId: asn.student.enrollmentId,
          batch: asn.student.batch,
          profilePhoto: asn.student.profileImageUrl
        },
        evaluation: session ? {
          marks: session.score,
          status: session.status,
          remarks: null // We don't have a remarks field in session yet, could add later
        } : null,
        session: session || null,
        scheduledAt: asn.scheduledAt
      };
    });

    res.json({ candidates });
  } catch (error) {
    console.error('getAssessmentCandidates Error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
}

// Get Student Session Results
export async function getStudentSessionResults(req, res) {
  try {
    const { sessionId } = req.params;
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assessment: { 
          include: { 
            questions: {
              orderBy: { order: 'asc' }
            } 
          } 
        },
        violations: true
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // SECURITY: Ensure the session belongs to the requesting student
    if (session.studentId !== student.id) {
      return res.status(403).json({ error: 'Access denied: This result belongs to another student' });
    }

    // Calculate time spent if completed
    let duration = null;
    if (session.startTime && session.endTime) {
      duration = Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000); // seconds
    }

    res.json({
      ...withNormalizedScore(session),
      duration,
    });
  } catch (error) {
    console.error('getStudentSessionResults Error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}
