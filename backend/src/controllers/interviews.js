/**
 * Interview Session Controller
 * Handles interview session management, rounds, evaluations, and activities
 */

import prisma from '../config/database.js';

/**
 * Start or resume an interview session for a job
 * POST /api/admin/interview/:jobId/start
 */
export const startInterviewSession = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if interview session already exists
    let interview = await prisma.interview.findUnique({
      where: { jobId },
    });

    if (interview) {
      // Resume existing session
      return res.json({
        message: 'Interview session resumed',
        interview: {
          id: interview.id,
          jobId: interview.jobId,
          status: interview.status,
          currentRound: interview.currentRound,
          rounds: JSON.parse(interview.rounds || '[]'),
          totalCandidates: interview.totalCandidates,
          doneCandidates: interview.doneCandidates,
          pendingCandidates: interview.pendingCandidates,
          selectedCandidates: interview.selectedCandidates,
          onHoldCandidates: interview.onHoldCandidates,
          startedAt: interview.startedAt,
          job: {
            jobTitle: job.jobTitle,
            company: job.company ? { name: job.company.name } : null,
          },
        },
      });
    }

    // Get all applications for this job
    const applications = await prisma.application.findMany({
      where: { jobId },
      include: { student: true },
    });

    // Create default rounds
    const defaultRounds = [
      { name: 'Technical Round 1', criteria: 'Technical skills assessment', status: 'pending' },
      { name: 'Technical Round 2', criteria: 'Advanced technical evaluation', status: 'pending' },
      { name: 'HR Round', criteria: 'Cultural fit and communication', status: 'pending' },
    ];

    // Create new interview session
    interview = await prisma.interview.create({
      data: {
        jobId,
        companyId: job.companyId,
        status: 'ONGOING',
        currentRound: defaultRounds[0]?.name,
        rounds: JSON.stringify(defaultRounds),
        totalCandidates: applications.length,
        pendingCandidates: applications.length,
        doneCandidates: 0,
        selectedCandidates: 0,
        onHoldCandidates: 0,
      },
    });

    // Log activity
    await prisma.interviewActivity.create({
      data: {
        interviewId: interview.id,
        activityType: 'SESSION_STARTED',
        message: `Interview session started for ${job.jobTitle}`,
        performedBy: userId,
      },
    });

    res.json({
      message: 'Interview session started successfully',
      interview: {
        id: interview.id,
        jobId: interview.jobId,
        status: interview.status,
        currentRound: interview.currentRound,
        rounds: defaultRounds,
        totalCandidates: interview.totalCandidates,
        doneCandidates: interview.doneCandidates,
        pendingCandidates: interview.pendingCandidates,
        selectedCandidates: interview.selectedCandidates,
        onHoldCandidates: interview.onHoldCandidates,
        startedAt: interview.startedAt,
        job: {
          jobTitle: job.jobTitle,
          company: job.company ? { name: job.company.name } : null,
        },
      },
    });
  } catch (error) {
    console.error('Error starting interview session:', error);
    res.status(500).json({ error: 'Failed to start interview session', details: error.message });
  }
};

/**
 * Get interview session details
 * GET /api/admin/interview/:interviewId
 */
