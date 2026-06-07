import multer from 'multer';
import prisma from '../config/database.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import {
  resolveAiInterviewStudentIds,
  createEnrollmentsForInterview,
  computeRiskLevel,
} from '../utils/aiMockInterviewAssignment.js';
import { generateAiInterviewInsights } from '../services/aiMockInterviewMistral.js';

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 120 * 1024 * 1024 },
});

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

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
      violations: { orderBy: { timestamp: 'desc' }, take: 50 },
      screenshots: { orderBy: { timestamp: 'desc' }, take: 30 },
      review: true,
      aiInsight: true,
    },
  });
  if (!enrollment) return { error: 'Enrollment not found', status: 404 };

  const role = req.user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isOwner = enrollment.student?.userId === (req.userId || req.user?.id);

  if (!isAdmin && !isOwner) return { error: 'Forbidden', status: 403 };
  return { enrollment, isAdmin, isOwner };
}

function mapInterview(interview) {
  if (!interview) return null;
  let questions = interview.questions || [];
  return {
    ...interview,
    targetBatches: safeJson(interview.targetBatches),
    targetBranches: safeJson(interview.targetBranches),
    targetCenters: safeJson(interview.targetCenters),
    targetSchoolIds: safeJson(interview.targetSchoolIds),
    targetStudentIds: safeJson(interview.targetStudentIds),
    questions,
  };
}

