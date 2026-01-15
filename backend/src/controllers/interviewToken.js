/**
 * Token-Based Interview Controller
 * Handles interview session access via session tokens (no login required)
 */

import prisma from '../config/database.js';

/**
 * Get session info by token
 * GET /api/interview/session/:token
 */
export const getSessionByToken = async (req, res) => {
  try {
    const interview = req.sessionInterview;
    const rounds = JSON.parse(interview.rounds || '[]');

    // Get all candidates for the current round (if any)
    let candidates = [];
    if (interview.currentRound) {
      candidates = await getCandidatesForRound(interview.id, interview.currentRound, rounds);
    }

    // Get recent activities
    const activities = await prisma.interviewActivity.findMany({
      where: { interviewId: interview.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      session: {
        id: interview.id,
        jobId: interview.jobId,
        status: interview.status,
        currentRound: interview.currentRound,
        rounds,
        totalCandidates: interview.totalCandidates,
        doneCandidates: interview.doneCandidates,
        pendingCandidates: interview.pendingCandidates,
        selectedCandidates: interview.selectedCandidates,
        onHoldCandidates: interview.onHoldCandidates,
        startedAt: interview.startedAt,
        job: {
          jobTitle: interview.job.jobTitle,
          company: interview.job.company ? { name: interview.job.company.name } : null,
        },
      },
      candidates,
      activities: activities.map(activity => ({
        id: activity.id,
        type: activity.activityType,
        message: activity.message,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        createdAt: activity.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error getting session by token:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
};

/**
 * Start a round
 * POST /api/interview/session/:token/round/:roundName/start
 */
export const startRoundByToken = async (req, res) => {
  try {
    const interview = req.sessionInterview;
    const { roundName } = req.params;

    const rounds = JSON.parse(interview.rounds || '[]');
    const round = rounds.find(r => r.name === roundName);

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (round.status === 'ongoing') {
      return res.status(400).json({ error: 'Round is already ongoing' });
    }

    // Check if another round is ongoing
    const ongoingRound = rounds.find(r => r.status === 'ongoing');
    if (ongoingRound && ongoingRound.name !== roundName) {
      return res.status(400).json({ 
        error: `Cannot start ${roundName}. ${ongoingRound.name} is currently ongoing.` 
      });
    }

    // Check sequential progression
    const roundIndex = rounds.findIndex(r => r.name === roundName);
    if (roundIndex > 0) {
      const previousRound = rounds[roundIndex - 1];
      if (previousRound.status !== 'completed') {
        return res.status(400).json({ 
          error: 'Previous round must be completed before starting this round' 
        });
      }
    }

    // Update round status
    round.status = 'ongoing';
    rounds[roundIndex] = round;

    // Update interview
    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        currentRound: roundName,
        rounds: JSON.stringify(rounds),
      },
    });

    // Log activity
    await prisma.interviewActivity.create({
      data: {
        interviewId: interview.id,
        activityType: 'ROUND_STARTED',
        message: `${roundName} started`,
        metadata: JSON.stringify({ roundName, order: round.order }),
      },
    });

    res.json({
      message: `${roundName} started successfully`,
      round: {
        name: roundName,
        status: 'ongoing',
      },
    });
  } catch (error) {
    console.error('Error starting round:', error);
    res.status(500).json({ error: 'Failed to start round' });
  }
};

/**
 * End a round
 * POST /api/interview/session/:token/round/:roundName/end
 */
export const endRoundByToken = async (req, res) => {
  try {
    const interview = req.sessionInterview;
    const { roundName } = req.params;

    const rounds = JSON.parse(interview.rounds || '[]');
    const round = rounds.find(r => r.name === roundName);

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (round.status !== 'ongoing') {
      return res.status(400).json({ error: 'Round is not ongoing' });
    }

    // Mark round as completed
    const roundIndex = rounds.findIndex(r => r.name === roundName);
    round.status = 'completed';
    rounds[roundIndex] = round;

    // Auto-progress candidates: Only SELECTED candidates move to next round
    const selectedCandidates = await prisma.interviewEvaluation.findMany({
      where: {
        interviewId: interview.id,
        roundName: roundName,
        status: 'SELECTED',
      },
      select: { studentId: true },
    });

    // Update interview
    const nextRoundIndex = roundIndex + 1;
    const hasNextRound = nextRoundIndex < rounds.length;

    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        currentRound: hasNextRound ? rounds[nextRoundIndex].name : null,
        rounds: JSON.stringify(rounds),
      },
    });

    // Log activity
    await prisma.interviewActivity.create({
      data: {
        interviewId: interview.id,
        activityType: 'ROUND_ENDED',
        message: `${roundName} completed. ${selectedCandidates.length} candidates selected for next round.`,
        metadata: JSON.stringify({ 
          roundName, 
          selectedCount: selectedCandidates.length,
          hasNextRound,
        }),
      },
    });

    res.json({
      message: `${roundName} ended successfully`,
      selectedCount: selectedCandidates.length,
      hasNextRound,
      nextRound: hasNextRound ? rounds[nextRoundIndex].name : null,
    });
  } catch (error) {
    console.error('Error ending round:', error);
    res.status(500).json({ error: 'Failed to end round' });
  }
};

/**
 * Get candidates for a round
 * GET /api/interview/session/:token/round/:roundName/candidates
 */
export const getCandidatesByToken = async (req, res) => {
  try {
    const interview = req.sessionInterview;
    const { roundName } = req.params;

    const rounds = JSON.parse(interview.rounds || '[]');
    const candidates = await getCandidatesForRound(interview.id, roundName, rounds);

    res.json({
      roundName,
      candidates,
      count: candidates.length,
    });
  } catch (error) {
    console.error('Error getting candidates:', error);
    res.status(500).json({ error: 'Failed to get candidates' });
  }
};

/**
 * Evaluate a candidate (with atomic update)
 * PATCH /api/interview/session/:token/candidate/:studentId
 */
export const evaluateCandidateByToken = async (req, res) => {
  try {
    const interview = req.sessionInterview;
    const { studentId } = req.params;
    const { marks, remarks, status, evaluator } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    if ((status === 'REJECTED' || status === 'ON_HOLD') && !remarks) {
      return res.status(400).json({ error: 'Remarks are required for REJECTED or ON_HOLD status' });
    }

    if (marks !== undefined && (marks < 0 || marks > 100)) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' });
    }

    const currentRound = interview.currentRound;
    if (!currentRound) {
      return res.status(400).json({ error: 'No round is currently active' });
    }

    // Use transaction for atomic update
    const result = await prisma.$transaction(async (tx) => {
      // Upsert evaluation (atomic)
      const evaluation = await tx.interviewEvaluation.upsert({
        where: {
          interviewId_studentId_roundName: {
            interviewId: interview.id,
            studentId,
            roundName: currentRound,
          },
        },
        update: {
          marks: marks !== undefined ? parseFloat(marks) : null,
          remarks: remarks || null,
          status,
          evaluatedAt: new Date(),
        },
        create: {
          interviewId: interview.id,
          studentId,
          roundName: currentRound,
          marks: marks !== undefined ? parseFloat(marks) : null,
          remarks: remarks || null,
          status,
          evaluatedAt: new Date(),
        },
      });

      // Recalculate statistics for current round
      const roundEvaluations = await tx.interviewEvaluation.findMany({
        where: {
          interviewId: interview.id,
          roundName: currentRound,
        },
      });

      const stats = {
        done: roundEvaluations.filter(e => e.status !== 'PENDING').length,
        selected: roundEvaluations.filter(e => e.status === 'SELECTED').length,
        rejected: roundEvaluations.filter(e => e.status === 'REJECTED').length,
        onHold: roundEvaluations.filter(e => e.status === 'ON_HOLD').length,
        pending: roundEvaluations.filter(e => e.status === 'PENDING').length,
      };

      // Update interview statistics
      await tx.interview.update({
        where: { id: interview.id },
        data: {
          doneCandidates: stats.done,
          selectedCandidates: stats.selected,
          onHoldCandidates: stats.onHold,
          pendingCandidates: stats.pending,
        },
      });

      // Log activity
      await tx.interviewActivity.create({
        data: {
          interviewId: interview.id,
          studentId,
          roundName: currentRound,
          activityType: 'EVALUATION',
          message: `Candidate evaluated: ${status}`,
          metadata: JSON.stringify({ 
            studentId, 
            roundName: currentRound, 
            status, 
            marks,
            evaluator,
          }),
        },
      });

      return { evaluation, stats };
    });

    res.json({
      message: 'Evaluation saved successfully',
      evaluation: result.evaluation,
      stats: result.stats,
    });
  } catch (error) {
    console.error('Error evaluating candidate:', error);
    res.status(500).json({ error: 'Failed to evaluate candidate' });
  }
};

