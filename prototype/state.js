/**
 * GLOBAL STATE ENGINE
 * Central state manager with business rule enforcement
 */

const State = {
  // Current state (initialized from MOCK_DATA)
  applications: [...MOCK_DATA.applications],
  screening: JSON.parse(JSON.stringify(MOCK_DATA.screening)),
  interviewSession: JSON.parse(JSON.stringify(MOCK_DATA.interviewSession)),
  roundEvaluations: JSON.parse(JSON.stringify(MOCK_DATA.roundEvaluations)),

  // Initialize state from localStorage if available
  init() {
    const saved = localStorage.getItem('interviewState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.applications = parsed.applications || this.applications;
        this.screening = parsed.screening || this.screening;
        this.interviewSession = parsed.interviewSession || this.interviewSession;
        this.roundEvaluations = parsed.roundEvaluations || this.roundEvaluations;
      } catch (e) {
        console.error('Failed to load state:', e);
      }
    }
    this.save();
  },

  // Save state to localStorage
  save() {
    localStorage.setItem('interviewState', JSON.stringify({
      applications: this.applications,
      screening: this.screening,
      interviewSession: this.interviewSession,
      roundEvaluations: this.roundEvaluations
    }));
  },

  // ========== SCREENING METHODS ==========

  /**
   * Update resume shortlist status
   */
  shortlistResume(studentId) {
    const app = this.applications.find(a => a.studentId === studentId);
    if (!app) return false;

    // Remove from rejected if present
    this.screening.rejected = this.screening.rejected.filter(r => r.studentId !== studentId);
    
    // Add to shortlisted if not present
    if (!this.screening.resumeShortlisted.includes(studentId)) {
      this.screening.resumeShortlisted.push(studentId);
      app.status = 'RESUME_SHORTLISTED';
    }
    
    this.save();
    return true;
  },

  /**
   * Mark test as passed
   */
  markTestPassed(studentId) {
    const app = this.applications.find(a => a.studentId === studentId);
    if (!app) return false;

    if (!this.screening.testPassed.includes(studentId)) {
      this.screening.testPassed.push(studentId);
      app.status = 'TEST_PASSED';
    }
    
    this.save();
    return true;
  },

  /**
   * Reject candidate during screening
   */
  rejectInScreening(studentId, reason) {
    const app = this.applications.find(a => a.studentId === studentId);
    if (!app) return false;

    // Remove from other screening lists
    this.screening.resumeShortlisted = this.screening.resumeShortlisted.filter(id => id !== studentId);
    this.screening.testPassed = this.screening.testPassed.filter(id => id !== studentId);
    
    // Add to rejected
    if (!this.screening.rejected.find(r => r.studentId === studentId)) {
      this.screening.rejected.push({ studentId, reason });
      app.status = 'REJECTED';
    }
    
    this.save();
    return true;
  },

  // ========== INTERVIEW SESSION METHODS ==========

  /**
   * Check if screening is complete
   * Screening is complete when all non-rejected candidates have passed test
   */
  isScreeningComplete() {
    const totalApplied = this.applications.length;
    const totalRejected = this.screening.rejected.length;
    const totalTestPassed = this.screening.testPassed.length;
    
    // All non-rejected candidates must have passed test
    return (totalRejected + totalTestPassed) === totalApplied;
  },

  /**
   * Create interview session with rounds
   */
  createInterviewSession(rounds) {
    if (!this.isScreeningComplete()) {
      return { success: false, message: 'Screening must be completed before creating interview session' };
    }

    if (this.interviewSession.status === 'ONGOING') {
      return { success: false, message: 'Interview session is already ongoing' };
    }

    this.interviewSession = {
      id: 'session-' + Date.now(),
      jobId: MOCK_DATA.job.id,
      status: 'NOT_STARTED',
      rounds: rounds.map((name, index) => ({
        id: 'round-' + (index + 1),
        name: name,
        status: 'PENDING', // PENDING, ACTIVE, COMPLETED
        startedAt: null,
        endedAt: null
      })),
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null
    };

    // Initialize round evaluations
    rounds.forEach((_, index) => {
      const roundId = 'round-' + (index + 1);
      this.roundEvaluations[roundId] = {};
    });

    this.save();
    return { success: true, session: this.interviewSession };
  },

  /**
   * Start a round
   */
  startRound(roundId) {
    const round = this.interviewSession.rounds.find(r => r.id === roundId);
    if (!round) {
      return { success: false, message: 'Round not found' };
    }

    // Check if previous round is completed
    const roundIndex = this.interviewSession.rounds.findIndex(r => r.id === roundId);
    if (roundIndex > 0) {
      const prevRound = this.interviewSession.rounds[roundIndex - 1];
      if (prevRound.status !== 'COMPLETED') {
        return { success: false, message: 'Previous round must be completed first' };
      }
    }

    if (round.status === 'COMPLETED') {
      return { success: false, message: 'Round is already completed' };
    }

    round.status = 'ACTIVE';
    round.startedAt = new Date().toISOString();
    
    if (this.interviewSession.status === 'NOT_STARTED') {
      this.interviewSession.status = 'ONGOING';
      this.interviewSession.startedAt = new Date().toISOString();
    }

    this.save();
    return { success: true, round };
  },

  /**
   * End a round
   */
  endRound(roundId) {
    const round = this.interviewSession.rounds.find(r => r.id === roundId);
    if (!round) {
      return { success: false, message: 'Round not found' };
    }

    if (round.status !== 'ACTIVE') {
      return { success: false, message: 'Round is not active' };
    }

    round.status = 'COMPLETED';
    round.endedAt = new Date().toISOString();

    this.save();
    return { success: true, round };
  },

  /**
   * End entire interview session
   */
  endSession() {
    const activeRound = this.interviewSession.rounds.find(r => r.status === 'ACTIVE');
    if (activeRound) {
      return { success: false, message: 'Active round must be ended first' };
    }

    const allCompleted = this.interviewSession.rounds.every(r => r.status === 'COMPLETED');
    if (!allCompleted) {
      return { success: false, message: 'All rounds must be completed' };
    }

    this.interviewSession.status = 'COMPLETED';
    this.interviewSession.endedAt = new Date().toISOString();

    // Update final application statuses
    this.updateFinalApplicationStatuses();

    this.save();
    return { success: true };
  },

  /**
   * Get candidates for a specific round
   */
  getCandidatesForRound(roundId) {
    if (!this.interviewSession.rounds.length) {
      return [];
    }

    const roundIndex = this.interviewSession.rounds.findIndex(r => r.id === roundId);
    
    if (roundIndex === 0) {
      // First round: all test-passed candidates
      return this.screening.testPassed;
    } else {
      // Subsequent rounds: only candidates selected in previous round
      const prevRoundId = this.interviewSession.rounds[roundIndex - 1].id;
      const prevEvaluations = this.roundEvaluations[prevRoundId] || {};
      
      return Object.keys(prevEvaluations)
        .filter(studentId => prevEvaluations[studentId].status === 'SELECTED')
        .map(id => id);
    }
  },

  /**
   * Update round evaluation for a candidate
   */
  updateRoundEvaluation(roundId, studentId, status, remarks = '') {
    if (!this.roundEvaluations[roundId]) {
      this.roundEvaluations[roundId] = {};
    }

    this.roundEvaluations[roundId][studentId] = {
      status: status, // SELECTED, REJECTED, ON_HOLD
      remarks: remarks,
      evaluatedAt: new Date().toISOString()
    };

    this.save();
    return true;
  },

  /**
   * Update final application statuses after session ends
   */
  updateFinalApplicationStatuses() {
    const lastRound = this.interviewSession.rounds[this.interviewSession.rounds.length - 1];
    const lastRoundEvaluations = this.roundEvaluations[lastRound.id] || {};

    Object.keys(lastRoundEvaluations).forEach(studentId => {
      const app = this.applications.find(a => a.studentId === studentId);
      if (!app) return;

      const evaluation = lastRoundEvaluations[studentId];
      if (evaluation.status === 'SELECTED') {
        app.status = 'SELECTED';
      } else {
        app.status = `REJECTED_IN_ROUND_${this.interviewSession.rounds.length}`;
      }
    });
  },

  /**
   * Get application status for student view
   */
  getStudentApplicationStatus(studentId) {
    const app = this.applications.find(a => a.studentId === studentId);
    if (!app) return null;

    const status = app.status;

    // If interview is ongoing, show current round
    if (this.interviewSession.status === 'ONGOING') {
      const activeRound = this.interviewSession.rounds.find(r => r.status === 'ACTIVE');
      if (activeRound) {
        const roundIndex = this.interviewSession.rounds.findIndex(r => r.id === activeRound.id);
        return {
          status: 'INTERVIEW_ONGOING',
          currentRound: activeRound.name,
          roundNumber: roundIndex + 1
        };
      }
    }

    // Return final status
    return { status };
  }
};

// Initialize state on load
State.init();