function safeJson(s) {
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

// --- ADMIN: CREATE / UPDATE ---

export async function createAiMockInterview(req, res) {
  try {
    const {
      title,
      description,
      interviewType,
      instructions,
      startDate,
      endDate,
      targetBatches,
      targetBranches,
      targetCenters,
      targetSchoolIds,
      targetStudentIds,
      questions,
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
    if (endAt <= startAt) {
      return res.status(400).json({ error: 'End must be after start' });
    }

    const interview = await prisma.aiMockInterview.create({
      data: {
        title: title.trim(),
        description: description || null,
        interviewType: interviewType || 'AI_VIDEO',
        instructions: instructions || null,
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

    const qList = Array.isArray(questions) ? questions : [];
    if (qList.length) {
      await prisma.aiMockInterviewQuestion.createMany({
        data: qList.map((q, idx) => ({
          interviewId: interview.id,
          orderIndex: q.orderIndex ?? idx,
          questionText: q.questionText || q.text || '',
          notes: q.notes || null,
          prepTimeSeconds: parseInt(q.prepTimeSeconds ?? q.prepTime ?? 30, 10),
          answerTimeSeconds: parseInt(q.answerTimeSeconds ?? q.answerTime ?? 120, 10),
          mandatory: q.mandatory !== false,
        })),
      });
    }

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

    const full = await prisma.aiMockInterview.findUnique({
      where: { id: interview.id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    res.status(201).json(mapInterview(full));
  } catch (error) {
    console.error('createAiMockInterview:', error);
    res.status(500).json({ error: 'Failed to create AI interview' });
  }
}

export async function updateAiMockInterview(req, res) {
  try {
    const { id } = req.params;
    const { questions, publish, ...rest } = req.body;

    const data = {};
    if (rest.title != null) data.title = rest.title;
    if (rest.description != null) data.description = rest.description;
    if (rest.interviewType != null) data.interviewType = rest.interviewType;
    if (rest.instructions != null) data.instructions = rest.instructions;
    if (rest.startDate != null) data.startDate = new Date(rest.startDate);
    if (rest.endDate != null) data.endDate = new Date(rest.endDate);
    if (rest.startDate != null || rest.endDate != null) {
      const existing = await prisma.aiMockInterview.findUnique({ where: { id } });
      const start = data.startDate ?? existing?.startDate;
      const end = data.endDate ?? existing?.endDate;
      if (start && end && new Date(end) <= new Date(start)) {
        return res.status(400).json({ error: 'End must be after start' });
      }
    }
    if (rest.targetBatches != null) data.targetBatches = JSON.stringify(rest.targetBatches);
    if (rest.targetBranches != null) data.targetBranches = JSON.stringify(rest.targetBranches);
    if (rest.targetCenters != null) data.targetCenters = JSON.stringify(rest.targetCenters);
    if (rest.targetSchoolIds != null) data.targetSchoolIds = JSON.stringify(rest.targetSchoolIds);
    if (rest.targetStudentIds != null) data.targetStudentIds = JSON.stringify(rest.targetStudentIds);
    if (publish === true) data.status = 'PUBLISHED';
    if (publish === false) data.status = 'DRAFT';

    await prisma.aiMockInterview.update({ where: { id }, data });

    if (Array.isArray(questions)) {
      await prisma.aiMockInterviewQuestion.deleteMany({ where: { interviewId: id } });
      if (questions.length) {
        await prisma.aiMockInterviewQuestion.createMany({
          data: questions.map((q, idx) => ({
            interviewId: id,
            orderIndex: q.orderIndex ?? idx,
            questionText: q.questionText || q.text || '',
            notes: q.notes || null,
            prepTimeSeconds: parseInt(q.prepTimeSeconds ?? 30, 10),
            answerTimeSeconds: parseInt(q.answerTimeSeconds ?? 120, 10),
            mandatory: q.mandatory !== false,
          })),
        });
      }
    }

    const interview = await prisma.aiMockInterview.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (publish === true) {
      const studentIds = await resolveAiInterviewStudentIds({
        targetBatches: safeJson(interview.targetBatches),
        targetBranches: safeJson(interview.targetBranches),
        targetCenters: safeJson(interview.targetCenters),
        targetSchoolIds: safeJson(interview.targetSchoolIds),
        targetStudentIds: safeJson(interview.targetStudentIds),
      });
      await createEnrollmentsForInterview(id, studentIds);
    }

    res.json(mapInterview(interview));
  } catch (error) {
    console.error('updateAiMockInterview:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
}

export async function deleteAiMockInterview(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.aiMockInterview.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    await prisma.aiMockInterview.delete({ where: { id } });

    res.json({
      message: 'AI mock interview deleted successfully',
      id: existing.id,
      title: existing.title,
    });
  } catch (error) {
    console.error('deleteAiMockInterview:', error);
    res.status(500).json({ error: 'Failed to delete AI mock interview' });
  }
}

export async function listAiMockInterviews(req, res) {
  try {
    const interviews = await prisma.aiMockInterview.findMany({
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { enrollments: true } },
        enrollments: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = interviews.map((iv) => {
      const total = iv._count.enrollments;
      const completed = iv.enrollments.filter((e) => e.status === 'COMPLETED').length;
      const inProgress = iv.enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
      const pending = total - completed - inProgress;
      const { enrollments, ...rest } = iv;
      return {
        ...mapInterview(rest),
        stats: {
          assigned: total,
          completed,
          inProgress,
          pending,
        },
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('listAiMockInterviews:', error);
    res.status(500).json({ error: 'Failed to list interviews' });
  }
}

export async function getAiMockInterview(req, res) {
  try {
    const interview = await prisma.aiMockInterview.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!interview) return res.status(404).json({ error: 'Not found' });
    res.json(mapInterview(interview));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
}

// --- ADMIN REVIEW ---

export async function getAiInterviewReviewDashboard(req, res) {
  try {
    const { id } = req.params;
    const interview = await prisma.aiMockInterview.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!interview) return res.status(404).json({ error: 'Not found' });

    const enrollments = await prisma.aiMockInterviewEnrollment.findMany({
      where: { interviewId: id },
      include: {
        student: {
          select: { id: true, fullName: true, email: true, enrollmentId: true, branch: true, batch: true },
        },
        review: true,
        aiInsight: true,
        _count: { select: { answers: true, violations: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const ratings = enrollments
      .map((e) => e.review?.overallRating)
      .filter((r) => r != null);
    const avgScore = ratings.length
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : 0;

    const topPerformers = [...enrollments]
      .filter((e) => e.review?.overallRating != null)
      .sort((a, b) => (b.review.overallRating || 0) - (a.review.overallRating || 0))
      .slice(0, 5)
      .map((e) => ({
        studentName: e.student?.fullName,
        rating: e.review?.overallRating,
        enrollmentId: e.id,
      }));

    const highRisk = enrollments.filter((e) => e.riskLevel === 'HIGH').length;

    res.json({
      interview: mapInterview(interview),
      analytics: {
        assigned: enrollments.length,
        completed,
        pending: enrollments.length - completed,
        averageScore: avgScore,
        highRiskViolations: highRisk,
        topPerformers,
      },
      students: enrollments.map((e) => ({
        enrollmentId: e.id,
        student: e.student,
        status: e.status,
        progressPercent: e.progressPercent,
        totalDurationSeconds: e.totalDurationSeconds,
        violationsCount: e.violationsCount,
        riskLevel: e.riskLevel,
        answersSubmitted: e._count.answers,
        hasReview: Boolean(e.review),
        aiInsightStatus: e.aiInsight?.status,
        overallRating: e.review?.overallRating,
        aiOverall: e.aiInsight?.overallPerformance,
        completedAt: e.completedAt,
      })),
    });
  } catch (error) {
    console.error('getAiInterviewReviewDashboard:', error);
    res.status(500).json({ error: 'Failed to load review dashboard' });
  }
}

export async function getEnrollmentReviewDetail(req, res) {
  try {
    const { enrollmentId } = req.params;
    const { enrollment, error, status } = await assertEnrollmentAccess(enrollmentId, req);
    if (error) return res.status(status).json({ error });

    const answers = await prisma.aiMockInterviewAnswer.findMany({
      where: { enrollmentId },
      include: { question: true },
      orderBy: { question: { orderIndex: 'asc' } },
    });

    res.json({
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        violationsCount: enrollment.violationsCount,
        riskLevel: enrollment.riskLevel,
        totalDurationSeconds: enrollment.totalDurationSeconds,
        student: enrollment.student,
      },
      interview: mapInterview(enrollment.interview),
      answers: answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        questionText: a.question?.questionText,
        orderIndex: a.question?.orderIndex,
        videoUrl: a.videoUrl,
        audioUrl: a.audioUrl,
        durationSeconds: a.durationSeconds,
        submittedAt: a.submittedAt,
      })),
      violations: enrollment.violations,
      screenshots: enrollment.screenshots,
      review: enrollment.review,
      aiInsight: enrollment.aiInsight,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load enrollment detail' });
  }
}

export async function saveEnrollmentReview(req, res) {
  try {
    const { enrollmentId } = req.params;
    const { overallRating, comments, strengths, improvements, questionNotes } = req.body;

    const review = await prisma.aiMockInterviewReview.upsert({
      where: { enrollmentId },
      create: {
        enrollmentId,
        overallRating: overallRating != null ? parseInt(overallRating, 10) : null,
        comments,
        strengths,
        improvements,
        questionNotes: questionNotes ? JSON.stringify(questionNotes) : null,
        reviewedBy: req.userId || req.user?.id,
      },
      update: {
        overallRating: overallRating != null ? parseInt(overallRating, 10) : null,
        comments,
        strengths,
        improvements,
        questionNotes: questionNotes ? JSON.stringify(questionNotes) : null,
        reviewedBy: req.userId || req.user?.id,
      },
    });

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save review' });
  }
}

// --- STUDENT ---

export async function getStudentAiInterviews(req, res) {
  try {
    const student = await getStudentForUser(req.userId || req.user?.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const enrollments = await prisma.aiMockInterviewEnrollment.findMany({
      where: { studentId: student.id },
      include: {
        interview: {
          include: { _count: { select: { questions: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    res.json(
      enrollments.map((e) => ({
        enrollmentId: e.id,
        interviewId: e.interviewId,
        title: e.interview.title,
        interviewType: e.interview.interviewType,
        description: e.interview.description,
        startDate: e.interview.startDate,
        endDate: e.interview.endDate,
        status: e.status,
        progressPercent: e.progressPercent,
        questionCount: e.interview._count.questions,
        isWithinWindow: now >= e.interview.startDate && now <= e.interview.endDate,
        canStart: e.status !== 'COMPLETED' && now >= e.interview.startDate && now <= e.interview.endDate,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to load interviews' });
  }
}

export async function getStudentAiInterviewSession(req, res) {
  try {
    const student = await getStudentForUser(req.userId || req.user?.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const interviewId = req.params.id;
    const enrollment = await prisma.aiMockInterviewEnrollment.findUnique({
      where: {
        interviewId_studentId: { interviewId, studentId: student.id },
      },
      include: {
        interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
        answers: true,
      },
    });

    if (!enrollment) return res.status(404).json({ error: 'Interview not assigned' });

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

    const questions = enrollment.interview.questions;
    const answeredIds = new Set(
      enrollment.answers.filter((a) => a.submittedAt).map((a) => a.questionId)
    );

    res.json({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      currentQuestionIndex: enrollment.currentQuestionIndex,
      progressPercent: enrollment.progressPercent,
      instructions: enrollment.interview.instructions,
      title: enrollment.interview.title,
      interviewType: enrollment.interview.interviewType,
      totalQuestions: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        questionText: q.questionText,
        notes: q.notes,
        prepTimeSeconds: q.prepTimeSeconds,
        answerTimeSeconds: q.answerTimeSeconds,
        mandatory: q.mandatory,
        answered: answeredIds.has(q.id),
      })),
      proctoringConfig: {
        requireCamera: true,
        requireMicrophone: true,
        requireFullscreen: true,
        faceDetection: true,
        tabSwitchDetection: true,
        screenshotIntervalMs: 180000,
        screenshotJitterMs: 45000,
      },
    });
  } catch (error) {
    console.error('getStudentAiInterviewSession:', error);
    res.status(500).json({ error: 'Failed to load session' });
  }
}

export async function startAiInterviewSession(req, res) {
  try {
    const { enrollmentId } = req.params;
    const { enrollment, error, status, isOwner } = await assertEnrollmentAccess(enrollmentId, req);
    if (error) return res.status(status).json({ error });
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });

    if (enrollment.status === 'COMPLETED') {
      return res.status(403).json({ error: 'Already completed' });
    }

    const updated = await prisma.aiMockInterviewEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: enrollment.startedAt || new Date(),
      },
    });

    res.json({ success: true, status: updated.status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
  }
}

export async function updateAiInterviewProgress(req, res) {
  try {
    const { enrollmentId } = req.params;
    const { currentQuestionIndex, progressPercent } = req.body;
    const { enrollment, error, status, isOwner } = await assertEnrollmentAccess(enrollmentId, req);
    if (error) return res.status(status).json({ error });
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });
    if (enrollment.status === 'COMPLETED') return res.status(403).json({ error: 'Completed' });

    const updated = await prisma.aiMockInterviewEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentQuestionIndex: currentQuestionIndex ?? enrollment.currentQuestionIndex,
        progressPercent: progressPercent ?? enrollment.progressPercent,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save progress' });
  }
}

export async function submitAiInterviewAnswer(req, res) {
  try {
    const { enrollmentId } = req.params;
    const { questionId, durationSeconds } = req.body;

    const access = await assertEnrollmentAccess(enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });
    const { enrollment } = access;

    if (enrollment.status === 'COMPLETED') {
      return res.status(403).json({ error: 'Interview completed' });
    }

    const question = enrollment.interview.questions.find((q) => q.id === questionId);
    if (!question) return res.status(400).json({ error: 'Invalid question' });

    const qIndex = enrollment.interview.questions.findIndex((q) => q.id === questionId);
    if (qIndex < enrollment.currentQuestionIndex) {
      return res.status(403).json({ error: 'Cannot modify previous answers' });
    }

    videoUpload.single('recording')(req, res, async (uploadErr) => {
      if (uploadErr) return res.status(400).json({ error: uploadErr.message });
      if (!req.file?.buffer) return res.status(400).json({ error: 'Recording required' });

      try {
        const folder = `ai-mock-interviews/${enrollment.interviewId}/enrollments/${enrollmentId}`;
        const uploaded = await uploadToCloudinary(req.file.buffer, {
          folder,
          resource_type: 'video',
        });

        const duration = parseInt(durationSeconds, 10) || null;
        const answer = await prisma.aiMockInterviewAnswer.upsert({
          where: {
            enrollmentId_questionId: { enrollmentId, questionId },
          },
          create: {
            enrollmentId,
            questionId,
            videoUrl: uploaded.url,
            videoPublicId: uploaded.public_id,
            audioUrl: uploaded.url,
            audioPublicId: uploaded.public_id,
            durationSeconds: duration,
            submittedAt: new Date(),
          },
          update: {
            videoUrl: uploaded.url,
            videoPublicId: uploaded.public_id,
            audioUrl: uploaded.url,
            audioPublicId: uploaded.public_id,
            durationSeconds: duration,
            submittedAt: new Date(),
          },
        });

        const totalQ = enrollment.interview.questions.length;
        const answered = await prisma.aiMockInterviewAnswer.count({
          where: { enrollmentId, submittedAt: { not: null } },
        });
        const progressPercent = Math.round((answered / totalQ) * 100);
        const nextIndex = Math.min(qIndex + 1, totalQ);

        const totalDur =
          (enrollment.totalDurationSeconds || 0) + (duration || 0);

        await prisma.aiMockInterviewEnrollment.update({
          where: { id: enrollmentId },
          data: {
            currentQuestionIndex: nextIndex,
            progressPercent,
            totalDurationSeconds: totalDur,
            status: 'IN_PROGRESS',
          },
        });

        res.status(201).json({ success: true, answerId: answer.id, progressPercent, nextIndex });
      } catch (e) {
        console.error('submitAiInterviewAnswer upload:', e);
        res.status(500).json({ error: 'Failed to save answer' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
}

export async function completeAiInterview(req, res) {
  try {
    const { enrollmentId } = req.params;
    const access = await assertEnrollmentAccess(enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });

    const { enrollment } = access;
    const mandatory = enrollment.interview.questions.filter((q) => q.mandatory);
    const submitted = await prisma.aiMockInterviewAnswer.findMany({
      where: { enrollmentId, submittedAt: { not: null } },
    });
    const submittedSet = new Set(submitted.map((a) => a.questionId));
    const missing = mandatory.filter((q) => !submittedSet.has(q.id));
    if (missing.length) {
      return res.status(400).json({
        error: 'Mandatory questions not submitted',
        missing: missing.map((q) => q.id),
      });
    }

    await prisma.aiMockInterviewEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progressPercent: 100,
      },
    });

    await prisma.aiMockInterviewAiInsight.upsert({
      where: { enrollmentId },
      create: { enrollmentId, status: 'PENDING' },
      update: { status: 'PENDING' },
    });

    res.json({ success: true });

    setImmediate(async () => {
      try {
        const full = await prisma.aiMockInterviewEnrollment.findUnique({
          where: { id: enrollmentId },
          include: {
            interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
            answers: true,
          },
        });
        const insights = await generateAiInterviewInsights({
          interviewTitle: full.interview.title,
          interviewType: full.interview.interviewType,
          questions: full.interview.questions,
          answers: full.answers,
          violationsCount: full.violationsCount,
        });
        await prisma.aiMockInterviewAiInsight.update({
          where: { enrollmentId },
          data: { ...insights, status: 'COMPLETED' },
        });
      } catch (err) {
        console.error('AI insight generation failed:', err.message);
        await prisma.aiMockInterviewAiInsight.update({
          where: { enrollmentId },
          data: { status: 'FAILED' },
        }).catch(() => {});
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete interview' });
  }
}

export async function logAiInterviewViolation(req, res) {
  try {
    const { enrollmentId } = req.params;
    const { type, details, meta } = req.body;
    const access = await assertEnrollmentAccess(enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });

    await prisma.aiMockInterviewViolation.create({
      data: {
        enrollmentId,
        type: String(type || 'UNKNOWN').slice(0, 64),
        details: details || null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });

    const count = await prisma.aiMockInterviewViolation.count({ where: { enrollmentId } });
    await prisma.aiMockInterviewEnrollment.update({
      where: { id: enrollmentId },
      data: {
        violationsCount: count,
        riskLevel: computeRiskLevel(count),
      },
    });

    res.json({ success: true, violationsCount: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log violation' });
  }
}

export async function uploadAiInterviewScreenshot(req, res) {
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

      const row = await prisma.aiMockInterviewScreenshot.create({
        data: {
          enrollmentId,
          imageUrl: uploaded.url,
          publicId: uploaded.public_id,
          captureType: req.body?.captureType === 'EVENT' ? 'EVENT' : 'PERIODIC',
          event: req.body?.event || null,
          riskFlag: req.body?.riskFlag === 'true' || req.body?.riskFlag === true,
          faceCount: req.body?.faceCount ? Number(req.body.faceCount) : null,
        },
      });

      res.status(201).json(row);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
}

export async function regenerateAiInsights(req, res) {
  try {
    const { enrollmentId } = req.params;
    const access = await assertEnrollmentAccess(enrollmentId, req);
    if (access.error) return res.status(access.status).json({ error: access.error });
    if (!access.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const full = await prisma.aiMockInterviewEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
        answers: true,
      },
    });

    const insights = await generateAiInterviewInsights({
      interviewTitle: full.interview.title,
      interviewType: full.interview.interviewType,
      questions: full.interview.questions,
      answers: full.answers,
      violationsCount: full.violationsCount,
    });

    const saved = await prisma.aiMockInterviewAiInsight.upsert({
      where: { enrollmentId },
      create: { enrollmentId, ...insights, status: 'COMPLETED' },
      update: { ...insights, status: 'COMPLETED' },
    });

    res.json(saved);
  } catch (error) {
    console.error('regenerateAiInsights:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
}