/**
 * Get activity feed
 * GET /api/interview/session/:token/activities
 */
export const getActivitiesByToken = async (req, res) => {
  try {
    const interview = req.sessionInterview;
    const limit = parseInt(req.query.limit) || 50;

    const activities = await prisma.interviewActivity.findMany({
      where: { interviewId: interview.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      activities: activities.map(activity => ({
        id: activity.id,
        type: activity.activityType,
        message: activity.message,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        createdAt: activity.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error getting activities:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
};

/**
 * Helper: Get candidates for a round with automatic filtering
 */
async function getCandidatesForRound(interviewId, roundName, rounds) {
  const roundIndex = rounds.findIndex(r => r.name === roundName);
  
  if (roundIndex === 0) {
    // First round: Get all applicants
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    const applications = await prisma.application.findMany({
      where: { jobId: interview.jobId },
      include: {
        student: {
          include: {
            user: {
              select: {
                displayName: true,
                email: true,
                profilePhoto: true,
              },
            },
            resumeFiles: {
              where: { isDefault: true },
              select: {
                fileUrl: true,
                fileName: true,
                isDefault: true
              },
              take: 1
            },
            education: {
              orderBy: { endYear: 'desc' },
            },
            skills: true,
            projects: {
              orderBy: { createdAt: 'desc' },
            },
            achievements: {
              orderBy: { createdAt: 'desc' },
            },
            experiences: {
              orderBy: { start: 'desc' },
            },
            certifications: {
              orderBy: { issuedDate: 'desc' },
            },
          },
        },
      },
    });

    // Get existing evaluations for this round
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: {
        interviewId,
        roundName,
      },
    });

    return applications.map(app => {
      const evaluation = evaluations.find(e => e.studentId === app.studentId);
      return {
        studentId: app.studentId,
        student: {
          id: app.student.id,
          userId: app.student.userId,
          fullName: app.student.fullName,
          email: app.student.email,
          phone: app.student.phone,
          enrollmentId: app.student.enrollmentId,
          batch: app.student.batch,
          school: app.student.school,
          center: app.student.center,
          cgpa: app.student.cgpa,
          bio: app.student.bio,
          headline: app.student.headline,
          resumeUrl: app.student.resumeFiles?.[0]?.fileUrl || app.student.resumeUrl, // Use new Cloudinary URL if available, fallback to old
          resumeFileName: app.student.resumeFiles?.[0]?.fileName || app.student.resumeFileName,
          linkedin: app.student.linkedin,
          githubUrl: app.student.githubUrl,
          profilePhoto: app.student.user?.profilePhoto,
          skills: app.student.skills || [],
          education: app.student.education || [],
          projects: app.student.projects || [],
          achievements: app.student.achievements || [],
          experiences: app.student.experiences || [],
          certifications: app.student.certifications || [],
        },
        name: app.student.user?.displayName || app.student.fullName,
        email: app.student.email,
        enrollmentId: app.student.enrollmentId,
        batch: app.student.batch,
        skills: app.student.skills?.map(s => s.name) || [],
        cgpa: app.student.education?.[0]?.cgpa || app.student.cgpa || null,
        evaluation: evaluation ? {
          marks: evaluation.marks,
          remarks: evaluation.remarks,
          status: evaluation.status || 'PENDING',
        } : {
          marks: null,
          remarks: null,
          status: 'PENDING',
        },
      };
    });
  } else {
    // Subsequent rounds: Only SELECTED candidates from previous round
    const previousRound = rounds[roundIndex - 1];
    const selectedEvaluations = await prisma.interviewEvaluation.findMany({
      where: {
        interviewId,
        roundName: previousRound.name,
        status: 'SELECTED',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                displayName: true,
                email: true,
                profilePhoto: true,
              },
            },
            resumeFiles: {
              where: { isDefault: true },
              select: {
                fileUrl: true,
                fileName: true,
                isDefault: true
              },
              take: 1
            },
            education: {
              orderBy: { endYear: 'desc' },
            },
            skills: true,
            projects: {
              orderBy: { createdAt: 'desc' },
            },
            achievements: {
              orderBy: { createdAt: 'desc' },
            },
            experiences: {
              orderBy: { start: 'desc' },
            },
            certifications: {
              orderBy: { issuedDate: 'desc' },
            },
          },
        },
      },
    });

    // Get existing evaluations for current round
    const currentEvaluations = await prisma.interviewEvaluation.findMany({
      where: {
        interviewId,
        roundName,
      },
    });

    return selectedEvaluations.map(evaluation => {
      const currentEval = currentEvaluations.find(e => e.studentId === evaluation.studentId);
      return {
        studentId: evaluation.studentId,
        student: {
          id: evaluation.student.id,
          userId: evaluation.student.userId,
          fullName: evaluation.student.fullName,
          email: evaluation.student.email,
          phone: evaluation.student.phone,
          enrollmentId: evaluation.student.enrollmentId,
          batch: evaluation.student.batch,
          school: evaluation.student.school,
          center: evaluation.student.center,
          cgpa: evaluation.student.cgpa,
          bio: evaluation.student.bio,
          headline: evaluation.student.headline,
          resumeUrl: evaluation.student.resumeFiles?.[0]?.fileUrl || evaluation.student.resumeUrl, // Use new Cloudinary URL if available, fallback to old
          resumeFileName: evaluation.student.resumeFiles?.[0]?.fileName || evaluation.student.resumeFileName,
          linkedin: evaluation.student.linkedin,
          githubUrl: evaluation.student.githubUrl,
          profilePhoto: evaluation.student.user?.profilePhoto,
          skills: evaluation.student.skills || [],
          education: evaluation.student.education || [],
          projects: evaluation.student.projects || [],
          achievements: evaluation.student.achievements || [],
          experiences: evaluation.student.experiences || [],
          certifications: evaluation.student.certifications || [],
        },
        name: evaluation.student.user?.displayName || evaluation.student.fullName,
        email: evaluation.student.email,
        enrollmentId: evaluation.student.enrollmentId,
        batch: evaluation.student.batch,
        skills: evaluation.student.skills?.map(s => s.name) || [],
        cgpa: evaluation.student.education?.[0]?.cgpa || evaluation.student.cgpa || null,
        evaluation: currentEval ? {
          marks: currentEval.marks,
          remarks: currentEval.remarks,
          status: currentEval.status || 'PENDING',
        } : {
          marks: null,
          remarks: null,
          status: 'PENDING',
        },
      };
    });
  }
}

