/**
 * UTILITY FUNCTIONS
 * Helper functions for UI and data manipulation
 */

const Utils = {
  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  },

  /**
   * Format date with time
   */
  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status) {
    const statusMap = {
      'APPLIED': 'badge-gray',
      'RESUME_SHORTLISTED': 'badge-blue',
      'TEST_PASSED': 'badge-green',
      'REJECTED': 'badge-red',
      'INTERVIEW_ONGOING': 'badge-yellow',
      'REJECTED_IN_ROUND_1': 'badge-red',
      'REJECTED_IN_ROUND_2': 'badge-red',
      'REJECTED_IN_ROUND_3': 'badge-red',
      'SELECTED': 'badge-success'
    };
    return statusMap[status] || 'badge-gray';
  },

  /**
   * Get status display text
   */
  getStatusText(status) {
    const statusMap = {
      'APPLIED': 'Applied',
      'RESUME_SHORTLISTED': 'Resume Shortlisted',
      'TEST_PASSED': 'Test Passed',
      'REJECTED': 'Rejected',
      'INTERVIEW_ONGOING': 'Interview Ongoing',
      'REJECTED_IN_ROUND_1': 'Rejected in Round 1',
      'REJECTED_IN_ROUND_2': 'Rejected in Round 2',
      'REJECTED_IN_ROUND_3': 'Rejected in Round 3',
      'SELECTED': 'Selected'
    };
    return statusMap[status] || status;
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Confirm action
   */
  confirm(message) {
    return window.confirm(message);
  },

  /**
   * Get human-readable interview journey text
   */
  getInterviewJourneyText(studentId) {
    const app = State.applications.find(a => a.studentId === studentId);
    if (!app) return 'Unknown';

    const status = app.status;

    // Check if rejected in screening
    const rejected = State.screening.rejected.find(r => r.studentId === studentId);
    if (rejected) {
      return `Rejected in Resume Screening - ${rejected.reason || 'Not specified'}`;
    }

    // Check if test not passed
    if (!State.screening.testPassed.includes(studentId)) {
      if (State.screening.resumeShortlisted.includes(studentId)) {
        return 'Rejected in QA Test';
      }
      return 'Rejected in Resume Screening';
    }

    // Interview status
    if (State.interviewSession.status === 'ONGOING') {
      const activeRound = State.interviewSession.rounds.find(r => r.status === 'ACTIVE');
      if (activeRound) {
        const roundIndex = State.interviewSession.rounds.findIndex(r => r.id === activeRound.id);
        return `Interview Ongoing – ${activeRound.name}`;
      }
    }

    // Final status
    if (status === 'SELECTED') {
      const lastRound = State.interviewSession.rounds[State.interviewSession.rounds.length - 1];
      return `Selected after ${lastRound ? lastRound.name : 'Final Round'}`;
    }

    if (status.startsWith('REJECTED_IN_ROUND_')) {
      const roundNum = status.replace('REJECTED_IN_ROUND_', '');
      const round = State.interviewSession.rounds[parseInt(roundNum) - 1];
      return `Rejected in ${round ? round.name : `Round ${roundNum}`}`;
    }

    return Utils.getStatusText(status);
  }
};
