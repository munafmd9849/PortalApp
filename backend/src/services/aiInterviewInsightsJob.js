import prisma from '../config/database.js';
import { generateAiInterviewInsights } from './aiMockInterviewMistral.js';

const MAX_RETRIES = 3;
const inFlight = new Set();

async function loadEnrollmentForInsights(enrollmentId) {
  return prisma.aiMockInterviewEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      interview: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      answers: true,
    },
  });
}

/**
 * Run insight generation with retries. Updates aiInsight status to COMPLETED or FAILED.
 */
export async function runAiInterviewInsightsJob(enrollmentId, attempt = 0) {
  if (inFlight.has(enrollmentId)) return;
  inFlight.add(enrollmentId);

  try {
    const full = await loadEnrollmentForInsights(enrollmentId);
    if (!full) return;
    if (full.status !== 'COMPLETED') return;

    const insights = await generateAiInterviewInsights({
      interviewTitle: full.interview.title,
      interviewType: full.interview.interviewType,
      sessionMode: full.interview.sessionMode,
      questions: full.interview.questions,
      answers: full.answers,
      violationsCount: full.violationsCount,
    });

    await prisma.aiMockInterviewAiInsight.update({
      where: { enrollmentId },
      data: { ...insights, status: 'COMPLETED' },
    });
  } catch (err) {
    console.error(`[ai-insights] enrollment ${enrollmentId} attempt ${attempt + 1}:`, err.message);
    if (attempt + 1 < MAX_RETRIES) {
      inFlight.delete(enrollmentId);
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      return runAiInterviewInsightsJob(enrollmentId, attempt + 1);
    }
    await prisma.aiMockInterviewAiInsight
      .update({
        where: { enrollmentId },
        data: { status: 'FAILED' },
      })
      .catch(() => {});
  } finally {
    inFlight.delete(enrollmentId);
  }
}

/**
 * Mark insight row PENDING and enqueue async generation (used after interview completion).
 */
export async function scheduleAiInterviewInsights(enrollmentId) {
  await prisma.aiMockInterviewAiInsight.upsert({
    where: { enrollmentId },
    create: { enrollmentId, status: 'PENDING' },
    update: { status: 'PENDING' },
  });
  setImmediate(() => runAiInterviewInsightsJob(enrollmentId));
}

/**
 * Synchronous generation for admin regenerate (with retries, blocks until done).
 */
export async function regenerateAiInterviewInsightsSync(enrollmentId) {
  await prisma.aiMockInterviewAiInsight.upsert({
    where: { enrollmentId },
    create: { enrollmentId, status: 'PENDING' },
    update: { status: 'PENDING' },
  });

  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const full = await loadEnrollmentForInsights(enrollmentId);
      if (!full) throw new Error('Enrollment not found');

      const insights = await generateAiInterviewInsights({
        interviewTitle: full.interview.title,
        interviewType: full.interview.interviewType,
        sessionMode: full.interview.sessionMode,
        questions: full.interview.questions,
        answers: full.answers,
        violationsCount: full.violationsCount,
      });

      const row = await prisma.aiMockInterviewAiInsight.update({
        where: { enrollmentId },
        data: { ...insights, status: 'COMPLETED' },
      });
      return row;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }

  await prisma.aiMockInterviewAiInsight.update({
    where: { enrollmentId },
    data: { status: 'FAILED' },
  });
  throw lastError || new Error('AI insight generation failed');
}
