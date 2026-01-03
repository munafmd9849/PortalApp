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

    // Create default rounds with order field
    const defaultRounds = [
      { name: 'Technical Round 1', status: 'pending', order: 1 },
      { name: 'Technical Round 2', status: 'pending', order: 2 },
      { name: 'HR Round', status: 'pending', order: 3 },
    ];

    // Create new interview session
    interview = await prisma.interview.create({
      data: {
        jobId,
        companyId: job.companyId,
        status: 'ONGOING',
        currentRound: null, // No round started initially
        rounds: JSON.stringify(defaultRounds),
        totalCandidates: applications.length,
        pendingCandidates: applications.length,
        doneCandidates: 0,
        selectedCandidates: 0,
        onHoldCandidates: 0,
        createdBy: userId,
      },
    });

    // Log activity
    await prisma.interviewActivity.create({
      data: {
        interviewId: interview.id,
        activityType: 'SESSION_STARTED',
        message: `Interview session started for ${job.jobTitle}`,
        metadata: JSON.stringify({ jobId, jobTitle: job.jobTitle, totalCandidates: applications.length }),
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
      
      // Check if round name already exists
      if (rounds.some(r => r.name === newRoundName)) {
        return res.status(400).json({ error: 'Round name already exists' });
      }
      
      // Get next order number
      const maxOrder = rounds.length > 0 ? Math.max(...rounds.map(r => r.order || 0)) : 0;
      
      rounds.push({
        name: newRoundName,
        status: 'pending',
        order: maxOrder + 1,
      });
      
      // Sort rounds by order
      rounds.sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (action === 'update') {
      // Update existing round
      const roundIndex = rounds.findIndex((r) => r.name === roundName);
      if (roundIndex === -1) {
        return res.status(404).json({ error: 'Round not found' });
      }
      
      // Cannot edit completed rounds
      if (rounds[roundIndex].status === 'completed') {
        return res.status(400).json({ error: 'Cannot edit a completed round' });
      }
      
      // Cannot edit ongoing round name (only status changes allowed)
      if (rounds[roundIndex].status === 'ongoing' && newRoundName && newRoundName !== roundName) {
        return res.status(400).json({ error: 'Cannot rename an ongoing round' });
      }
      
      if (newRoundName && newRoundName !== roundName) {
        // Check if new name already exists
        if (rounds.some(r => r.name === newRoundName && r.name !== roundName)) {
          return res.status(400).json({ error: 'Round name already exists' });
        }
        rounds[roundIndex].name = newRoundName;
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

    // Validate interview status
    if (interview.status !== 'ONGOING') {
      return res.status(400).json({ error: 'Interview session is not ongoing' });
    }

    let rounds = JSON.parse(interview.rounds || '[]');
    const roundIndex = rounds.findIndex((r) => r.name === roundName);

    if (roundIndex === -1) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Check if another round is ongoing
    const ongoingRound = rounds.find((r) => r.status === 'ongoing');
    if (ongoingRound && ongoingRound.name !== roundName) {
      return res.status(400).json({ 
        error: `Cannot start ${roundName}. ${ongoingRound.name} is currently ongoing.` 
      });
    }

    // Cannot start completed rounds
    if (rounds[roundIndex].status === 'completed') {
      return res.status(400).json({ error: 'Cannot start a completed round' });
    }

    // Set selected round to ongoing, mark others as not ongoing
    rounds = rounds.map((r, idx) => ({
      ...r,
      status: idx === roundIndex ? 'ongoing' : (r.status === 'ongoing' ? 'pending' : r.status),
    }));

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
        metadata: JSON.stringify({ roundName, roundOrder: rounds[roundIndex].order }),
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

    // For rounds after the first, only show SELECTED candidates from previous round
    // Backend-enforced filtering - critical for data consistency
    if (currentRoundIndex > 0) {
      // Get the immediate previous round (not all previous rounds)
      const previousRound = rounds[currentRoundIndex - 1];
      
      // Validate round order - ensure we're not skipping rounds
      // Check if previous round is completed or ongoing
      if (previousRound.status !== 'completed' && previousRound.status !== 'ongoing') {
        return res.status(400).json({ 
          error: `Previous round "${previousRound.name}" must be completed before starting this round` 
        });
      }
      
      // Get evaluations for the immediate previous round with status = SELECTED
      const previousEvaluations = await prisma.interviewEvaluation.findMany({
        where: {
          interviewId,
          roundName: previousRound.name,
          status: 'SELECTED', // Only SELECTED candidates proceed
        },
        select: { studentId: true },
      });

      const selectedStudentIds = new Set(previousEvaluations.map((e) => e.studentId));
      
      // Filter applications to only include selected candidates
      applications = applications.filter((app) => selectedStudentIds.has(app.studentId));
      
      // REJECTED candidates never appear again (enforced)
      // ON_HOLD candidates only appear if explicitly selected later (not in this flow)
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
        evaluation: evaluation ? {
          marks: evaluation.marks,
          remarks: evaluation.remarks,
          status: evaluation.status,
          evaluatedAt: evaluation.evaluatedAt,
        } : null,
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

    // Validate status
    const validStatuses = ['SELECTED', 'REJECTED', 'ON_HOLD', 'PENDING'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Validate remarks for REJECTED or ON_HOLD (required)
    if ((status === 'REJECTED' || status === 'ON_HOLD') && (!remarks || remarks.trim().length === 0)) {
      return res.status(400).json({ error: 'Remarks are required for REJECTED or ON_HOLD status' });
    }

    // Validate marks range if provided
    if (marks !== undefined && marks !== null) {
      const marksNum = parseFloat(marks);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
        return res.status(400).json({ error: 'Marks must be a number between 0 and 100' });
      }
    }

    // Upsert evaluation using composite unique key
    const evaluation = await prisma.interviewEvaluation.upsert({
      where: {
        interviewId_studentId_roundName: {
          interviewId,
          studentId,
          roundName,
        },
      },
      update: {
        marks: marks !== undefined && marks !== null ? parseFloat(marks) : undefined,
        remarks: remarks !== undefined ? remarks.trim() : undefined,
        status: status || undefined,
        evaluatedBy: userId,
        evaluatedAt: new Date(),
      },
      create: {
        interviewId,
        studentId,
        roundName,
        marks: marks !== undefined && marks !== null ? parseFloat(marks) : null,
        remarks: remarks ? remarks.trim() : null,
        status: status || 'PENDING',
        evaluatedBy: userId,
      },
    });

    // Update interview statistics for CURRENT ROUND only
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    // Get all evaluations for current round
    const currentRoundEvaluations = await prisma.interviewEvaluation.findMany({
      where: { 
        interviewId, 
        roundName, // Current round only
      },
    });

    // Calculate statistics for current round
    const doneCount = currentRoundEvaluations.filter((e) => 
      e.status && e.status !== 'PENDING' && (e.marks !== null || e.remarks)
    ).length;
    
    const selectedCount = currentRoundEvaluations.filter((e) => e.status === 'SELECTED').length;
    const onHoldCount = currentRoundEvaluations.filter((e) => e.status === 'ON_HOLD').length;

    // Update interview statistics
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        doneCandidates: doneCount,
        selectedCandidates: selectedCount,
        onHoldCandidates: onHoldCount,
        pendingCandidates: interview.totalCandidates - doneCount,
      },
    });

    // Log activity with metadata
    await prisma.interviewActivity.create({
      data: {
        interviewId,
        studentId,
        roundName,
        activityType: 'EVALUATION',
        message: `Candidate ${status || 'evaluated'} in ${roundName}`,
        metadata: JSON.stringify({ 
          studentId, 
          roundName, 
          status: status || 'PENDING',
          marks: marks !== undefined ? parseFloat(marks) : null,
        }),
        performedBy: userId,
      },
    });

    // Get updated statistics
    const updatedInterview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        doneCandidates: true,
        selectedCandidates: true,
        onHoldCandidates: true,
        pendingCandidates: true,
      },
    });

    res.json({
      message: 'Evaluation saved successfully',
      evaluation,
      stats: updatedInterview,
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

    // Update current round status - mark any ongoing round as completed
    let rounds = JSON.parse(interview.rounds || '[]');
    rounds = rounds.map((r) => ({
      ...r,
      status: r.status === 'ongoing' ? 'completed' : r.status,
    }));

    // Update interview status
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'COMPLETED',
        currentRound: null, // Clear current round
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
        metadata: JSON.stringify({ 
          totalCandidates: interview.totalCandidates,
          selectedCandidates: interview.selectedCandidates,
          onHoldCandidates: interview.onHoldCandidates,
        }),
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