export const getInterviewSession = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const rounds = JSON.parse(interview.rounds || '[]');

    res.json({
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
      completedAt: interview.completedAt,
      job: {
        jobTitle: interview.job.jobTitle,
        company: interview.job.company ? { name: interview.job.company.name } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching interview session:', error);
    res.status(500).json({ error: 'Failed to fetch interview session', details: error.message });
  }
};

/**
 * Update interview round (name, criteria, or create new)
 * PATCH /api/admin/interview/:interviewId/round
 */
export const updateInterviewRound = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { roundName, newRoundName, criteria, action } = req.body;

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    let rounds = JSON.parse(interview.rounds || '[]');

    if (action === 'create') {
      // Create new round
      if (!newRoundName) {
        return res.status(400).json({ error: 'Round name is required' });
      }
      rounds.push({
        name: newRoundName,
        criteria: criteria || '',
        status: 'pending',
      });
    } else if (action === 'update') {
      // Update existing round
      const roundIndex = rounds.findIndex((r) => r.name === roundName);
      if (roundIndex === -1) {
        return res.status(404).json({ error: 'Round not found' });
      }
      if (newRoundName) {
        rounds[roundIndex].name = newRoundName;
      }
      if (criteria !== undefined) {
        rounds[roundIndex].criteria = criteria;
      }
    }

    await prisma.interview.update({
      where: { id: interviewId },
      data: { rounds: JSON.stringify(rounds) },
    });

    res.json({
      message: action === 'create' ? 'Round created successfully' : 'Round updated successfully',
      rounds,
    });
  } catch (error) {
    console.error('Error updating interview round:', error);
    res.status(500).json({ error: 'Failed to update interview round', details: error.message });
  }
};

/**
 * Start assessment for a specific round
 * POST /api/admin/interview/:interviewId/round/:roundName/start
 */
export const startAssessment = async (req, res) => {
  try {
    const { interviewId, roundName } = req.params;
    const userId = req.user.id;

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    let rounds = JSON.parse(interview.rounds || '[]');
    const roundIndex = rounds.findIndex((r) => r.name === roundName);

    if (roundIndex === -1) {
      return res.status(404).json({ error: 'Round not found' });
    }

    rounds[roundIndex].status = 'ongoing';

    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        currentRound: roundName,
        rounds: JSON.stringify(rounds),
      },
    });

    // Log activity
    await prisma.interviewActivity.create({
      data: {
        interviewId,
        roundName,
        activityType: 'ROUND_STARTED',
        message: `Assessment started for ${roundName}`,
        performedBy: userId,
      },
    });

    res.json({
      message: 'Assessment started successfully',
      round: rounds[roundIndex],
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ error: 'Failed to start assessment', details: error.message });
  }
};

/**
 * Get candidates for a specific round
 * GET /api/admin/interview/:interviewId/round/:roundName/candidates
 */
export const getRoundCandidates = async (req, res) => {
  try {
    const { interviewId, roundName } = req.params;

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { job: true },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const rounds = JSON.parse(interview.rounds || '[]');
    const currentRoundIndex = rounds.findIndex((r) => r.name === roundName);

    if (currentRoundIndex === -1) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Get all applications for this job
    let applications = await prisma.application.findMany({
      where: { jobId: interview.jobId },
      include: {
        student: {
          include: { user: true },
        },
      },
    });

    // For rounds after the first, only show selected candidates from previous rounds
    if (currentRoundIndex > 0) {
      const previousRoundNames = rounds.slice(0, currentRoundIndex).map((r) => r.name);
      
      // Get evaluations for previous rounds
      const previousEvaluations = await prisma.interviewEvaluation.findMany({
        where: {
          interviewId,
          roundName: { in: previousRoundNames },
          status: 'SELECTED',
        },
        select: { studentId: true },
      });

      const selectedStudentIds = new Set(previousEvaluations.map((e) => e.studentId));
      applications = applications.filter((app) => selectedStudentIds.has(app.studentId));
    }

    // Get evaluations for current round
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: {
        interviewId,
        roundName,
      },
    });

    const evaluationMap = new Map(evaluations.map((e) => [e.studentId, e]));

    // Format candidates with evaluation data
    const candidates = applications.map((app) => {
      const evaluation = evaluationMap.get(app.studentId);
      return {
        student: {
          id: app.student.id,
          fullName: app.student.fullName,
          batch: app.student.batch,
          email: app.student.email,
          enrollmentId: app.student.enrollmentId,
        },
        marks: evaluation?.marks || null,
        remarks: evaluation?.remarks || null,
        status: evaluation?.status || null,
        evaluatedAt: evaluation?.evaluatedAt || null,
      };
    });

    res.json({ candidates });
  } catch (error) {
    console.error('Error fetching round candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates', details: error.message });
  }
};

