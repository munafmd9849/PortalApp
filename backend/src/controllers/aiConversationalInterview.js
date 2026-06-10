import multer from 'multer';
import prisma from '../config/database.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import {
  resolveAiInterviewStudentIds,
  createEnrollmentsForInterview,
  computeRiskLevel,
} from '../utils/aiMockInterviewAssignment.js';
import { generateInterviewAcknowledgement } from '../services/aiMockInterviewAcknowledgement.js';
import {
  generateConversationalOpening,
  generateConversationalFollowUp,
} from '../services/aiConversationalInterview.js';
import { deleteAiMockInterviewWithAssets } from '../utils/aiMockInterviewCleanup.js';

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 120 * 1024 * 1024 },
});

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const CONVERSATIONAL = 'CONVERSATIONAL';

async function getStudentForUser(userId) {
  return prisma.student.findUnique({ where: { userId } });
}

async function assertEnrollmentAccess(enrollmentId, req) {
  const enrollment = await prisma.aiMockInterviewEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: { select: { userId: true, id: true, fullName: true } },
      interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      answers: true,
    },
  });
  if (!enrollment) return { error: 'Enrollment not found', status: 404 };
  if (enrollment.interview.sessionMode !== CONVERSATIONAL) {
    return { error: 'Not a conversational interview', status: 400 };
  }
  const isOwner = enrollment.student?.userId === (req.userId || req.user?.id);
  const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
  if (!isAdmin && !isOwner) return { error: 'Forbidden', status: 403 };
  return { enrollment, isOwner, isAdmin };
}

function getActiveQuestion(enrollment) {
  const { interview, answers } = enrollment;
  const answered = new Set(answers.filter((a) => a.submittedAt).map((a) => a.questionId));
  const active = interview.questions.find((q) => !answered.has(q.id));
  const completedTurns = answers.filter((a) => a.submittedAt).length;
  return { active, completedTurns, answered };
}

async function ensureOpeningQuestion(enrollment) {
  const { interview, answers } = enrollment;
  if (interview.questions.length > 0) return enrollment;

  const text = await generateConversationalOpening({
    topic: interview.conversationalTopic,
    interviewType: interview.interviewType,
    instructions: interview.instructions,
  });

  await prisma.aiMockInterviewQuestion.create({
    data: {
      interviewId: interview.id,
      orderIndex: 0,
      questionText: text,
      prepTimeSeconds: 20,
      answerTimeSeconds: 180,
      mandatory: true,
    },
  });

  return prisma.aiMockInterviewEnrollment.findUnique({
    where: { id: enrollment.id },
    include: {
      interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      answers: true,
      student: { select: { userId: true, id: true, fullName: true } },
    },
  });
}

const proctoringConfig = {
  requireCamera: true,
  requireMicrophone: true,
  requireFullscreen: true,
  faceDetection: true,
  tabSwitchDetection: true,
  screenshotIntervalMs: 180000,
  screenshotJitterMs: 45000,
};

// --- ADMIN ---

export async function createConversationalInterview(req, res) {
  try {
    const {
      title,
      description,
      interviewType,
      instructions,
      conversationalTopic,
      conversationalMaxTurns,
      startDate,
      endDate,
      targetBatches,
      targetBranches,
      targetCenters,
      targetSchoolIds,
      targetStudentIds,
      publish,
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Interview name is required' });
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end date/time are required' });
    }
    const startAt = new Date(startDate);
    const endAt = new Date(endDate);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date/time' });
    }
    if (endAt <= startAt) return res.status(400).json({ error: 'End must be after start' });

    const maxTurns = Math.min(15, Math.max(3, parseInt(conversationalMaxTurns, 10) || 8));

    const interview = await prisma.aiMockInterview.create({
      data: {
        title: title.trim(),
        description: description || null,
        sessionMode: CONVERSATIONAL,
        interviewType: interviewType || 'PLACEMENT_READINESS',
        instructions: instructions || null,
        conversationalTopic: conversationalTopic?.trim() || null,
        conversationalMaxTurns: maxTurns,
        startDate: startAt,
        endDate: endAt,
        targetBatches: JSON.stringify(targetBatches || []),
        targetBranches: JSON.stringify(targetBranches || []),
        targetCenters: JSON.stringify(targetCenters || []),
        targetSchoolIds: JSON.stringify(targetSchoolIds || []),
        targetStudentIds: JSON.stringify(targetStudentIds || []),
        status: publish === false ? 'DRAFT' : 'PUBLISHED',
      },
    });

    if (interview.status === 'PUBLISHED') {
      const studentIds = await resolveAiInterviewStudentIds({
        targetBatches: targetBatches || [],
        targetBranches: targetBranches || [],
        targetCenters: targetCenters || [],
        targetSchoolIds: targetSchoolIds || [],
        targetStudentIds: targetStudentIds || [],
      });
      await createEnrollmentsForInterview(interview.id, studentIds);
    }

    res.status(201).json(interview);
  } catch (error) {
    console.error('createConversationalInterview:', error);
    res.status(500).json({ error: 'Failed to create conversational interview' });
  }
}

export async function listConversationalInterviews(req, res) {
  try {
    const interviews = await prisma.aiMockInterview.findMany({
      where: { sessionMode: CONVERSATIONAL },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      interviews.map((iv) => {
        const total = iv._count.enrollments;
        const completed = iv.enrollments.filter((e) => e.status === 'COMPLETED').length;
        const inProgress = iv.enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
        return {
          id: iv.id,
          title: iv.title,
          description: iv.description,
          interviewType: iv.interviewType,
          conversationalTopic: iv.conversationalTopic,
          conversationalMaxTurns: iv.conversationalMaxTurns,
          startDate: iv.startDate,
          endDate: iv.endDate,
          status: iv.status,
          stats: { assigned: total, completed, inProgress, pending: total - completed - inProgress },
        };
      })
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to list interviews' });
  }
}

export async function deleteConversationalInterview(req, res) {
  try {
    const existing = await prisma.aiMockInterview.findUnique({
      where: { id: req.params.id },
    });
    if (!existing || existing.sessionMode !== CONVERSATIONAL) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    const result = await deleteAiMockInterviewWithAssets(req.params.id);
    res.json({ message: 'Deleted', id: existing.id, cloudinary: result?.cloudinary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
}

// --- STUDENT ---

export async function getStudentConversationalInterviews(req, res) {
  try {
    const student = await getStudentForUser(req.userId || req.user?.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const enrollments = await prisma.aiMockInterviewEnrollment.findMany({
      where: {
        studentId: student.id,
        interview: { sessionMode: CONVERSATIONAL },
      },
      include: { interview: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    res.json(
      enrollments.map((e) => ({
        enrollmentId: e.id,
        interviewId: e.interviewId,
        title: e.interview.title,
        topic: e.interview.conversationalTopic,
        maxTurns: e.interview.conversationalMaxTurns,
        interviewType: e.interview.interviewType,
        startDate: e.interview.startDate,
        endDate: e.interview.endDate,
        status: e.status,
        progressPercent: e.progressPercent,
        canStart:
          e.status !== 'COMPLETED' && now >= e.interview.startDate && now <= e.interview.endDate,
        isWithinWindow: now >= e.interview.startDate && now <= e.interview.endDate,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to load interviews' });
  }
}

export async function getStudentConversationalSession(req, res) {
  try {
    const student = await getStudentForUser(req.userId || req.user?.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let enrollment = await prisma.aiMockInterviewEnrollment.findUnique({
      where: {
        interviewId_studentId: { interviewId: req.params.id, studentId: student.id },
      },
      include: {
        interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
        answers: true,
      },
    });

    if (!enrollment) return res.status(404).json({ error: 'Interview not assigned' });
    if (enrollment.interview.sessionMode !== CONVERSATIONAL) {
      return res.status(400).json({ error: 'This is not a conversational interview' });
    }

    const now = new Date();
    if (enrollment.status === 'COMPLETED') {
      return res.status(403).json({ error: 'Interview already completed', code: 'COMPLETED' });
    }
    if (now < enrollment.interview.startDate) {
      return res.status(403).json({ error: 'Interview not yet available', code: 'NOT_STARTED' });
    }
    if (now > enrollment.interview.endDate && enrollment.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: 'Interview window has ended', code: 'EXPIRED' });
    }

    enrollment = await ensureOpeningQuestion(enrollment);
    const { active, completedTurns } = getActiveQuestion(enrollment);
    const maxTurns = enrollment.interview.conversationalMaxTurns;

    res.json({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      title: enrollment.interview.title,
      topic: enrollment.interview.conversationalTopic,
      interviewType: enrollment.interview.interviewType,
      instructions: enrollment.interview.instructions,
      maxTurns,
      completedTurns,
      progressPercent: Math.round((completedTurns / maxTurns) * 100),
      activeQuestion: active
        ? {
            id: active.id,
            questionText: active.questionText,
            prepTimeSeconds: active.prepTimeSeconds,
            answerTimeSeconds: active.answerTimeSeconds,
            turnIndex: completedTurns,
          }
        : null,
      isComplete: !active && completedTurns >= maxTurns,
      proctoringConfig,
    });
  } catch (error) {
    console.error('getStudentConversationalSession:', error);
    res.status(500).json({ error: 'Failed to load session' });
  }
}

export async function startConversationalSession(req, res) {
  try {
    const access = await assertEnrollmentAccess(req.params.enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });

    let { enrollment } = access;
    if (enrollment.status === 'COMPLETED') {
      return res.status(403).json({ error: 'Already completed' });
    }

    enrollment = await ensureOpeningQuestion(enrollment);

    const updated = await prisma.aiMockInterviewEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: enrollment.startedAt || new Date(),
      },
    });

    const { active, completedTurns } = getActiveQuestion(enrollment);

    res.json({
      success: true,
      status: updated.status,
      activeQuestion: active
        ? {
            id: active.id,
            questionText: active.questionText,
            prepTimeSeconds: active.prepTimeSeconds,
            answerTimeSeconds: active.answerTimeSeconds,
            turnIndex: completedTurns,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
  }
}

export async function submitConversationalAnswer(req, res) {
  try {
    const { enrollmentId } = req.params;
    const access = await assertEnrollmentAccess(enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });
    if (access.enrollment.status === 'COMPLETED') {
      return res.status(403).json({ error: 'Interview completed' });
    }

    videoUpload.single('recording')(req, res, async (uploadErr) => {
      if (uploadErr) return res.status(400).json({ error: uploadErr.message });
      if (!req.file?.buffer) return res.status(400).json({ error: 'Recording required' });

      const { questionId, durationSeconds } = req.body || {};
      if (!questionId) return res.status(400).json({ error: 'Question is required' });

      let enrollment = await prisma.aiMockInterviewEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
          answers: true,
        },
      });

      const question = enrollment.interview.questions.find((q) => q.id === questionId);
      if (!question) return res.status(400).json({ error: 'Invalid question' });

      const { active, completedTurns } = getActiveQuestion(enrollment);
      if (!active || active.id !== questionId) {
        return res.status(409).json({
          error: 'Please answer the current question in order.',
          expectedQuestionId: active?.id ?? null,
        });
      }

      try {
        if (!req.file.buffer?.length || req.file.buffer.length < 256) {
          return res.status(400).json({ error: 'Recording is too short or empty. Please record again.' });
        }

        const folder = `ai-mock-interviews/${enrollment.interviewId}/enrollments/${enrollmentId}`;
        const mime = req.file.mimetype || 'video/webm';
        const uploadOpts = { folder, resource_type: mime.startsWith('audio/') ? 'raw' : 'video' };
        if (mime.includes('webm')) uploadOpts.format = 'webm';
        else if (mime.includes('mp4')) uploadOpts.format = 'mp4';

        let uploaded;
        try {
          uploaded = await uploadToCloudinary(req.file.buffer, uploadOpts);
        } catch (videoErr) {
          console.warn('conversational upload retry as raw:', videoErr?.message);
          uploaded = await uploadToCloudinary(req.file.buffer, { folder, resource_type: 'raw' });
        }

        const duration = parseInt(durationSeconds, 10) || null;
        const turnIndex = completedTurns;
        const maxTurns = enrollment.interview.conversationalMaxTurns;

        const ackData = await generateInterviewAcknowledgement({
          questionText: question.questionText,
          interviewType: enrollment.interview.interviewType,
          durationSeconds: duration,
          questionIndex: turnIndex,
          totalQuestions: maxTurns,
        });

        await prisma.aiMockInterviewAnswer.upsert({
          where: { enrollmentId_questionId: { enrollmentId, questionId } },
          create: {
            enrollmentId,
            questionId,
            videoUrl: uploaded.url,
            videoPublicId: uploaded.public_id,
            audioUrl: uploaded.url,
            audioPublicId: uploaded.public_id,
            durationSeconds: duration,
            acknowledgementText: ackData.acknowledgement,
            transitionText: ackData.transition,
            submittedAt: new Date(),
          },
          update: {
            videoUrl: uploaded.url,
            videoPublicId: uploaded.public_id,
            audioUrl: uploaded.url,
            audioPublicId: uploaded.public_id,
            durationSeconds: duration,
            acknowledgementText: ackData.acknowledgement,
            transitionText: ackData.transition,
            submittedAt: new Date(),
          },
        });

        const newCompleted = turnIndex + 1;
        const progressPercent = Math.round((newCompleted / maxTurns) * 100);

        const followUp = await generateConversationalFollowUp({
          topic: enrollment.interview.conversationalTopic,
          interviewType: enrollment.interview.interviewType,
          instructions: enrollment.interview.instructions,
          questions: enrollment.interview.questions,
          answers: [
            ...enrollment.answers.filter((a) => a.questionId !== questionId),
            {
              questionId,
              durationSeconds: duration,
              submittedAt: new Date(),
              acknowledgementText: ackData.acknowledgement,
            },
          ],
          turnIndex: newCompleted,
          maxTurns,
        });

        let nextQuestion = null;
        if (!followUp.isComplete && followUp.question) {
          const created = await prisma.aiMockInterviewQuestion.create({
            data: {
              interviewId: enrollment.interviewId,
              orderIndex: newCompleted,
              questionText: followUp.question,
              prepTimeSeconds: 15,
              answerTimeSeconds: 180,
              mandatory: true,
            },
          });
          nextQuestion = {
            id: created.id,
            questionText: created.questionText,
            prepTimeSeconds: created.prepTimeSeconds,
            answerTimeSeconds: created.answerTimeSeconds,
            turnIndex: newCompleted,
          };
        }

        const isLast = followUp.isComplete || newCompleted >= maxTurns;

        await prisma.aiMockInterviewEnrollment.update({
          where: { id: enrollmentId },
          data: {
            currentQuestionIndex: newCompleted,
            progressPercent,
            totalDurationSeconds: (enrollment.totalDurationSeconds || 0) + (duration || 0),
            status: isLast ? 'COMPLETED' : 'IN_PROGRESS',
            completedAt: isLast ? new Date() : null,
          },
        });

        res.status(201).json({
          success: true,
          progressPercent,
          completedTurns: newCompleted,
          acknowledgement: followUp.acknowledgement || ackData.acknowledgement,
          transition: followUp.transition || ackData.transition,
          nextQuestion,
          isComplete: isLast,
        });
      } catch (e) {
        console.error('submitConversationalAnswer:', e);
        res.status(500).json({ error: 'Failed to save answer' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
}

export async function completeConversationalInterview(req, res) {
  try {
    const access = await assertEnrollmentAccess(req.params.enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });

    await prisma.aiMockInterviewEnrollment.update({
      where: { id: access.enrollment.id },
      data: { status: 'COMPLETED', completedAt: new Date(), progressPercent: 100 },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete interview' });
  }
}

export async function logConversationalViolation(req, res) {
  try {
    const access = await assertEnrollmentAccess(req.params.enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });

    const { type, details, meta } = req.body;
    await prisma.aiMockInterviewViolation.create({
      data: {
        enrollmentId: access.enrollment.id,
        type: type || 'UNKNOWN',
        details: details || null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });

    const count = await prisma.aiMockInterviewViolation.count({
      where: { enrollmentId: access.enrollment.id },
    });
    await prisma.aiMockInterviewEnrollment.update({
      where: { id: access.enrollment.id },
      data: { violationsCount: count, riskLevel: computeRiskLevel(count) },
    });

    res.json({ success: true, violationsCount: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log violation' });
  }
}

export async function uploadConversationalScreenshot(req, res) {
  try {
    const { enrollmentId } = req.params;
    const access = await assertEnrollmentAccess(enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });

    screenshotUpload.single('screenshot')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file?.buffer) return res.status(400).json({ error: 'No screenshot' });

      const folder = `ai-mock-interviews/${access.enrollment.interviewId}/enrollments/${enrollmentId}/screenshots`;
      const uploaded = await uploadToCloudinary(req.file.buffer, {
        folder,
        resource_type: 'image',
      });

      await prisma.aiMockInterviewScreenshot.create({
        data: {
          enrollmentId,
          imageUrl: uploaded.url,
          publicId: uploaded.public_id,
          captureType: req.body?.captureType === 'EVENT' ? 'EVENT' : 'PERIODIC',
          event: req.body?.event || null,
        },
      });

      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
}