/**
 * Evaluate a candidate
 * PATCH /api/admin/interview/:interviewId/candidate/:studentId/evaluate
 */
export const evaluateCandidate = async (req, res) => {
  try {
    const { interviewId, studentId } = req.params;
    const { roundName, marks, remarks, status } = req.body;
    const userId = req.user.id;

    if (!roundName) {
      return res.status(400).json({ error: 'Round name is required' });
    }

    // Upsert evaluation
    const evaluation = await prisma.interviewEvaluation.upsert({
      where: {
        interviewId_studentId_roundName: {
          interviewId,
          studentId,
          roundName,
        },
      },
      update: {
        marks: marks !== undefined ? parseFloat(marks) : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
        status: status || undefined,
        evaluatedBy: userId,
        evaluatedAt: new Date(),
      },
      create: {
        interviewId,
        studentId,
        roundName,
        marks: marks !== undefined ? parseFloat(marks) : undefined,
        remarks: remarks || null,
        status: status || null,
        evaluatedBy: userId,
      },
    });

    // Update interview statistics
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    const evaluations = await prisma.interviewEvaluation.findMany({
      where: { interviewId, roundName },
    });

    const doneCount = evaluations.filter((e) => e.marks !== null || e.status).length;
    const selectedCount = evaluations.filter((e) => e.status === 'SELECTED').length;
    const onHoldCount = evaluations.filter((e) => e.status === 'ON_HOLD').length;

    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        doneCandidates: doneCount,
        selectedCandidates: selectedCount,
        onHoldCandidates: onHoldCount,
        pendingCandidates: interview.totalCandidates - doneCount,
      },
    });

    // Log activity
    await prisma.interviewActivity.create({
      data: {
        interviewId,
        studentId,
        roundName,
        activityType: 'EVALUATION',
        message: `Candidate ${status || 'evaluated'} in ${roundName}`,
        performedBy: userId,
      },
    });

    res.json({
      message: 'Evaluation saved successfully',
      evaluation,
    });
  } catch (error) {
    console.error('Error evaluating candidate:', error);
    res.status(500).json({ error: 'Failed to save evaluation', details: error.message });
  }
};

/**
 * Get interview activities (live feed)
 * GET /api/admin/interview/:interviewId/activities
 */
export const getInterviewActivities = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const activities = await prisma.interviewActivity.findMany({
      where: { interviewId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching interview activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities', details: error.message });
  }
};

/**
 * End interview session
 * POST /api/admin/interview/:interviewId/end
 */
export const endInterviewSession = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Update current round status
    let rounds = JSON.parse(interview.rounds || '[]');
    const currentRoundIndex = rounds.findIndex((r) => r.name === interview.currentRound);
    if (currentRoundIndex !== -1) {
      rounds[currentRoundIndex].status = 'completed';
    }

    // Update interview status
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        rounds: JSON.stringify(rounds),
      },
    });

    // Log activity
    await prisma.interviewActivity.create({
      data: {
        interviewId,
        activityType: 'SESSION_ENDED',
        message: 'Interview session ended',
        performedBy: userId,
      },
    });

    // Get final summary
    const finalEvaluations = await prisma.interviewEvaluation.findMany({
      where: { interviewId },
      include: { student: true },
    });

    const summary = {
      totalCandidates: interview.totalCandidates,
      doneCandidates: interview.doneCandidates,
      selectedCandidates: interview.selectedCandidates,
      onHoldCandidates: interview.onHoldCandidates,
      rejectedCandidates: interview.totalCandidates - interview.selectedCandidates - interview.onHoldCandidates,
      roundsCompleted: rounds.filter((r) => r.status === 'completed').length,
      totalRounds: rounds.length,
    };

    res.json({
      message: 'Interview session ended successfully',
      summary,
    });
  } catch (error) {
    console.error('Error ending interview session:', error);
    res.status(500).json({ error: 'Failed to end interview session', details: error.message });
  }
};


